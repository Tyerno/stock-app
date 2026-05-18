const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
  entreprise:    { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true, index: true },
  nom:           { type: String, required: true, trim: true },
  reference:     { type: String, trim: true },
  description:   { type: String, trim: true },
  categorie:     { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', default: null },
  unite:         { type: String, default: 'unité' },
  prixAchat:     { type: Number, required: true, min: 0 },
  prixVente:     { type: Number, required: true, min: 0 },
  quantiteStock: { type: Number, default: 0, min: 0 },
  seuilAlerte:   { type: Number, default: 5 },
  codeBarre:     { type: String, trim: true },
  image:         { type: String, default: '' },
  actif:         { type: Boolean, default: true },
}, { timestamps: true });

// Référence unique par entreprise
produitSchema.index({ entreprise: 1, reference: 1 }, { unique: true, sparse: true });

// Génère la référence automatiquement
produitSchema.pre('save', async function (next) {
  if (!this.reference) {
    const count = await this.constructor.countDocuments({ entreprise: this.entreprise });
    this.reference = `PRD-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

produitSchema.virtual('statutStock').get(function () {
  if (this.quantiteStock === 0)               return 'rupture';
  if (this.quantiteStock <= this.seuilAlerte) return 'faible';
  return 'normal';
});

produitSchema.virtual('margePercent').get(function () {
  if (!this.prixAchat) return 0;
  return Math.round(((this.prixVente - this.prixAchat) / this.prixAchat) * 100);
});

produitSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Produit', produitSchema);
