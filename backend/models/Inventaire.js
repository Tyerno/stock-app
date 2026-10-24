const mongoose = require('mongoose');

// Inventaire physique : on compte ce qu'il y a réellement en rayon, puis on corrige le stock des écarts.
// Pour chaque produit compté, on garde le stock « théorique » AU MOMENT du comptage : l'écart est calculé
// par rapport à lui, ce qui permet de continuer à vendre pendant l'inventaire sans fausser les résultats.
const LigneSchema = new mongoose.Schema({
  produit:    { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nomProduit: { type: String, required: true },
  reference:  String,
  unite:      String,
  categorie:  String,
  prixAchat:  { type: Number, default: 0 },
  stockCompte:         { type: Number, min: 0, default: null },
  theoriqueAuComptage: { type: Number, default: null },
  comptePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  compteLe:  Date,
  ecartApplique: Number, // renseigné à la validation
}, { _id: true });

const InventaireSchema = new mongoose.Schema({
  numero:  { type: String, required: true, unique: true },
  statut:  { type: String, enum: ['en_cours', 'valide', 'annule'], default: 'en_cours' },
  perimetre: { type: String, default: 'Tous les produits' },
  note:    { type: String, trim: true, maxlength: 300 },
  lignes:  [LigneSchema],
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateValidation: Date,
}, { timestamps: true });

InventaireSchema.index({ createdAt: -1 });
InventaireSchema.index({ statut: 1 });

module.exports = mongoose.model('Inventaire', InventaireSchema);
