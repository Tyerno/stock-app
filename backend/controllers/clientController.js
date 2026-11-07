const Vente = require('../models/Vente');
const Dette = require('../models/Dette');

// Les clients ne sont pas une collection à part : ils sont déduits des ventes et des dettes
// (même nom, sans tenir compte des majuscules ni des espaces en trop). Rien à saisir en double.
const COMPTOIR = 'client comptoir';
const cle = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regexNom = (nom) => new RegExp(`^\\s*${echapper(String(nom).trim().replace(/\s+/g, ' ')).replace(/ /g, '\\s+')}\\s*$`, 'i');
const cleMongo = (champ) => ({ $toLower: { $trim: { input: { $ifNull: [champ, ''] } } } });
const debutJour = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };

// GET /api/clients?search=
exports.getClients = async (req, res) => {
  try {
    const search = cle(req.query.search);
    const [ventes, dettes, telV, telD] = await Promise.all([
      Vente.aggregate([
        { $match: { statut: 'validee', 'client.nom': { $type: 'string', $ne: '' } } },
        { $addFields: { k: cleMongo('$client.nom') } },
        { $match: { k: { $nin: ['', COMPTOIR] } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$k', nom: { $first: '$client.nom' }, nbAchats: { $sum: 1 }, totalAchats: { $sum: '$totalNet' }, dernierAchat: { $max: '$createdAt' } } },
      ]),
      Dette.aggregate([
        { $addFields: { k: cleMongo('$client.nom') } },
        { $match: { k: { $ne: '' } } },
        { $sort: { createdAt: -1 } },
        { $group: {
            _id: '$k', nom: { $first: '$client.nom' }, nbDettes: { $sum: 1 },
            restantDu: { $sum: { $cond: [{ $eq: ['$statut', 'EN_COURS'] }, '$montantRestant', 0] } },
            enRetard: { $sum: { $cond: [{ $and: [{ $eq: ['$statut', 'EN_COURS'] }, { $eq: [{ $type: '$dateEcheance' }, 'date'] }, { $lt: ['$dateEcheance', debutJour()] }] }, 1, 0] } },
        } },
      ]),
      Vente.aggregate([
        { $match: { statut: 'validee', 'client.telephone': { $type: 'string', $ne: '' } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: cleMongo('$client.nom'), tel: { $first: '$client.telephone' } } },
      ]),
      Dette.aggregate([
        { $match: { 'client.telephone': { $type: 'string', $ne: '' } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: cleMongo('$client.nom'), tel: { $first: '$client.telephone' } } },
      ]),
    ]);

    const tel = new Map();
    for (const t of [...telD, ...telV]) tel.set(t._id, t.tel); // les ventes (plus récentes) l'emportent si les deux existent
    const m = new Map();
    for (const v of ventes) m.set(v._id, { cle: v._id, nom: v.nom.trim(), nbAchats: v.nbAchats, totalAchats: v.totalAchats, dernierAchat: v.dernierAchat, nbDettes: 0, restantDu: 0, enRetard: 0 });
    for (const d of dettes) {
      const c = m.get(d._id) || { cle: d._id, nom: d.nom.trim(), nbAchats: 0, totalAchats: 0, dernierAchat: null };
      m.set(d._id, { ...c, nbDettes: d.nbDettes, restantDu: d.restantDu, enRetard: d.enRetard });
    }
    let liste = [...m.values()].map((c) => ({ ...c, telephone: tel.get(c.cle) || '' }));
    if (search) liste = liste.filter((c) => c.cle.includes(search) || c.telephone.replace(/\D/g, '').includes(search.replace(/\D/g, '') || '§'));
    liste.sort((a, b) => (b.dernierAchat ? +new Date(b.dernierAchat) : 0) - (a.dernierAchat ? +new Date(a.dernierAchat) : 0) || a.nom.localeCompare(b.nom));

    res.json({
      success: true,
      data: liste.slice(0, 1000),
      stats: {
        total: liste.length,
        totalAchats: liste.reduce((s, c) => s + c.totalAchats, 0),
        totalDu: liste.reduce((s, c) => s + c.restantDu, 0),
        debiteurs: liste.filter((c) => c.restantDu > 0).length,
      },
    });
  } catch (err) {
    console.error('❌ Clients :', err.message);
    res.status(500).json({ success: false, message: 'Liste des clients indisponible' });
  }
};

// GET /api/clients/fiche?nom=
exports.getFiche = async (req, res) => {
  try {
    const nom = String(req.query.nom || '').trim();
    if (!nom || nom.length > 120 || cle(nom) === COMPTOIR) return res.status(400).json({ success: false, message: 'Nom de client invalide' });
    const re = regexNom(nom);
    const [ventes, dettes] = await Promise.all([
      Vente.find({ 'client.nom': re, statut: 'validee' }).sort({ createdAt: -1 }).limit(200).populate('vendeur', 'nom').lean(),
      Dette.find({ 'client.nom': re }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    if (!ventes.length && !dettes.length) return res.status(404).json({ success: false, message: 'Client introuvable' });

    const totalAchats = ventes.reduce((s, v) => s + v.totalNet, 0);
    const produits = new Map();
    for (const v of ventes) for (const l of v.lignes) {
      const p = produits.get(l.nomProduit) || { nom: l.nomProduit, unite: l.unite, quantite: 0, montant: 0 };
      p.quantite += l.quantite; p.montant += l.sousTotal; produits.set(l.nomProduit, p);
    }
    const enCours = dettes.filter((d) => d.statut === 'EN_COURS');
    const debut = debutJour();
    const telephone = (ventes.find((v) => v.client?.telephone) || dettes.find((d) => d.client?.telephone))?.client?.telephone || '';
    res.json({
      success: true,
      data: {
        nom: (ventes[0]?.client?.nom || dettes[0]?.client?.nom || nom).trim(),
        telephone,
        premierAchat: ventes.length ? ventes[ventes.length - 1].createdAt : null,
        dernierAchat: ventes[0]?.createdAt || null,
        nbAchats: ventes.length,
        totalAchats,
        panierMoyen: ventes.length ? Math.round(totalAchats / ventes.length) : 0,
        restantDu: enCours.reduce((s, d) => s + d.montantRestant, 0),
        enRetard: enCours.filter((d) => d.dateEcheance && new Date(d.dateEcheance) < debut).length,
        topProduits: [...produits.values()].sort((a, b) => b.montant - a.montant).slice(0, 5),
        ventes: ventes.slice(0, 50),
        dettes,
      },
    });
  } catch (err) {
    console.error('❌ Fiche client :', err.message);
    res.status(500).json({ success: false, message: 'Fiche client indisponible' });
  }
};

exports._interne = { cle, regexNom };
