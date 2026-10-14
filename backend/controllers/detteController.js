const Dette = require('../models/Dette');

// Convertit une valeur reçue (AAAA-MM-JJ ou ISO) en Date valide, ou renvoie null si invalide.
const lireDate = (valeur) => {
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
};

exports.getDettes = async (req, res) => {
  try {
    const { page=1, limit=50, statut, search, enRetard } = req.query;
    const filtre = {};
    if (statut) filtre.statut = statut;
    if (search) filtre['client.nom'] = { $regex: search, $options: 'i' };
    if (enRetard === 'true') {
      filtre.statut = 'EN_COURS';
      filtre.dateEcheance = { $lt: Dette.debutJournee() };
    }
    const skip = (Number(page)-1)*Number(limit);
    const [dettes, total] = await Promise.all([
      Dette.find(filtre).populate('vente', 'numero totalNet').sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      Dette.countDocuments(filtre),
    ]);
    res.json({ success:true, data:dettes, pagination:{ total, page:Number(page), pages:Math.ceil(total/Number(limit)), limit:Number(limit) } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.getDette = async (req, res) => {
  try {
    const dette = await Dette.findById(req.params.id).populate('vente', 'numero totalNet');
    if (!dette) return res.status(404).json({ success:false, message:'Dette introuvable' });
    res.json({ success:true, data:dette });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.creerDette = async (req, res) => {
  try {
    const { client, montantInitial, vente, dateEcheance } = req.body;

    let echeance;
    if (dateEcheance) {
      echeance = lireDate(dateEcheance);
      if (!echeance) return res.status(400).json({ success:false, message:"Date d'échéance invalide" });
      if (echeance < Dette.debutJournee()) {
        return res.status(400).json({ success:false, message:"La date d'échéance ne peut pas être dans le passé" });
      }
    }

    const dette = new Dette({ client, montantInitial, vente: vente || undefined, dateEcheance: echeance });
    await dette.save(); // déclenche pre('validate') : montantRestant = montantInitial, statut = EN_COURS
    res.status(201).json({ success:true, data:dette, message:'Dette enregistrée' });
  } catch (err) {
    res.status(400).json({ success:false, message: err.message });
  }
};

exports.ajouterPaiement = async (req, res) => {
  try {
    const { montant, note } = req.body;
    const dette = await Dette.findById(req.params.id);
    if (!dette) return res.status(404).json({ success:false, message:'Dette introuvable' });
    if (dette.statut === 'PAYEE') {
      return res.status(400).json({ success:false, message:'Cette dette est déjà soldée' });
    }

    dette.paiements.push({ montant, note });
    await dette.save(); // déclenche pre('validate') : recalcule montantRestant et statut

    res.json({ success:true, data:dette, message:'Paiement enregistré' });
  } catch (err) {
    // Couvre notamment le rejet du hook si le total des paiements dépasse montantInitial
    res.status(400).json({ success:false, message: err.message });
  }
};

// Modifier (ou retirer, avec null/vide) la date d'échéance d'une dette non soldée.
exports.modifierEcheance = async (req, res) => {
  try {
    const { dateEcheance } = req.body;
    const dette = await Dette.findById(req.params.id);
    if (!dette) return res.status(404).json({ success:false, message:'Dette introuvable' });
    if (dette.statut === 'PAYEE') {
      return res.status(400).json({ success:false, message:'Cette dette est déjà soldée' });
    }

    if (!dateEcheance) {
      dette.dateEcheance = undefined; // retrait de l'échéance
    } else {
      const echeance = lireDate(dateEcheance);
      if (!echeance) return res.status(400).json({ success:false, message:"Date d'échéance invalide" });
      dette.dateEcheance = echeance; // le passé est autorisé ici (régularisation d'une dette déjà en retard)
    }

    await dette.save();
    res.json({ success:true, data:dette, message:"Échéance mise à jour" });
  } catch (err) {
    res.status(400).json({ success:false, message: err.message });
  }
};

// Résumé pour le Dashboard : totaux calculés sur TOUTES les dettes en cours (pas seulement la 1re page).
exports.getResume = async (req, res) => {
  try {
    const debut = Dette.debutJournee();
    const estEnRetard = { $and: [{ $gt: ['$dateEcheance', null] }, { $lt: ['$dateEcheance', debut] }] };
    const champs = 'client montantRestant dateEcheance createdAt';

    const [agg, enRetard, recentes] = await Promise.all([
      Dette.aggregate([
        { $match: { statut: 'EN_COURS' } },
        { $group: {
            _id: null,
            totalDu:       { $sum: '$montantRestant' },
            nbEnCours:     { $sum: 1 },
            nbRetard:      { $sum: { $cond: [estEnRetard, 1, 0] } },
            montantRetard: { $sum: { $cond: [estEnRetard, '$montantRestant', 0] } },
        } },
      ]),
      Dette.find({ statut: 'EN_COURS', dateEcheance: { $lt: debut } }).sort({ dateEcheance: 1 }).limit(5).select(champs).lean(),
      Dette.find({ statut: 'EN_COURS' }).sort({ createdAt: -1 }).limit(5).select(champs).lean(),
    ]);

    const t = agg[0] || {};
    res.json({ success: true, data: {
      totalDu:       t.totalDu       || 0,
      nbEnCours:     t.nbEnCours     || 0,
      nbRetard:      t.nbRetard      || 0,
      montantRetard: t.montantRetard || 0,
      dettesEnRetard: enRetard,
      dettesRecentes: recentes,
    } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};
