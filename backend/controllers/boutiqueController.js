const Boutique = require('../models/Boutique');

const CHAMPS = ['nom', 'adresse', 'telephone', 'email', 'ville', 'pays', 'devise'];
const DEVISES = ['GNF', 'USD', 'EUR', 'XOF'];

const publier = (doc) => CHAMPS.reduce((o, k) => ({ ...o, [k]: doc[k] ?? '' }), {});

// Lecture : tous les utilisateurs connectés (les reçus en ont besoin).
// `configure: false` tant qu'aucune information n'a été enregistrée en base.
exports.getBoutique = async (req, res) => {
  try {
    const doc = await Boutique.findOne().lean();
    res.json({ success: true, data: doc ? { ...publier(doc), configure: true } : { configure: false } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Écriture : réservée à l'admin (voir la route).
exports.modifierBoutique = async (req, res) => {
  try {
    const corps = req.body || {};
    const propre = {};
    for (const k of CHAMPS) {
      if (corps[k] === undefined) continue;
      if (typeof corps[k] !== 'string') {
        return res.status(400).json({ success: false, message: `Valeur invalide pour « ${k} »` });
      }
      propre[k] = corps[k].trim();
    }
    if ('nom' in propre && !propre.nom) {
      return res.status(400).json({ success: false, message: 'Le nom de la boutique est obligatoire' });
    }
    if (propre.devise && !DEVISES.includes(propre.devise)) {
      return res.status(400).json({ success: false, message: 'Devise non prise en charge' });
    }
    if (propre.email && !/^\S+@\S+\.\S+$/.test(propre.email)) {
      return res.status(400).json({ success: false, message: 'Adresse email invalide' });
    }
    const doc = await Boutique.findOneAndUpdate({}, { $set: propre }, {
      upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true,
    }).lean();
    res.json({ success: true, data: { ...publier(doc), configure: true }, message: 'Informations enregistrées' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
