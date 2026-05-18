const mongoose = require('mongoose');

const categorieSchema = new mongoose.Schema({
  entreprise:  { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true, index: true },
  nom:         { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  couleur:     { type: String, default: '#3B82F6' },
  icone:       { type: String, default: 'package' },
}, { timestamps: true });

// Unicité du nom par entreprise
categorieSchema.index({ entreprise: 1, nom: 1 }, { unique: true });

module.exports = mongoose.model('Categorie', categorieSchema);
