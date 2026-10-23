const mongoose = require('mongoose');

// Journal d'activité : trace de ce qui change dans l'application (qui, quoi, quand).
// Conservé 400 jours puis supprimé automatiquement par MongoDB (index TTL).
const JournalSchema = new mongoose.Schema({
  utilisateur: {
    id:    { type: mongoose.Schema.Types.ObjectId },
    nom:   String,
    email: String,
    role:  String,
  },
  action:   { type: String, required: true },   // ex. 'vente_creee', 'produit_modifie'
  entite:   { type: String, required: true },   // produit, vente, dette, utilisateur, categorie, boutique, compte, systeme
  entiteId: String,
  libelle:  { type: String, required: true },   // phrase lisible en français
  details:  mongoose.Schema.Types.Mixed,        // changements avant → après, montants…
  ip:       String,
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

JournalSchema.index({ createdAt: -1 });
JournalSchema.index({ entite: 1, createdAt: -1 });
JournalSchema.index({ 'utilisateur.id': 1, createdAt: -1 });
JournalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 3600 });

module.exports = mongoose.model('Journal', JournalSchema);
