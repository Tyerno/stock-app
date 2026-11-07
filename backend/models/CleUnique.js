const mongoose = require('mongoose');

// Anti-doublon des envois rejoués (ventes faites hors connexion, réponse perdue, double clic…).
// Chaque vente porte une clé unique générée sur l'appareil : si la même clé arrive deux fois,
// le serveur renvoie la vente déjà enregistrée au lieu d'en créer une seconde.
const CleUniqueSchema = new mongoose.Schema({
  cle:         { type: String, required: true, unique: true },
  ressource:   { type: String, enum: ['vente', 'dette'], required: true },
  ressourceId: { type: mongoose.Schema.Types.ObjectId },
  createdAt:   { type: Date, default: Date.now, expires: 60 * 24 * 3600 }, // purge automatique après 60 jours
});

module.exports = mongoose.model('CleUnique', CleUniqueSchema);
