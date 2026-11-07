const mongoose = require('mongoose');

const LigneRetourSchema = new mongoose.Schema({
  produit:      { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nomProduit:   { type: String, required: true },
  unite:        { type: String, required: true },
  quantite:     { type: Number, required: true, min: 0.01 },
  prixUnitaire: { type: Number, required: true, min: 0 }, // prix de la vente d'origine (ou prix de l'échange)
  sousTotal:    { type: Number, required: true },
  remisEnStock: { type: Boolean, default: true },         // faux = article abîmé, non remis en rayon
}, { _id: false });

// Un retour (le client rapporte des articles) peut s'accompagner d'un échange (il repart avec d'autres articles).
// La vente d'origine n'est jamais modifiée : tout est tracé ici.
const RetourSchema = new mongoose.Schema({
  numero:      { type: String, unique: true },
  vente:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vente', required: true, index: true },
  venteNumero: { type: String },
  client:      { nom: { type: String }, telephone: { type: String } },
  type:        { type: String, enum: ['retour', 'echange'], required: true },
  lignesRetour:  { type: [LigneRetourSchema], required: true },
  lignesEchange: { type: [LigneRetourSchema], default: [] },
  totalRetourne: { type: Number, required: true },   // valeur rendue au client (remise de la vente d'origine déduite)
  totalEchange:  { type: Number, default: 0 },
  difference:    { type: Number, required: true },   // > 0 : le client paie ; < 0 : la boutique rembourse
  reglement:     { type: String, enum: ['especes', 'mobile_money', 'dette'], default: 'especes' },
  montantDette:  { type: Number, default: 0 },       // part déduite de la dette du client
  especesNet:    { type: Number, default: 0 },       // mouvement d'espèces en caisse (+ entrée, − sortie)
  margeRetournee: { type: Number, default: 0 },      // bénéfice perdu sur les articles repris
  margeEchange:   { type: Number, default: 0 },      // bénéfice réalisé sur les articles donnés en échange
  motif:       { type: String, trim: true, maxlength: 200 },
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

RetourSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Retour', RetourSchema);
