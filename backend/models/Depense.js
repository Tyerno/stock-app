const mongoose = require('mongoose');

// Dépense de la boutique (transport, salaire, loyer…). Déduite de la caisse du jour et du bénéfice net.
const CATEGORIES = ['transport', 'salaire', 'loyer', 'electricite', 'achat_divers', 'reparation', 'autre'];

const DepenseSchema = new mongoose.Schema({
  libelle:     { type: String, required: true, trim: true, maxlength: 120 },
  montant:     { type: Number, required: true, min: 1, max: 1e12 },
  categorie:   { type: String, enum: CATEGORIES, default: 'autre' },
  date:        { type: Date, default: Date.now },
  payeCaisse:  { type: Boolean, default: true },   // true = sortie d'argent de la caisse (espèces)
  note:        { type: String, trim: true, maxlength: 300 },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DepenseSchema.index({ date: -1 });

module.exports = mongoose.model('Depense', DepenseSchema);
module.exports.CATEGORIES = CATEGORIES;
