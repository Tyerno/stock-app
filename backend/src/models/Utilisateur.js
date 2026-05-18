const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const utilisateurSchema = new mongoose.Schema({
  nom:         { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  motDePasse:  { type: String, required: true, minlength: 6 },
  role:        {
    type: String,
    enum: ['superadmin', 'admin', 'gestionnaire', 'lecteur'],
    default: 'lecteur',
  },
  // null pour le superadmin, obligatoire pour les autres
  entreprise:  { type: mongoose.Schema.Types.ObjectId, ref: 'Entreprise', default: null },
  actif:       { type: Boolean, default: true },
  dernierLogin:{ type: Date },
  avatar:      { type: String, default: '' },
}, { timestamps: true });

// Hash mot de passe
utilisateurSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 12);
  next();
});

utilisateurSchema.methods.comparerMotDePasse = async function (mdp) {
  return bcrypt.compare(mdp, this.motDePasse);
};

// Vérifie si l'utilisateur appartient à une entreprise donnée
utilisateurSchema.methods.appartientA = function (entrepriseId) {
  return this.role === 'superadmin' ||
    (this.entreprise && this.entreprise.toString() === entrepriseId.toString());
};

module.exports = mongoose.model('Utilisateur', utilisateurSchema);
