const mongoose = require('mongoose');
require('dotenv').config();

const { Categorie, User } = require('../models');
const Produit = require('../models/Produit');

const categories = [
  { nom:'Ciment & Béton',   couleur:'#78716C' },
  { nom:'Acier & Fer',      couleur:'#6B7280' },
  { nom:'Bois & Charpente', couleur:'#92400E' },
  { nom:'Carrelage & Sol',  couleur:'#7C3AED' },
  { nom:'Plomberie',        couleur:'#0369A1' },
  { nom:'Électricité',      couleur:'#D97706' },
  { nom:'Peinture',         couleur:'#DC2626' },
  { nom:'Outillage',        couleur:'#059669' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('📡 Connecté à MongoDB');

  await Promise.all([Categorie.deleteMany({}), Produit.deleteMany({}), User.deleteMany({})]);

  const cats = await Categorie.insertMany(categories);
  console.log(`✅ ${cats.length} catégories créées`);

  const admin = await User.create({ nom:'Admin', email:'admin@stock.com', motDePasse:'admin123', role:'admin' });
  console.log(`✅ Admin créé : admin@stock.com / admin123`);

  const produits = [
    { nom:'Ciment Portland CEM I 42.5', reference:'CIM-001', categorie:cats[0]._id, unite:'sac',   prixAchat:8500,  prixVente:11000, quantiteStock:250, seuilAlerte:50 },
    { nom:'Sable de rivière',           reference:'SAB-001', categorie:cats[0]._id, unite:'m³',    prixAchat:45000, prixVente:65000, quantiteStock:30,  seuilAlerte:10 },
    { nom:'Rond à béton Ø12',           reference:'FER-012', categorie:cats[1]._id, unite:'kg',    prixAchat:1200,  prixVente:1800,  quantiteStock:2000,seuilAlerte:500},
    { nom:'Rond à béton Ø8',            reference:'FER-008', categorie:cats[1]._id, unite:'kg',    prixAchat:1100,  prixVente:1600,  quantiteStock:1500,seuilAlerte:400},
    { nom:'Planche sapin 25x200mm',     reference:'BOI-001', categorie:cats[2]._id, unite:'m',     prixAchat:3500,  prixVente:5500,  quantiteStock:0,   seuilAlerte:100},
    { nom:'Carrelage granite 60x60',    reference:'CAR-001', categorie:cats[3]._id, unite:'m²',    prixAchat:12000, prixVente:18000, quantiteStock:5,   seuilAlerte:20 },
    { nom:'Tube PVC Ø110',              reference:'PLB-001', categorie:cats[4]._id, unite:'m',     prixAchat:4500,  prixVente:7000,  quantiteStock:150, seuilAlerte:30 },
    { nom:'Câble électrique 2.5mm²',    reference:'ELC-001', categorie:cats[5]._id, unite:'m',     prixAchat:850,   prixVente:1400,  quantiteStock:500, seuilAlerte:100},
    { nom:'Peinture blanche 20L',       reference:'PNT-001', categorie:cats[6]._id, unite:'litre', prixAchat:35000, prixVente:55000, quantiteStock:40,  seuilAlerte:10 },
    { nom:'Brouette professionnelle',   reference:'OUT-001', categorie:cats[7]._id, unite:'unité', prixAchat:45000, prixVente:75000, quantiteStock:8,   seuilAlerte:3  },
  ];

  await Produit.insertMany(produits.map(p => ({ ...p, creePar:admin._id })));
  console.log(`✅ ${produits.length} produits créés`);

  await mongoose.disconnect();
  console.log('🎉 Base de données initialisée avec succès !');
}

seed().catch(err => { console.error(err); process.exit(1); });
