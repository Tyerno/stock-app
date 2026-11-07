const mongoose = require('mongoose');

// Informations de la boutique (une seule fiche pour toute l'application) : reçus, en-têtes, etc.
const BoutiqueSchema = new mongoose.Schema({
  nom:       { type: String, required: true, trim: true, maxlength: 80,  default: 'Ma boutique' },
  adresse:   { type: String, trim: true, maxlength: 200, default: '' },
  telephone: { type: String, trim: true, maxlength: 40,  default: '' },
  email:     { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
  ville:     { type: String, trim: true, maxlength: 80,  default: 'Conakry' },
  pays:      { type: String, trim: true, maxlength: 80,  default: 'Guinée' },
  devise:    { type: String, enum: ['GNF', 'USD', 'EUR', 'XOF'], default: 'GNF' },
  // Logo : image réduite côté navigateur, stockée en data URL (png/jpeg/webp). Validée par le contrôleur.
  logo:      { type: String, default: '', maxlength: 120000 },
  // Préférences
  emailAlertes: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' }, // destinataire des alertes / résumé
  seuilDefaut:  { type: Number, min: 0, max: 1000000, default: 10 },                       // seuil d'alerte proposé pour un nouveau produit
  objectifMensuel: { type: Number, min: 0, max: 1e13, default: 0 },                        // objectif de chiffre d'affaires du mois (0 = aucun)
}, { timestamps: true });

module.exports = mongoose.model('Boutique', BoutiqueSchema);
