require('dotenv').config();
const mongoose    = require('mongoose');
const Utilisateur = require('../models/Utilisateur');
const Entreprise  = require('../models/Entreprise');
const Categorie   = require('../models/Categorie');
const Produit     = require('../models/Produit');
const Vente       = require('../models/Vente');
const Mouvement   = require('../models/Mouvement');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connecté');

  // Nettoyage
  await Promise.all([
    Utilisateur.deleteMany(), Entreprise.deleteMany(),
    Categorie.deleteMany(),   Produit.deleteMany(),
    Vente.deleteMany(),       Mouvement.deleteMany(),
  ]);
  console.log('🗑  Collections vidées');

  // ── SuperAdmin ────────────────────────────────────────────────────────────
  await Utilisateur.create({
    nom: 'Super Administrateur',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@stocksaas.com',
    motDePasse: process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!',
    role: 'superadmin',
    entreprise: null,
  });
  console.log('👑 SuperAdmin créé');

  // ── Entreprise 1 : Quincaillerie ──────────────────────────────────────────
  const quin = await Entreprise.create({
    nom: 'Quincaillerie Alpha',
    secteur: 'quincaillerie',
    contact: { email: 'alpha@quincaillerie.gn', telephone: '+224 620 111 111', ville: 'Conakry' },
    abonnement: { plan: 'pro', statut: 'actif' },
    parametres: { devise: 'GNF', couleur: '#F59E0B' },
  });

  const [adminQ, gestQ] = await Promise.all([
    Utilisateur.create({ nom: 'Ibrahima Sow', email: 'admin@alpha.gn', motDePasse: 'admin123', role: 'admin', entreprise: quin._id }),
    Utilisateur.create({ nom: 'Mariama Diallo', email: 'gestion@alpha.gn', motDePasse: 'pass123', role: 'gestionnaire', entreprise: quin._id }),
  ]);

  const [catFerQ, catCimQ, catOutilQ] = await Promise.all([
    Categorie.create({ entreprise: quin._id, nom: 'Fer & Métaux',   couleur: '#EF4444' }),
    Categorie.create({ entreprise: quin._id, nom: 'Ciment & Béton', couleur: '#6B7280' }),
    Categorie.create({ entreprise: quin._id, nom: 'Outillage',      couleur: '#8B5CF6' }),
  ]);

  const produitsQ = await Produit.insertMany([
    { entreprise: quin._id, nom: 'Fer à béton ø10mm',    categorie: catFerQ._id,  unite: 'barre',  prixAchat: 45000,  prixVente: 58000,  quantiteStock: 500, seuilAlerte: 50 },
    { entreprise: quin._id, nom: 'Fer à béton ø12mm',    categorie: catFerQ._id,  unite: 'barre',  prixAchat: 65000,  prixVente: 82000,  quantiteStock: 3,   seuilAlerte: 50 },
    { entreprise: quin._id, nom: 'Ciment Portland 50kg', categorie: catCimQ._id,  unite: 'sac',    prixAchat: 85000,  prixVente: 102000, quantiteStock: 200, seuilAlerte: 30 },
    { entreprise: quin._id, nom: 'Sable lavé',           categorie: catCimQ._id,  unite: 'm³',     prixAchat: 100000, prixVente: 140000, quantiteStock: 0,   seuilAlerte: 5  },
    { entreprise: quin._id, nom: 'Marteau 500g',         categorie: catOutilQ._id,unite: 'pièce',  prixAchat: 35000,  prixVente: 50000,  quantiteStock: 80,  seuilAlerte: 10 },
    { entreprise: quin._id, nom: 'Perceuse électrique',  categorie: catOutilQ._id,unite: 'pièce',  prixAchat: 450000, prixVente: 580000, quantiteStock: 12,  seuilAlerte: 3  },
  ]);

  // ── Entreprise 2 : Pharmacie ──────────────────────────────────────────────
  const pharma = await Entreprise.create({
    nom: 'Pharmacie Santé Plus',
    secteur: 'pharmacie',
    contact: { email: 'sante@pharma.gn', telephone: '+224 622 222 222', ville: 'Kindia' },
    abonnement: { plan: 'gratuit', statut: 'actif' },
    parametres: { devise: 'GNF', couleur: '#10B981' },
  });

  const adminP = await Utilisateur.create({
    nom: 'Dr. Fatoumata Bah', email: 'admin@pharma.gn', motDePasse: 'admin123',
    role: 'admin', entreprise: pharma._id,
  });

  const [catMedP, catParaP] = await Promise.all([
    Categorie.create({ entreprise: pharma._id, nom: 'Médicaments',   couleur: '#EF4444' }),
    Categorie.create({ entreprise: pharma._id, nom: 'Parapharmacie', couleur: '#3B82F6' }),
  ]);

  await Produit.insertMany([
    { entreprise: pharma._id, nom: 'Paracétamol 500mg (boîte 16)', categorie: catMedP._id,  unite: 'boîte',  prixAchat: 5000,  prixVente: 8000,  quantiteStock: 200, seuilAlerte: 30 },
    { entreprise: pharma._id, nom: 'Amoxicilline 500mg',           categorie: catMedP._id,  unite: 'boîte',  prixAchat: 12000, prixVente: 18000, quantiteStock: 4,   seuilAlerte: 20 },
    { entreprise: pharma._id, nom: 'Gel hydroalcoolique 500ml',    categorie: catParaP._id, unite: 'flacon', prixAchat: 15000, prixVente: 22000, quantiteStock: 0,   seuilAlerte: 10 },
    { entreprise: pharma._id, nom: 'Masques chirurgicaux (50)',    categorie: catParaP._id, unite: 'boîte',  prixAchat: 20000, prixVente: 30000, quantiteStock: 45,  seuilAlerte: 10 },
  ]);

  // ── Ventes de démo (30 jours, quincaillerie) ──────────────────────────────
  for (let i = 29; i >= 0; i--) {
    const date = new Date(); date.setDate(date.getDate() - i);
    const nb   = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < nb; j++) {
      const prod = produitsQ[Math.floor(Math.random() * produitsQ.length)];
      const qte  = Math.floor(Math.random() * 4) + 1;
      const d    = new Date(date);
      const yymmdd = `${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const count  = i * 10 + j;

      await Vente.create({
        entreprise: quin._id,
        numero: `V-${yymmdd}-${String(count+1).padStart(4,'0')}`,
        client: { nom: ['Thierno Barry', 'Kadiatou Camara', 'Comptoir'][j % 3] },
        lignes: [{ produit: prod._id, nomProduit: prod.nom, quantite: qte, prixUnitaire: prod.prixVente, total: qte * prod.prixVente }],
        sousTotal: qte * prod.prixVente, remise: 0, totalNet: qte * prod.prixVente,
        modePaiement: 'especes', creePar: gestQ._id, createdAt: date, updatedAt: date,
      });
    }
  }
  console.log('💰 Ventes de démo créées');

  console.log('\n✅ Base initialisée !');
  console.log('═'.repeat(55));
  console.log('👑 SuperAdmin   → superadmin@stocksaas.com / SuperAdmin123!');
  console.log('🏗  Quincaillerie Admin → admin@alpha.gn / admin123');
  console.log('🏗  Quincaillerie Gest → gestion@alpha.gn / pass123');
  console.log('💊 Pharmacie Admin    → admin@pharma.gn / admin123');
  console.log('═'.repeat(55));
  process.exit(0);
}

seed().catch(err => { console.error('❌', err); process.exit(1); });
