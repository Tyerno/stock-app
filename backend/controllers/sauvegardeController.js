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
  bonsCommande: require('../models/BonCommande'),
  inventaires: require('../models/Inventaire'),
  depenses:    require('../models/Depense'),
  clotures:    require('../models/Cloture'),
  retours:     require('../models/Retour'),
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

// POST /api/sauvegarde/remise-a-zero : vide les données de la boutique (démo → mise en service réelle).
// Conserve les comptes utilisateurs. Réservé à l'admin ; exige son mot de passe et la phrase de confirmation.
exports.remiseAZero = async (req, res) => {
  try {
    const { confirmation, motDePasse, boutique = true } = req.body || {};
    if (confirmation !== 'REMETTRE A ZERO') {
      return res.status(400).json({ success: false, message: 'Phrase de confirmation incorrecte.' });
    }
    const { User } = require('../models');
    const admin = await User.findById(req.user._id).select('+motDePasse');
    if (!admin || typeof motDePasse !== 'string' || !(await admin.verifierMotDePasse(motDePasse))) {
      return res.status(403).json({ success: false, message: 'Mot de passe incorrect.' });
    }

    const m = MODELES();
    const aVider = ['produits', 'categories', 'ventes', 'mouvements', 'dettes', 'bonsCommande', 'inventaires', 'depenses', 'clotures', 'retours', 'journal'];
    if (boutique !== false) aVider.push('boutique');
    const supprimes = {};
    for (const nom of aVider) supprimes[nom] = (await m[nom].deleteMany({})).deletedCount || 0;

    const total = Object.values(supprimes).reduce((s, n) => s + n, 0);
    console.log(`🧹 Remise à zéro par ${req.user.email} (${total} éléments supprimés)`);
    // Le journal vient d'être vidé : cette trace en est la première entrée.
    await tracer({
      req, action: 'remise_a_zero', entite: 'systeme',
      libelle: `Remise à zéro des données (${total} éléments supprimés${boutique !== false ? ', infos boutique comprises' : ''})`,
    });
    res.json({ success: true, data: supprimes, message: 'Données remises à zéro.' });
  } catch (err) {
    console.error('❌ Remise à zéro :', err.message);
    res.status(500).json({ success: false, message: 'Remise à zéro impossible pour le moment' });
  }
};
