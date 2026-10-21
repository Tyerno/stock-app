const mongoose = require('mongoose');

// Informations de la boutique (une seule fiche pour toute l'application) : reçus, en-têtes, etc.
const BoutiqueSchema = new mongoose.Schema({
  nom:       { type: String, required: true, trim: true, maxlength: 80,  default: 'StockBTP' },
  adresse:   { type: String, trim: true, maxlength: 200, default: '' },
  telephone: { type: String, trim: true, maxlength: 40,  default: '' },
  email:     { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
  ville:     { type: String, trim: true, maxlength: 80,  default: 'Conakry' },
  pays:      { type: String, trim: true, maxlength: 80,  default: 'Guinée' },
  devise:    { type: String, enum: ['GNF', 'USD', 'EUR', 'XOF'], default: 'GNF' },
}, { timestamps: true });

module.exports = mongoose.model('Boutique', BoutiqueSchema);
