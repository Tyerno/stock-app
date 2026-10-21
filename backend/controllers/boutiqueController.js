const Boutique = require('../models/Boutique');

const CHAMPS = ['nom', 'adresse', 'telephone', 'email', 'ville', 'pays', 'devise', 'emailAlertes'];
const DEVISES = ['GNF', 'USD', 'EUR', 'XOF'];

// ─── Logo ──────────────────────────────────────────────────────────────────
// Format imposé : data URL png/jpeg/webp en base64, taille limitée, signature du fichier vérifiée.
// (Le SVG est volontairement refusé : il peut contenir du code actif.)
const LOGO_MAX = 120000; // caractères
const RE_LOGO  = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const logoValide = (valeur) => {
  if (valeur === '') return true; // retrait du logo
  if (typeof valeur !== 'string' || valeur.length > LOGO_MAX) return false;
  const m = RE_LOGO.exec(valeur);
  if (!m) return false;
  const o = Buffer.from(m[2].slice(0, 24), 'base64'); // 18 premiers octets
  if (m[1] === 'png')  return o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47;
  if (m[1] === 'jpeg') return o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;
  return o.toString('ascii', 0, 4) === 'RIFF' && o.toString('ascii', 8, 12) === 'WEBP';
};

const publier = (doc) => ({
  ...CHAMPS.reduce((o, k) => ({ ...o, [k]: doc[k] ?? '' }), {}),
  seuilDefaut: doc.seuilDefaut ?? 10,
  logo: doc.logo || '',
});

// Lecture : tous les utilisateurs connectés (les reçus en ont besoin).
// `configure: false` tant qu'aucune information n'a été enregistrée en base.
// Lecture publique (page de connexion) : uniquement le nom et le logo, jamais les coordonnées.
exports.getMarque = async (req, res) => {
  try {
    const doc = await Boutique.findOne().select('nom logo').lean();
    res.json({ success: true, data: { nom: doc?.nom || 'StockBTP', logo: doc?.logo || '' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

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
      if (k === 'email' || k === 'emailAlertes') propre[k] = propre[k].toLowerCase();
    }
    if (corps.logo !== undefined) {
      if (!logoValide(corps.logo)) {
        return res.status(400).json({ success: false, message: 'Logo invalide : image PNG, JPG ou WebP de 120 Ko maximum' });
      }
      propre.logo = corps.logo;
    }
    if (corps.seuilDefaut !== undefined) {
      const n = Number(corps.seuilDefaut);
      if (corps.seuilDefaut === '' || corps.seuilDefaut === null || !Number.isInteger(n) || n < 0 || n > 1000000) {
        return res.status(400).json({ success: false, message: "Le seuil d'alerte doit être un nombre entier positif" });
      }
      propre.seuilDefaut = n;
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
    if (propre.emailAlertes && !/^\S+@\S+\.\S+$/.test(propre.emailAlertes)) {
      return res.status(400).json({ success: false, message: "Adresse email des alertes invalide" });
    }
    const doc = await Boutique.findOneAndUpdate({}, { $set: propre }, {
      upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true,
    }).lean();
    res.json({ success: true, data: { ...publier(doc), configure: true }, message: 'Informations enregistrées' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
