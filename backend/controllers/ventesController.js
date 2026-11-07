const Vente     = require('../models/Vente');
const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');
const Retour    = require('../models/Retour');
const email     = require('../services/emailService');

const mongoose = require('mongoose');

// ─── Sécurité des ventes ──────────────────────────────────────────────────────
// Le stock est réservé ligne par ligne par une mise à jour ATOMIQUE conditionnelle
// (« décrémente seulement s'il en reste assez ») : deux ventes simultanées ne peuvent plus
// vendre le même stock. Si une étape échoue ensuite, le stock déjà réservé est remis.
const nombre = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN);

async function reserverStock(produitId, quantite) {
  // renvoie le produit AVANT décrémentation, ou null si stock insuffisant / produit absent
  return Produit.findOneAndUpdate(
    { _id: produitId, quantiteStock: { $gte: quantite } },
    { $inc: { quantiteStock: -quantite } },
    { new: false }
  ).select('nom unite quantiteStock prixMin');
}

async function restituerStock(reserves) {
  for (const r of reserves) {
    try { await Produit.updateOne({ _id: r.produit }, { $inc: { quantiteStock: r.quantite } }); }
    catch (e) { console.error('⚠️ Restitution de stock impossible', String(r.produit), e.message); }
  }
}

async function creerVenteAvecNumero(donnees) {
  // Le numéro est calculé à l'enregistrement : en cas de collision (ventes simultanées), on réessaie.
  for (let essai = 1; ; essai++) {
    try { return await Vente.create(donnees); }
    catch (e) {
      const collision = e?.code === 11000 && /numero/.test(JSON.stringify(e.keyPattern || e.message || ''));
      if (!collision || essai >= 5) throw e;
    }
  }
}

exports.creerVente = async (req, res) => {
  const reserves = []; // { produit, quantite, avant, nom, unite }
  try {
    const { client, lignes, remise = 0, modePaiement, montantRecu, notes, horodatage } = req.body;
    if (!Array.isArray(lignes) || lignes.length === 0)
      return res.status(400).json({ success:false, message:'La vente doit contenir au moins un produit' });
    if (lignes.length > 100)
      return res.status(400).json({ success:false, message:'Trop de lignes dans une même vente (maximum 100)' });

    // Vente faite hors connexion : on garde l'heure réelle de la vente (pas celle de l'envoi), dans des bornes raisonnables.
    let dateVente;
    if (horodatage) {
      const d = new Date(horodatage);
      const now = Date.now();
      if (isNaN(d) || d.getTime() > now + 5 * 60 * 1000 || d.getTime() < now - 7 * 24 * 3600 * 1000) throw new Error("Date de la vente invalide (au plus 7 jours en arrière)");
      dateVente = d;
    }

    // 1. Validation des lignes
    const propres = lignes.map((l) => ({
      produitId: String(l?.produitId || ''),
      quantite: nombre(l?.quantite),
      prixUnitaire: nombre(l?.prixUnitaire),
    }));
    for (const l of propres) {
      if (!mongoose.isValidObjectId(l.produitId)) throw new Error('Produit introuvable');
      if (!Number.isFinite(l.quantite) || l.quantite <= 0) throw new Error('Quantité invalide');
      if (!Number.isFinite(l.prixUnitaire) || l.prixUnitaire < 0) throw new Error('Prix unitaire invalide');
    }
    const remiseNum = remise === '' || remise == null ? 0 : nombre(remise);
    if (!Number.isFinite(remiseNum) || remiseNum < 0) throw new Error('Remise invalide');

    // 2. Réservation atomique du stock
    const lignesFinales = [];
    let totalHT = 0;
    for (const l of propres) {
      const avant = await reserverStock(l.produitId, l.quantite);
      if (!avant) {
        const p = await Produit.findById(l.produitId).select('nom unite quantiteStock');
        if (!p) throw new Error('Produit introuvable');
        throw new Error(`Stock insuffisant pour "${p.nom}" (dispo : ${p.quantiteStock} ${p.unite})`);
      }
      reserves.push({ produit: avant._id, quantite: l.quantite, avant: avant.quantiteStock, nom: avant.nom, unite: avant.unite, prixMin: avant.prixMin || 0 });
      const sousTotal = l.quantite * l.prixUnitaire;
      totalHT += sousTotal;
      lignesFinales.push({ produit: avant._id, nomProduit: avant.nom, unite: avant.unite, quantite: l.quantite, prixUnitaire: l.prixUnitaire, sousTotal });
    }

    const totalNet = Math.max(0, totalHT - remiseNum);

    // Prix plancher : le prix réellement payé (remise globale comprise) ne doit pas passer sous le minimum du produit.
    // Le gestionnaire est bloqué ; l'administrateur peut vendre plus bas, et la vente est alors signalée dans le journal.
    const ratio = totalHT > 0 ? totalNet / totalHT : 1;
    const sousPlancher = lignesFinales
      .map((l, i) => ({ nom: l.nomProduit, prix: Math.round(l.prixUnitaire * ratio), min: reserves[i].prixMin }))
      .filter((x) => x.min > 0 && x.prix < x.min);
    if (sousPlancher.length && req.user.role !== 'admin') {
      const f = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/[\u202f\u00a0]/g, ' ');
      throw new Error(`Prix trop bas : ${sousPlancher.map((x) => `« ${x.nom} » à ${f(x.prix)} GNF (minimum ${f(x.min)})`).join(', ')}. Demandez à l'administrateur.`);
    }
    const monnaie  = montantRecu ? Math.max(0, Number(montantRecu) - totalNet) : 0;

    // 3. Enregistrement de la vente (si cela échoue, le stock réservé est remis dans le catch)
    const vente = await creerVenteAvecNumero({
      client, lignes: lignesFinales, totalHT,
      remise: remiseNum, totalNet, modePaiement,
      montantRecu: Number(montantRecu) || 0, monnaie, notes,
      vendeur: req.user._id,
      ...(dateVente ? { createdAt: dateVente } : {}),
    });

    // 4. Historique des mouvements : la vente est déjà valide, une erreur ici est seulement journalisée
    //    dans la console (le stock, lui, est déjà correct).
    // reserves[i] correspond à lignesFinales[i] : « avant » reflète le stock réel au moment de chaque réservation.
    for (let i = 0; i < lignesFinales.length; i++) {
      const l = lignesFinales[i];
      const avant = reserves[i].avant;
      try {
        await Mouvement.create({
          produit: l.produit, type: 'sortie', quantite: l.quantite,
          quantiteAvant: avant, quantiteApres: avant - l.quantite,
          prixUnitaire: l.prixUnitaire, motif: `Vente ${vente.numero}`,
          reference: vente.numero, client: client?.nom, utilisateur: req.user._id,
          ...(dateVente ? { createdAt: dateVente } : {}),
        });
      } catch (e) {
        console.error(`⚠️ Mouvement non enregistré pour la vente ${vente.numero} :`, e.message);
      }
    }

    await vente.populate('vendeur','nom');

    // ─── Email alerte vente importante (en arrière-plan) ─────────────────────
    email.envoyerAlerteVente(vente).catch(err =>
      console.error('Email vente importante :', err.message)
    );

    // ─── Email alerte stock si rupture après vente ────────────────────────────
    const produitsEnAlerte = await Produit.find({
      actif: true,
      _id: { $in: lignesFinales.map(l => l.produit) },
      $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] },
    }).select('nom unite quantiteStock seuilAlerte');

    if (produitsEnAlerte.length > 0) {
      email.envoyerAlerteStock(produitsEnAlerte).catch(err =>
        console.error('Email alerte stock :', err.message)
      );
    }

    res.status(201).json({ success:true, data:vente, message:`Vente ${vente.numero} enregistrée`, sousPlancher: sousPlancher.map((x) => x.nom) });
  } catch (err) {
    await restituerStock(reserves);
    res.status(400).json({ success:false, message:err.message });
  }
};

