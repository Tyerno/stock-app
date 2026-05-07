const mongoose = require('mongoose');

const ProduitSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  reference: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  description: { type: String, trim: true },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
  unite: { type: String, enum: ['unité','kg','tonne','m','m²','m³','litre','sac','palette','lot'], default: 'unité' },
  prixAchat: { type: Number, required: true, min: 0 },
  prixVente: { type: Number, required: true, min: 0 },
  quantiteStock: { type: Number, default: 0, min: 0 },
  seuilAlerte: { type: Number, default: 10, min: 0 },
  quantiteMaximale: { type: Number, min: 0 },
  fournisseur: { nom: String, contact: String, delaiLivraison: Number },
  actif: { type: Boolean, default: true },
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ProduitSchema.virtual('valeurStock').get(function () { return this.quantiteStock * this.prixAchat; });
ProduitSchema.virtual('margePercent').get(function () {
  if (this.prixAchat === 0) return 0;
  return (((this.prixVente - this.prixAchat) / this.prixAchat) * 100).toFixed(2);
});
ProduitSchema.virtual('statutStock').get(function () {
  if (this.quantiteStock === 0) return 'rupture';
  if (this.quantiteStock <= this.seuilAlerte) return 'faible';
  return 'normal';
});

ProduitSchema.index({ nom: 'text', reference: 'text' });
ProduitSchema.index({ categorie: 1, actif: 1 });

module.exports = mongoose.model('Produit', ProduitSchema);
