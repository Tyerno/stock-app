const mongoose = require('mongoose');

const mouvementSchema = new mongoose.Schema({
  entreprise:    { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true, index: true },
  produit:       { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  type:          { type: String, enum: ['entree', 'sortie', 'ajustement'], required: true },
  quantite:      { type: Number, required: true },
  quantiteAvant: { type: Number, required: true },
  quantiteApres: { type: Number, required: true },
  motif:         { type: String, trim: true },
  reference:     { type: String, trim: true },
  vente:         { type: mongoose.Schema.Types.ObjectId, ref: 'Vente' },
  creePar:       { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
}, { timestamps: true });

module.exports = mongoose.model('Mouvement', mouvementSchema);
