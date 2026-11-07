const mongoose = require('mongoose');

// Clôture de caisse d'une journée (une seule par jour : la dernière remplace la précédente).
const ClotureSchema = new mongoose.Schema({
  jour:             { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  fondOuverture:    { type: Number, default: 0, min: 0 },
  especesAttendues: { type: Number, required: true },
  especesComptees:  { type: Number, required: true, min: 0 },
  ecart:            { type: Number, required: true },   // comptées − attendues (négatif = manquant)
  details:          mongoose.Schema.Types.Mixed,        // chiffres du jour au moment de la clôture
  note:             { type: String, trim: true, maxlength: 300 },
  utilisateur:      { id: mongoose.Schema.Types.ObjectId, nom: String },
}, { timestamps: true });

module.exports = mongoose.model('Cloture', ClotureSchema);
