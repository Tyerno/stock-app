const Vente    = require('../models/Vente');
const Produit  = require('../models/Produit');
const Mouvement = require('../models/Mouvement');

// GET /api/ventes
exports.lister = async (req, res) => {
  try {
    const { search, statut, dateDebut, dateFin, page = 1, limit = 30 } = req.query;
    const filtre = { entreprise: req.entrepriseId };

    if (search) filtre.$or = [
      { numero: { $regex: search, $options: 'i' } },
      { 'client.nom': { $regex: search, $options: 'i' } },
    ];
    if (statut) filtre.statut = statut;
    if (dateDebut || dateFin) {
      filtre.createdAt = {};
      if (dateDebut) filtre.createdAt.$gte = new Date(dateDebut);
      if (dateFin)   filtre.createdAt.$lte = new Date(dateFin + 'T23:59:59');
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Vente.countDocuments(filtre);
    const data  = await Vente.find(filtre)
      .populate('creePar', 'nom')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/ventes/:id
exports.obtenir = async (req, res) => {
  try {
    const vente = await Vente.findOne({ _id: req.params.id, entreprise: req.entrepriseId })
      .populate('lignes.produit', 'nom reference unite')
      .populate('creePar', 'nom');
    if (!vente)
      return res.status(404).json({ success: false, message: 'Vente introuvable' });
    res.json({ success: true, data: vente });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ventes
exports.creer = async (req, res) => {
  try {
    const { client, lignes, remise = 0, remiseType = 'percent', modePaiement, notes } = req.body;
    if (!lignes?.length)
      return res.status(400).json({ success: false, message: 'Aucune ligne de vente' });

    let sousTotal = 0;
    const lignesTraitees = [];

    for (const ligne of lignes) {
      const produit = await Produit.findOne({ _id: ligne.produit, entreprise: req.entrepriseId });
      if (!produit)
        return res.status(404).json({ success: false, message: `Produit introuvable` });
      if (produit.quantiteStock < ligne.quantite)
        return res.status(400).json({ success: false, message: `Stock insuffisant pour "${produit.nom}" (dispo: ${produit.quantiteStock})` });

      const total = ligne.quantite * ligne.prixUnitaire;
      sousTotal  += total;
      lignesTraitees.push({
        produit: produit._id,
        nomProduit: produit.nom,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        total,
      });
    }

    const montantRemise = remiseType === 'percent'
      ? sousTotal * remise / 100
      : remise;
    const totalNet = sousTotal - montantRemise;

    const vente = await Vente.create({
      entreprise: req.entrepriseId,
      client, lignes: lignesTraitees,
      sousTotal, remise, remiseType, totalNet,
      modePaiement, notes, creePar: req.user._id,
    });

    // Déduire stock + créer mouvements
    for (const ligne of lignesTraitees) {
      const produit = await Produit.findById(ligne.produit);
      const avant   = produit.quantiteStock;
      produit.quantiteStock -= ligne.quantite;
      await produit.save();
      await Mouvement.create({
        entreprise: req.entrepriseId,
        produit: produit._id, type: 'sortie',
        quantite: ligne.quantite,
        quantiteAvant: avant, quantiteApres: produit.quantiteStock,
        motif: 'Vente', reference: vente.numero,
        vente: vente._id, creePar: req.user._id,
      });
    }

    res.status(201).json({ success: true, data: vente });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/ventes/:id/annuler
exports.annuler = async (req, res) => {
  try {
    const vente = await Vente.findOne({ _id: req.params.id, entreprise: req.entrepriseId });
    if (!vente)
      return res.status(404).json({ success: false, message: 'Vente introuvable' });
    if (vente.statut === 'annulee')
      return res.status(400).json({ success: false, message: 'Vente déjà annulée' });

    for (const ligne of vente.lignes) {
      const produit = await Produit.findById(ligne.produit);
      if (produit) {
        const avant = produit.quantiteStock;
        produit.quantiteStock += ligne.quantite;
        await produit.save();
        await Mouvement.create({
          entreprise: req.entrepriseId,
          produit: produit._id, type: 'entree',
          quantite: ligne.quantite,
          quantiteAvant: avant, quantiteApres: produit.quantiteStock,
          motif: `Annulation ${vente.numero}`,
          vente: vente._id, creePar: req.user._id,
        });
      }
    }

    vente.statut = 'annulee';
    await vente.save();
    res.json({ success: true, data: vente });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
