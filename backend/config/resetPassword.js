const mongoose = require('mongoose');
require('dotenv').config();

const { User } = require('../models');

async function resetPassword() {
  const [,, email, nouveauMotDePasse] = process.argv;

  if (!email || !nouveauMotDePasse) {
    console.log('Usage : node config/resetPassword.js <email> <nouveau_mot_de_passe>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('📡 Connecté à MongoDB');

  const user = await User.findOne({ email });
  if (!user) {
    console.log(`⚠️  Aucun utilisateur trouvé avec l'email ${email}`);
    await mongoose.disconnect();
    return;
  }

  user.motDePasse = nouveauMotDePasse; // haché automatiquement par le hook pre('save') du modèle
  await user.save();

  console.log(`✅ Mot de passe réinitialisé pour ${user.email} (${user.nom})`);
  await mongoose.disconnect();
}

resetPassword().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
