const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CategorieSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  couleur: { type: String, default: '#3B82F6' },
  icone: { type: String, default: 'package' },
  actif: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } });

CategorieSchema.virtual('nombreProduits', {
  ref: 'Produit', localField: '_id', foreignField: 'categorie', count: true,
});

const UserSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  motDePasse: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['admin', 'gestionnaire', 'lecteur'], default: 'gestionnaire' },
  actif: { type: Boolean, default: true },
  derniereConnexion: Date,
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 12);
  next();
});

UserSchema.methods.verifierMotDePasse = async function (mdp) {
  return require('bcryptjs').compare(mdp, this.motDePasse);
};

module.exports = {
  Categorie: mongoose.model('Categorie', CategorieSchema),
  User: mongoose.model('User', UserSchema),
};
