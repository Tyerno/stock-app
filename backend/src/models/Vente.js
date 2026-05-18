const mongoose = require('mongoose');

const ligneSchema = new mongoose.Schema({
  produit:      { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nomProduit:   { type: String },   // snapshot au moment de la vente
  quantite:     { type: Number, required: true, min: 1 },
  prixUnitaire: { type: Number, required: true, min: 0 },
  total:        { type: Number, required: true },
}, { _id: false });

const venteSchema = new mongoose.Schema({
  entreprise:   { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true, index: true },
  numero:       { type: String },
  client: {
    nom:        { type: String, default: 'Comptoir', trim: true },
    telephone:  { type: String, trim: true },
  },
  lignes:       [ligneSchema],
  sousTotal:    { type: Number, required: true },
  remise:       { type: Number, default: 0 },
  remiseType:   { type: String, enum: ['percent', 'montant'], default: 'percent' },
  totalNet:     { type: Number, required: true },
  modePaiement: { type: String, enum: ['especes', 'virement', 'mobile_money', 'credit', 'autre'], default: 'especes' },
  statut:       { type: String, enum: ['validee', 'annulee'], default: 'validee' },
  notes:        { type: String, trim: true },
  creePar:      { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
}, { timestamps: true });

venteSchema.index({ entreprise: 1, createdAt: -1 });

venteSchema.pre('save', async function (next) {
  if (!this.numero) {
    const d = new Date();
    const yymmdd = `${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const count = await this.constructor.countDocuments({ entreprise: this.entreprise });
    this.numero = `V-${yymmdd}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Vente', venteSchema);
