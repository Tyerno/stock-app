const mongoose = require('mongoose');

// Devis (proforma) remis à un client avant l'achat. Il ne touche jamais au stock ni à la caisse : quand le client
// confirme, le devis est transformé en vente par le circuit de vente habituel, puis marqué « converti » (lien vers la vente).
// Les lignes gardent une copie du nom, de l'unité et du prix proposé : le devis reste lisible si le produit change ensuite.
const LigneSchema = new mongoose.Schema({
  produit:     { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nomProduit:  { type: String, required: true },
  reference:   String,
  unite:       String,
  quantite:    { type: Number, required: true, min: 0.01 },
  prixUnitaire:{ type: Number, required: true, min: 0 },
  sousTotal:   { type: Number, required: true, min: 0 },
}, { _id: true });

const DevisSchema = new mongoose.Schema({
  numero:  { type: String, required: true, unique: true },
  client:  { nom: { type: String, required: true, trim: true, maxlength: 100 }, telephone: { type: String, trim: true, maxlength: 30 } },
  lignes:  { type: [LigneSchema], validate: [(l) => l.length > 0 && l.length <= 100, 'Un devis contient entre 1 et 100 lignes'] },
  totalHT: { type: Number, required: true, min: 0 },
  remise:  { type: Number, default: 0, min: 0 },
  totalNet:{ type: Number, required: true, min: 0 },
  // en_cours : proposé au client (« expiré » = en_cours dont la date de validité est passée, calculé à la lecture)
  statut:  { type: String, enum: ['en_cours', 'converti', 'refuse'], default: 'en_cours' },
  dateValidite: { type: Date, required: true },
  note:    { type: String, trim: true, maxlength: 500 },
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vente:   { type: mongoose.Schema.Types.ObjectId, ref: 'Vente' },
  dateConversion: Date,
}, { timestamps: true });

DevisSchema.index({ createdAt: -1 });
DevisSchema.index({ statut: 1, dateValidite: 1 });

module.exports = mongoose.model('Devis', DevisSchema);
