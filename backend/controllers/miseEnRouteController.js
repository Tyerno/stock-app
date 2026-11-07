const Boutique  = require('../models/Boutique');
const Produit   = require('../models/Produit');
const Vente     = require('../models/Vente');
const Inventaire = require('../models/Inventaire');
const Journal   = require('../models/Journal');
const { Categorie, User } = require('../models');

// GET /api/mise-en-route : état de la mise en service de la boutique (cases cochées automatiquement).
exports.getEtat = async (req, res) => {
  try {
    const [boutique, categories, produits, utilisateurs, ventes, inventaires, sauvegardes] = await Promise.all([
      Boutique.findOne().select('nom adresse telephone logo').lean(),
      Categorie.countDocuments({}),
      Produit.countDocuments({ actif: true }),
      User.countDocuments({}),
      Vente.countDocuments({ statut: 'validee' }),
      Inventaire.countDocuments({ statut: 'valide' }),
      Journal.countDocuments({ action: 'sauvegarde' }),
    ]);
    res.json({ success: true, data: {
      boutiqueNommee: !!boutique && !!boutique.nom && boutique.nom.trim().toLowerCase() !== 'ma boutique',
      logo: !!boutique?.logo,
      coordonnees: !!(boutique?.telephone || boutique?.adresse),
      categories, produits, utilisateurs, ventes, inventaires, sauvegardes,
    } });
  } catch (err) {
    console.error('❌ Mise en route :', err.message);
    res.status(500).json({ success: false, message: 'Indisponible pour le moment' });
  }
};
