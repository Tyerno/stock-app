const Vente     = require('../models/Vente');
const Produit   = require('../models/Produit');
const Dette     = require('../models/Dette');
const Mouvement = require('../models/Mouvement');
const { _calculerJour } = require('./caisseController');

const JOUR = 24 * 3600 * 1000;
const cle = (ms) => new Date(ms).toISOString().slice(0, 10);

// ─── Rapport d'activité d'une journée (UTC, comme le reste de l'application) ──
exports.getRapportJour = async (req, res) => {
  try {
    const aujourdhui = cle(Date.now());
    let jour = String(req.query.date || aujourdhui);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || isNaN(new Date(jour + 'T00:00:00Z'))) {
      return res.status(400).json({ success: false, message: 'Date invalide (AAAA-MM-JJ)' });
    }
    if (jour > aujourdhui) jour = aujourdhui;

    const debut = new Date(jour + 'T00:00:00.000Z');
    const fin = new Date(debut.getTime() + JOUR);
    const veille = new Date(debut.getTime() - JOUR);
    const dansJour = { $gte: debut, $lt: fin };
    const validees = { statut: 'validee', createdAt: dansJour };

    const [parMode, totalVeille, annulees, topProduits, dettesNouvelles, encaissements, dettesEnCours,
      mouvEntrees, ruptures, faibles, valeurStock] = await Promise.all([
      Vente.aggregate([
        { $match: validees },
        { $group: { _id: '$modePaiement', nb: { $sum: 1 }, total: { $sum: '$totalNet' }, remises: { $sum: '$remise' } } },
      ]),
      Vente.aggregate([
        { $match: { statut: 'validee', createdAt: { $gte: veille, $lt: debut } } },
        { $group: { _id: null, total: { $sum: '$totalNet' }, nb: { $sum: 1 } } },
      ]),
      Vente.aggregate([
        { $match: { statut: 'annulee', createdAt: dansJour } },
        { $group: { _id: null, nb: { $sum: 1 }, total: { $sum: '$totalNet' } } },
      ]),
      Vente.aggregate([
        { $match: validees },
        { $unwind: '$lignes' },
        { $group: { _id: '$lignes.produit', nom: { $first: '$lignes.nomProduit' }, unite: { $first: '$lignes.unite' },
            quantite: { $sum: '$lignes.quantite' }, montant: { $sum: '$lignes.sousTotal' } } },
        { $sort: { montant: -1 } },
        { $limit: 5 },
      ]),
      Dette.aggregate([
        { $match: { createdAt: dansJour } },
        { $group: { _id: null, nb: { $sum: 1 }, total: { $sum: '$montantInitial' } } },
      ]),
      Dette.aggregate([
        { $unwind: '$paiements' },
        { $match: { 'paiements.date': dansJour, 'paiements.avoir': { $ne: true } } },
        { $group: { _id: null, nb: { $sum: 1 }, total: { $sum: '$paiements.montant' } } },
      ]),
      Dette.aggregate([
        { $match: { statut: 'EN_COURS' } },
        { $group: { _id: null, nb: { $sum: 1 }, total: { $sum: '$montantRestant' },
            enRetard: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: '$dateEcheance' }, 'date'] }, { $lt: ['$dateEcheance', debut] }] }, 1, 0] } } } },
      ]),
      Mouvement.countDocuments({ type: 'entree', createdAt: dansJour }),
      Produit.find({ actif: true, quantiteStock: 0 }).select('nom unite').sort({ nom: 1 }).limit(10).lean(),
      Produit.find({ actif: true, quantiteStock: { $gt: 0 }, $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] } })
        .select('nom unite quantiteStock seuilAlerte').sort({ quantiteStock: 1 }).limit(10).lean(),
      Produit.aggregate([
        { $match: { actif: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantiteStock', '$prixAchat'] } } } },
      ]),
    ]);

    const nbVentes = parMode.reduce((s, m) => s + m.nb, 0);
    const ca = parMode.reduce((s, m) => s + m.total, 0);
    const [nbRuptures, nbFaibles] = await Promise.all([
      Produit.countDocuments({ actif: true, quantiteStock: 0 }),
      Produit.countDocuments({ actif: true, quantiteStock: { $gt: 0 }, $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] } }),
    ]);

    // Dépenses et bénéfice (si le calcul échoue, le rapport reste disponible sans ces lignes)
    let finances = null;
    try {
      const c = await _calculerJour(jour);
      finances = { depenses: c.depenses.total, nbDepenses: c.depenses.liste.length, beneficeBrut: c.beneficeBrut, beneficeNet: c.beneficeNet, credit: c.ventes.credit };
    } catch (e) { console.error('⚠️ Rapport : finances indisponibles', e.message); }

    res.json({
      success: true,
      data: {
        finances,
        date: jour,
        estAujourdhui: jour === aujourdhui,
        ventes: {
          nb: nbVentes,
          ca,
          panierMoyen: nbVentes ? Math.round(ca / nbVentes) : 0,
          remises: parMode.reduce((s, m) => s + m.remises, 0),
          parMode: parMode.map((m) => ({ mode: m._id, nb: m.nb, total: m.total })),
          annulees: { nb: annulees[0]?.nb || 0, total: annulees[0]?.total || 0 },
          caVeille: totalVeille[0]?.total || 0,
          nbVeille: totalVeille[0]?.nb || 0,
        },
        topProduits: topProduits.map((p) => ({ nom: p.nom, unite: p.unite, quantite: p.quantite, montant: p.montant })),
        dettes: {
          nouvelles: { nb: dettesNouvelles[0]?.nb || 0, total: dettesNouvelles[0]?.total || 0 },
          encaisse: { nb: encaissements[0]?.nb || 0, total: encaissements[0]?.total || 0 },
          enCours: { nb: dettesEnCours[0]?.nb || 0, total: dettesEnCours[0]?.total || 0, enRetard: dettesEnCours[0]?.enRetard || 0 },
        },
        stock: {
          entrees: mouvEntrees,
          nbRuptures, ruptures: ruptures.map((p) => p.nom),
          nbFaibles, faibles: faibles.map((p) => ({ nom: p.nom, quantite: p.quantiteStock, unite: p.unite })),
          valeurStock: valeurStock[0]?.total || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
