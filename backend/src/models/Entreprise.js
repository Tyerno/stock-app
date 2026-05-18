const mongoose = require('mongoose');
const PLANS    = require('../config/plans');

const entrepriseSchema = new mongoose.Schema({
  nom:       { type: String, required: true, trim: true },
  slug:      { type: String, unique: true, lowercase: true, trim: true },
  secteur:   {
    type: String,
    enum: ['boutique', 'quincaillerie', 'pharmacie', 'alimentation', 'btp', 'electronique', 'autre'],
    default: 'boutique',
  },
  contact: {
    email:     { type: String, trim: true, lowercase: true },
    telephone: { type: String, trim: true },
    adresse:   { type: String, trim: true },
    ville:     { type: String, trim: true },
    pays:      { type: String, default: 'Guinée' },
  },
  parametres: {
    devise:    { type: String, default: 'GNF' },
    logo:      { type: String, default: '' },
    couleur:   { type: String, default: '#3B82F6' },
    seuilAlerteDefaut: { type: Number, default: 5 },
  },
  abonnement: {
    plan:      { type: String, enum: ['gratuit', 'pro', 'enterprise'], default: 'gratuit' },
    statut:    { type: String, enum: ['actif', 'suspendu', 'expire'], default: 'actif' },
    dateDebut: { type: Date, default: Date.now },
    dateFin:   { type: Date },
  },
  actif:     { type: Boolean, default: true },
  stats: {
    totalProduits:     { type: Number, default: 0 },
    totalUtilisateurs: { type: Number, default: 0 },
  },
}, { timestamps: true });

// Génère le slug automatiquement
entrepriseSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.nom
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Retourne les limites du plan courant
entrepriseSchema.methods.getLimites = function () {
  return PLANS[this.abonnement.plan]?.limites || PLANS.gratuit.limites;
};

entrepriseSchema.methods.getFonctionnalites = function () {
  return PLANS[this.abonnement.plan]?.fonctionnalites || PLANS.gratuit.fonctionnalites;
};

module.exports = mongoose.model('Entreprise', entrepriseSchema);
