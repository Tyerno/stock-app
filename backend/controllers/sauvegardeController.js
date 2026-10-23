const mongoose = require('mongoose');
const { tracer } = require('../utils/journal');

// Collections sauvegardées (nom du fichier → modèle). Tout ce qui fait vivre la boutique.
const MODELES = () => ({
  produits:    require('../models/Produit'),
  categories:  require('../models').Categorie,
  ventes:      require('../models/Vente'),
  mouvements:  require('../models/Mouvement'),
  dettes:      require('../models/Dette'),
  boutique:    require('../models/Boutique'),
  utilisateurs: require('../models').User,
  journal:     require('../models/Journal'),
});

const { EJSON } = mongoose.mongo.BSON;

// GET /api/sauvegarde/resume : nombre d'éléments par collection (affiché avant le téléchargement)
exports.resume = async (req, res) => {
  try {
    const m = MODELES();
    const entrees = await Promise.all(Object.entries(m).map(async ([nom, M]) => [nom, await M.countDocuments()]));
    res.json({ success: true, data: Object.fromEntries(entrees) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Impossible de lire la base' });
  }
};

// GET /api/sauvegarde : copie complète de la base, au format EJSON (identifiants et dates conservés tels quels)
exports.telecharger = async (req, res) => {
  try {
    const m = MODELES();
    const collections = {};
    for (const [nom, M] of Object.entries(m)) {
      let q = M.find({}).lean();
      if (nom === 'utilisateurs') {
        // Les mots de passe restent chiffrés (bcrypt) pour pouvoir restaurer les comptes ; les jetons de réinitialisation ne sont jamais sauvegardés.
        q = q.select('+motDePasse -resetTokenHash -resetTokenExpire');
      }
      collections[nom] = await q;
    }
    const total = Object.values(collections).reduce((s, c) => s + c.length, 0);
    const contenu = EJSON.stringify({
      application: 'StockBTP',
      version: 1,
      date: new Date().toISOString(),
      par: req.user.email,
      total,
      collections,
    }, { relaxed: true });

    const nom = `stockbtp-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    console.log(`💾 Sauvegarde téléchargée par ${req.user.email} (${total} éléments)`);
    tracer({ req, action: 'sauvegarde', entite: 'systeme', libelle: `Sauvegarde complète téléchargée (${total} éléments)` });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(contenu);
  } catch (err) {
    console.error('❌ Sauvegarde :', err.message);
    res.status(500).json({ success: false, message: 'Sauvegarde impossible pour le moment' });
  }
};
