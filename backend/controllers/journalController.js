const mongoose = require('mongoose');
const Journal = require('../models/Journal');
const { conditionRecherche } = require('../utils/recherche');

// GET /api/journal?page&limit&entite&action&utilisateur&q&dateDebut&dateFin  (administrateur)
exports.getJournal = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const { entite, action, utilisateur, q, dateDebut, dateFin } = req.query;

    const filtre = {};
    if (typeof entite === 'string' && /^[a-z]{2,20}$/.test(entite)) filtre.entite = entite;
    if (typeof action === 'string' && /^[a-z_]{2,30}$/.test(action)) filtre.action = action;
    if (typeof utilisateur === 'string' && mongoose.isValidObjectId(utilisateur)) filtre['utilisateur.id'] = new mongoose.Types.ObjectId(utilisateur);

    const debut = dateDebut ? new Date(`${dateDebut}T00:00:00.000Z`) : null;
    const fin   = dateFin   ? new Date(`${dateFin}T23:59:59.999Z`)   : null;
    if ((debut && isNaN(debut)) || (fin && isNaN(fin))) return res.status(400).json({ success: false, message: 'Date invalide' });
    if (debut || fin) filtre.createdAt = { ...(debut && { $gte: debut }), ...(fin && { $lte: fin }) };

    const rech = conditionRecherche(q, ['libelle', 'utilisateur.nom']);
    if (rech) Object.assign(filtre, rech);

    const [data, total] = await Promise.all([
      Journal.find(filtre).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Journal.countDocuments(filtre),
    ]);
    res.json({ success: true, data, pagination: { total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Impossible de lire le journal' });
  }
};
