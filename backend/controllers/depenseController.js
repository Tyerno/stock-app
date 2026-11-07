const mongoose = require('mongoose');
const Depense  = require('../models/Depense');
const { CATEGORIES } = Depense;

exports.creerDepense = async (req, res) => {
  try {
    const { libelle, montant, categorie = 'autre', date, payeCaisse = true, note } = req.body || {};
    const m = Number(montant);
    if (!String(libelle || '').trim()) return res.status(400).json({ success: false, message: 'Indiquez à quoi sert la dépense.' });
    if (!Number.isFinite(m) || m < 1) return res.status(400).json({ success: false, message: 'Montant invalide.' });
    if (!CATEGORIES.includes(categorie)) return res.status(400).json({ success: false, message: 'Catégorie invalide.' });
    let d = new Date();
    if (date) {
      // « AAAA-MM-JJ » : on garde l'heure actuelle pour que la dépense reste dans la bonne journée
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ success: false, message: 'Date invalide.' });
      const jour = new Date(date + 'T00:00:00.000Z');
      if (isNaN(jour) || jour.getTime() > Date.now()) return res.status(400).json({ success: false, message: 'Date invalide.' });
      d = new Date(jour.getTime() + (Date.now() % 86400000));
      if (d.getTime() > Date.now()) d = new Date();
    }
    const dep = await Depense.create({
      libelle: String(libelle).trim().slice(0, 120), montant: Math.round(m), categorie, date: d,
      payeCaisse: payeCaisse !== false, note: String(note || '').slice(0, 300), utilisateur: req.user._id,
    });
    res.status(201).json({ success: true, data: dep, message: 'Dépense enregistrée' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.supprimerDepense = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Dépense introuvable' });
    const dep = await Depense.findByIdAndDelete(req.params.id);
    if (!dep) return res.status(404).json({ success: false, message: 'Dépense introuvable' });
    res.json({ success: true, data: dep, message: 'Dépense supprimée' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
