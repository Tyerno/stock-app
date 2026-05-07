const mongoose = require('mongoose');

const MouvementSchema = new mongoose.Schema({
  produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  type: { type: String, enum: ['entree','sortie','ajustement','retour','perte'], required: true },
  quantite: { type: Number, required: true, min: 0.01 },
  quantiteAvant: { type: Number, required: true },
  quantiteApres: { type: Number, required: true },
  prixUnitaire: { type: Number, min: 0 },
  montantTotal: { type: Number },
  motif: { type: String, trim: true },
  reference: { type: String, trim: true },
  fournisseur: { type: String, trim: true },
  client: { type: String, trim: true },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

MouvementSchema.pre('save', function (next) {
  if (this.prixUnitaire && this.quantite) this.montantTotal = this.prixUnitaire * this.quantite;
  next();
});

MouvementSchema.index({ produit: 1, createdAt: -1 });
MouvementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Mouvement', MouvementSchema);
