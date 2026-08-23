const mongoose = require('mongoose');

const PaiementSchema = new mongoose.Schema({
  montant: { type: Number, required: true, min: 0.01 },
  date:    { type: Date, default: Date.now },
  note:    { type: String, trim: true },
}, { _id: false });

const DetteSchema = new mongoose.Schema({
  client: {
    nom:       { type: String, required: true, trim: true },
    telephone: { type: String, trim: true },
  },
  vente:          { type: mongoose.Schema.Types.ObjectId, ref: 'Vente' },
  montantInitial: { type: Number, required: true, min: 0.01 },
  montantRestant: { type: Number, required: true, min: 0 },
  paiements:      { type: [PaiementSchema], default: [] },
  statut:         { type: String, enum: ['EN_COURS', 'PAYEE'], default: 'EN_COURS' },
}, { timestamps: true });

// Le montant restant et le statut sont toujours dérivés de montantInitial et des paiements —
// jamais définis manuellement, pour garantir la cohérence des données à chaque sauvegarde.
DetteSchema.pre('validate', function (next) {
  const totalPaiements = this.paiements.reduce((total, p) => total + p.montant, 0);

  if (totalPaiements > this.montantInitial) {
    return next(new Error('Le total des paiements ne peut pas dépasser le montant initial de la dette.'));
  }

  this.montantRestant = this.montantInitial - totalPaiements;
  this.statut = this.montantRestant === 0 ? 'PAYEE' : 'EN_COURS';

  next();
});

DetteSchema.index({ 'client.nom': 1 });
DetteSchema.index({ statut: 1 });
DetteSchema.index({ vente: 1 });
DetteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Dette', DetteSchema);
