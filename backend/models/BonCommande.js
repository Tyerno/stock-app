const mongoose = require('mongoose');

// Bon de commande adressé à un fournisseur. Les lignes gardent une copie du nom, de la référence et de
// l'unité du produit au moment de la commande : le document reste lisible même si le produit change ensuite.
const LigneSchema = new mongoose.Schema({
  produit:     { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nomProduit:  { type: String, required: true },
  reference:   String,
  unite:       String,
  quantite:    { type: Number, required: true, min: 0.01 },
  prixUnitaire:{ type: Number, required: true, min: 0 },
  sousTotal:   { type: Number, required: true, min: 0 },
  quantiteRecue: { type: Number, min: 0 },
}, { _id: true });

const BonCommandeSchema = new mongoose.Schema({
  numero:      { type: String, required: true, unique: true },
  fournisseur: { nom: { type: String, required: true, trim: true, maxlength: 100 }, contact: { type: String, trim: true, maxlength: 100 } },
  lignes:      { type: [LigneSchema], validate: [(l) => l.length > 0 && l.length <= 100, 'Un bon contient entre 1 et 100 lignes'] },
  total:       { type: Number, required: true, min: 0 },
  statut:      { type: String, enum: ['brouillon', 'envoye', 'recu', 'annule'], default: 'brouillon' },
  note:        { type: String, trim: true, maxlength: 500 },
  creePar:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateEnvoi:      Date,
  dateReception:  Date,
}, { timestamps: true });

BonCommandeSchema.index({ createdAt: -1 });
BonCommandeSchema.index({ statut: 1, createdAt: -1 });
BonCommandeSchema.index({ 'lignes.produit': 1, statut: 1 });

module.exports = mongoose.model('BonCommande', BonCommandeSchema);
