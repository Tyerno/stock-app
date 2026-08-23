const Dette = require('../models/Dette');

exports.getDettes = async (req, res) => {
  try {
    const { page=1, limit=50, statut, search } = req.query;
    const filtre = {};
    if (statut) filtre.statut = statut;
    if (search) filtre['client.nom'] = { $regex: search, $options: 'i' };
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
    const { client, montantInitial, vente } = req.body;
    const dette = new Dette({ client, montantInitial, vente: vente || undefined });
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