exports.getVentes = async (req, res) => {
  try {
    const { page=1, limit=20, dateDebut, dateFin } = req.query;
    const filtre = { statut:'validee' };
    if (dateDebut || dateFin) {
      filtre.createdAt = {};
      if (dateDebut) filtre.createdAt.$gte = new Date(dateDebut);
      if (dateFin)   filtre.createdAt.$lte = new Date(dateFin+'T23:59:59');
    }
    const skip = (Number(page)-1)*Number(limit);
    const [ventes, total] = await Promise.all([
      Vente.find(filtre).populate('vendeur','nom').sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      Vente.countDocuments(filtre),
    ]);
    res.json({ success:true, data:ventes, pagination:{ total, page:Number(page), pages:Math.ceil(total/Number(limit)) } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.getVente = async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id).populate('vendeur','nom');
    if (!vente) return res.status(404).json({ success:false, message:'Vente introuvable' });
    res.json({ success:true, data:vente });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.annulerVente = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new Error('Vente introuvable');
    // Des articles ont déjà été repris : annuler la vente remettrait leur stock une seconde fois.
    if (await Retour.exists({ vente: req.params.id })) throw new Error('Cette vente a déjà un retour ou un échange enregistré : elle ne peut plus être annulée');
    // Prise de possession atomique : une seule requête peut annuler la vente (pas de double remise en stock).
    const vente = await Vente.findOneAndUpdate(
      { _id: req.params.id, statut: 'validee' },
      { $set: { statut: 'annulee' } },
      { new: true }
    );
    if (!vente) {
      const existe = await Vente.exists({ _id: req.params.id });
      throw new Error(existe ? 'Vente déjà annulée' : 'Vente introuvable');
    }
    for (const l of vente.lignes) {
      try {
        const avant = await Produit.findOneAndUpdate(
          { _id: l.produit }, { $inc: { quantiteStock: l.quantite } }, { new: false }
        ).select('quantiteStock');
        if (avant) {
          await Mouvement.create({
            produit:l.produit, type:'retour', quantite:l.quantite,
            quantiteAvant:avant.quantiteStock, quantiteApres:avant.quantiteStock + l.quantite,
            motif:`Annulation ${vente.numero}`, reference:vente.numero, utilisateur:req.user._id,
          });
        }
      } catch (e) {
        console.error(`⚠️ Remise en stock incomplète (annulation ${vente.numero}, produit ${l.produit}) :`, e.message);
      }
    }
    res.json({ success:true, message:`Vente ${vente.numero} annulée` });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};

exports.getStatsVentes = async (req, res) => {
  try {
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const debut30j  = new Date(Date.now() - 30*24*60*60*1000);
    const [statsMois, graphe, topProduits] = await Promise.all([
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debutMois } } }, { $group:{ _id:null, ca:{ $sum:'$totalNet' }, nb:{ $sum:1 }, panier:{ $avg:'$totalNet' } } }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut30j } } }, { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, ca:{ $sum:'$totalNet' }, nb:{ $sum:1 } } }, { $sort:{ _id:1 } }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut30j } } }, { $unwind:'$lignes' }, { $group:{ _id:'$lignes.nomProduit', qte:{ $sum:'$lignes.quantite' }, ca:{ $sum:'$lignes.sousTotal' } } }, { $sort:{ ca:-1 } }, { $limit:5 }]),
    ]);
    res.json({ success:true, data:{ statsMois:statsMois[0]||{ ca:0, nb:0, panier:0 }, graphe, topProduits } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};
