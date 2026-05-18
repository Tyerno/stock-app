const Vente     = require('../models/Vente');
const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');
const email     = require('../services/emailService');

exports.creerVente = async (req, res) => {
  try {
    const { client, lignes, remise=0, modePaiement, montantRecu, notes } = req.body;
    if (!lignes || lignes.length === 0)
      return res.status(400).json({ success:false, message:'La vente doit contenir au moins un produit' });

    const lignesFinales = [];
    let totalHT = 0;

    for (const l of lignes) {
      const produit = await Produit.findById(l.produitId);
      if (!produit) throw new Error(`Produit introuvable`);
      if (produit.quantiteStock < l.quantite)
        throw new Error(`Stock insuffisant pour "${produit.nom}" (dispo : ${produit.quantiteStock} ${produit.unite})`);
      const sousTotal = l.quantite * l.prixUnitaire;
      totalHT += sousTotal;
      lignesFinales.push({ produit:produit._id, nomProduit:produit.nom, unite:produit.unite, quantite:l.quantite, prixUnitaire:l.prixUnitaire, sousTotal });
    }

    const totalNet = Math.max(0, totalHT - (Number(remise) || 0));
    const monnaie  = montantRecu ? Math.max(0, Number(montantRecu) - totalNet) : 0;

    const vente = await Vente.create({
      client, lignes:lignesFinales, totalHT,
      remise:Number(remise)||0, totalNet, modePaiement,
      montantRecu:Number(montantRecu)||0, monnaie, notes,
      vendeur:req.user._id,
    });

    // Déduire le stock + mouvements
    for (const l of lignesFinales) {
      const produit = await Produit.findById(l.produit);
      const qAvant  = produit.quantiteStock;
      produit.quantiteStock -= l.quantite;
      await produit.save();
      await Mouvement.create({
        produit:l.produit, type:'sortie', quantite:l.quantite,
        quantiteAvant:qAvant, quantiteApres:produit.quantiteStock,
        prixUnitaire:l.prixUnitaire, motif:`Vente ${vente.numero}`,
        reference:vente.numero, client:client?.nom, utilisateur:req.user._id,
      });
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

    res.status(201).json({ success:true, data:vente, message:`Vente ${vente.numero} enregistrée` });
  } catch (err) {
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
    const vente = await Vente.findById(req.params.id);
    if (!vente) throw new Error('Vente introuvable');
    if (vente.statut === 'annulee') throw new Error('Vente déjà annulée');
    for (const l of vente.lignes) {
      const produit = await Produit.findById(l.produit);
      if (produit) {
        const qAvant = produit.quantiteStock;
        produit.quantiteStock += l.quantite;
        await produit.save();
        await Mouvement.create({
          produit:l.produit, type:'retour', quantite:l.quantite,
          quantiteAvant:qAvant, quantiteApres:produit.quantiteStock,
          motif:`Annulation ${vente.numero}`, reference:vente.numero, utilisateur:req.user._id,
        });
      }
    }
    vente.statut = 'annulee';
    await vente.save();
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
