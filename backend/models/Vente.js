const mongoose = require('mongoose');

const LigneVenteSchema = new mongoose.Schema({
  produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nomProduit: { type: String, required: true },
  unite: { type: String, required: true },
  quantite: { type: Number, required: true, min: 0.01 },
  prixUnitaire: { type: Number, required: true, min: 0 },
  sousTotal: { type: Number, required: true },
}, { _id: false });

const VenteSchema = new mongoose.Schema({
  numero: { type: String, unique: true },
  client: { nom: { type: String, default: 'Client comptoir' }, telephone: { type: String } },
  lignes: { type: [LigneVenteSchema], required: true },
  totalHT: { type: Number, required: true },
  remise: { type: Number, default: 0 },
  totalNet: { type: Number, required: true },
  modePaiement: { type: String, enum: ['especes','mobile_money','mixte'], default: 'especes' },
  montantRecu: { type: Number },
  monnaie: { type: Number, default: 0 },
  statut: { type: String, enum: ['validee','annulee'], default: 'validee' },
  vendeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });

VenteSchema.pre('save', async function (next) {
  if (this.isNew && !this.numero) {
    const date   = new Date();
    const prefix = `VTE-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const last   = await mongoose.model('Vente').findOne({ numero: new RegExp(`^${prefix}`) }).sort({ numero: -1 });
    const seq    = last ? parseInt(last.numero.slice(-4)) + 1 : 1;
    this.numero  = `${prefix}-${String(seq).padStart(4, '0')}`;
  }
  next();
});

VenteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Vente', VenteSchema);
