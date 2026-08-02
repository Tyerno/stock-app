const mongoose = require('mongoose');
require('dotenv').config();

const { User } = require('../models');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('📡 Connecté à MongoDB');

  const email = process.env.ADMIN_EMAIL || 'admin@stock.com';
  const motDePasse = process.env.ADMIN_PASSWORD || 'admin123';

  const existant = await User.findOne({ email });
  if (existant) {
    console.log(`⚠️  Un utilisateur existe déjà avec l'email ${email} — rien n'a été créé/modifié.`);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({ nom: 'Admin', email, motDePasse, role: 'admin' });
  console.log(`✅ Compte admin créé : ${admin.email} / ${motDePasse}`);
  console.log('⚠️  Pense à changer ce mot de passe dès la première connexion.');

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
