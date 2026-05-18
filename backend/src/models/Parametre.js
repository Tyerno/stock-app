const mongoose = require('mongoose');

const parametreSchema = new mongoose.Schema({
  entreprise: { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', required: true, unique: true },
  boutique: {
    nom:       { type: String, default: '' },
    adresse:   { type: String, default: '' },
    telephone: { type: String, default: '' },
    email:     { type: String, default: '' },
    devise:    { type: String, default: 'GNF' },
    couleur:   { type: String, default: '#6366f1' },
  },
  stock: {
    seuilAlerteDefaut:     { type: Number, default: 5 },
    permettreStockNegatif: { type: Boolean, default: false },
  },
  notifications: {
    alertesEmail:       { type: Boolean, default: false },
    emailDestinataire:  { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Parametre', parametreSchema);
