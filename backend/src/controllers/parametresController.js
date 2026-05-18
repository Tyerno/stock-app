const Parametre  = require('../models/Parametre');
const Entreprise = require('../models/Entreprise');

// GET /api/parametres
exports.obtenir = async (req, res) => {
  try {
    let params = await Parametre.findOne({ entreprise: req.entrepriseId });
    if (!params) {
      // Créer les paramètres par défaut depuis les infos de l'entreprise
      const ent = await Entreprise.findById(req.entrepriseId);
      params = await Parametre.create({
        entreprise: req.entrepriseId,
        boutique: {
          nom:    ent?.nom || '',
          devise: ent?.parametres?.devise || 'GNF',
          couleur: ent?.parametres?.couleur || '#6366f1',
        },
      });
    }
    res.json({ success: true, data: params });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/parametres
exports.modifier = async (req, res) => {
  try {
    let params = await Parametre.findOne({ entreprise: req.entrepriseId });
    if (!params) {
      params = new Parametre({ entreprise: req.entrepriseId });
    }

    if (req.body.boutique) {
      Object.assign(params.boutique, req.body.boutique);
      params.markModified('boutique');
    }
    if (req.body.stock) {
      Object.assign(params.stock, req.body.stock);
      params.markModified('stock');
    }
    if (req.body.notifications) {
      Object.assign(params.notifications, req.body.notifications);
      params.markModified('notifications');
    }

    await params.save();

    // Mettre à jour aussi l'entreprise (devise, couleur)
    if (req.body.boutique) {
      await Entreprise.findByIdAndUpdate(req.entrepriseId, {
        'parametres.devise':  req.body.boutique.devise  || undefined,
        'parametres.couleur': req.body.boutique.couleur || undefined,
        nom:                  req.body.boutique.nom     || undefined,
      });
    }

    res.json({ success: true, data: params });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
