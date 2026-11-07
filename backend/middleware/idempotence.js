const CleUnique = require('../models/CleUnique');

// À placer AVANT le contrôleur (et avant le journal : un envoi rejoué ne doit pas être tracé deux fois).
// Sans `cleUnique` dans le corps de la requête, ne change rien au comportement.
const FORMAT = /^[A-Za-z0-9_-]{8,80}$/;
const ATTENTE_MAX = 2 * 60 * 1000; // une requête « en cours » sans résultat depuis 2 min est considérée perdue

module.exports = (ressource, Modele, peupler) => async (req, res, next) => {
  const brute = req.body?.cleUnique;
  if (brute === undefined || brute === null || brute === '') return next();
  if (typeof brute !== 'string' || !FORMAT.test(brute)) return res.status(400).json({ success: false, message: 'Clé unique invalide' });
  const cle = `${ressource}:${brute}`;

  try {
    for (let essai = 0; essai < 2; essai++) {
      try { await CleUnique.create({ cle, ressource }); break; }
      catch (e) {
        if (e?.code !== 11000) throw e;
        const existante = await CleUnique.findOne({ cle }).lean();
        if (existante?.ressourceId) {
          let q = Modele.findById(existante.ressourceId);
          if (peupler) q = q.populate(peupler.chemin, peupler.champs);
          const doc = await q;
          if (doc) return res.status(200).json({ success: true, data: doc, message: 'Déjà enregistrée', dejaTraitee: true });
        }
        if (existante && Date.now() - new Date(existante.createdAt).getTime() > ATTENTE_MAX && essai === 0) {
          await CleUnique.deleteOne({ _id: existante._id }); // requête perdue : on la laisse repasser
          continue;
        }
        return res.status(409).json({ success: false, message: 'Envoi déjà en cours, réessayez dans un instant' });
      }
    }
  } catch (err) {
    console.error('❌ Idempotence :', err.message);
    return next(); // en cas de problème sur la clé, on n'empêche pas l'opération
  }

  const envoyer = res.json.bind(res);
  res.json = (body) => {
    const ok = res.statusCode < 400 && body?.success !== false && body?.data?._id;
    (ok ? CleUnique.updateOne({ cle }, { $set: { ressourceId: body.data._id } }) : CleUnique.deleteOne({ cle }))
      .catch((e) => console.error('⚠️ Clé unique :', e.message));
    return envoyer(body);
  };
  next();
};
