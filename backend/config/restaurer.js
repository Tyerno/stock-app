// Restaure une sauvegarde StockBTP (fichier JSON téléchargé depuis Paramètres → Export & sauvegarde).
// ⚠️ REMPLACE tout le contenu actuel de la base par celui du fichier.
//
//   node config/restaurer.js chemin/vers/sauvegarde.json --je-confirme-vider-la-base
//
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const { EJSON } = mongoose.mongo.BSON;

// nom dans le fichier → nom réel de la collection MongoDB (lu depuis les modèles)
const COLLECTIONS = {
  produits:     require('../models/Produit').collection.name,
  categories:   require('../models').Categorie.collection.name,
  ventes:       require('../models/Vente').collection.name,
  mouvements:   require('../models/Mouvement').collection.name,
  dettes:       require('../models/Dette').collection.name,
  boutique:     require('../models/Boutique').collection.name,
  utilisateurs: require('../models').User.collection.name,
  journal:      require('../models/Journal').collection.name,
  bonsCommande: require('../models/BonCommande').collection.name,
};

async function restaurer() {
  const fichier = process.argv[2];
  if (!fichier || fichier.startsWith('--') || !fs.existsSync(fichier)) {
    console.log('Usage : node config/restaurer.js <fichier.json> --je-confirme-vider-la-base');
    process.exit(1);
  }

  let sauv;
  try { sauv = EJSON.parse(fs.readFileSync(fichier, 'utf8')); }
  catch { console.error('❌ Fichier illisible : ce n\'est pas une sauvegarde valide.'); process.exit(1); }
  if (sauv.application !== 'StockBTP' || !sauv.collections) {
    console.error('❌ Ce fichier n\'est pas une sauvegarde StockBTP.'); process.exit(1);
  }

  console.log(`📦 Sauvegarde du ${sauv.date} (${sauv.total} éléments)`);
  for (const nom of Object.keys(COLLECTIONS)) {
    console.log(`   - ${nom} : ${(sauv.collections[nom] || []).length}`);
  }

  if (process.argv[3] !== '--je-confirme-vider-la-base') {
    console.log('\n⚠️  La restauration SUPPRIME les données actuelles de la base avant de les remplacer par celles-ci.');
    console.log('    Pour continuer volontairement, relancez avec :');
    console.log(`    node config/restaurer.js "${fichier}" --je-confirme-vider-la-base`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`\n📡 Connecté à la base « ${mongoose.connection.name} »`);
  const db = mongoose.connection.db;

  for (const [nom, coll] of Object.entries(COLLECTIONS)) {
    const docs = sauv.collections[nom] || [];
    // Écriture directe : aucun hook, les mots de passe déjà chiffrés ne sont pas rechiffrés.
    await db.collection(coll).deleteMany({});
    if (docs.length) await db.collection(coll).insertMany(docs, { ordered: false });
    console.log(`✅ ${nom} : ${docs.length} restauré(s)`);
  }

  // Recrée les index (unicité des emails, numéros de vente…)
  await Promise.all(Object.values(mongoose.models).map((M) => M.syncIndexes().catch(() => {})));
  console.log('\n🎉 Restauration terminée.');
  await mongoose.disconnect();
}

restaurer().catch((e) => { console.error('❌ Échec de la restauration :', e.message); process.exit(1); });
