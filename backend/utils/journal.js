// Journal d'activité : enregistre qui a fait quoi, sans jamais gêner l'action elle-même.
// Si l'écriture dans le journal échoue, l'opération continue normalement.
const Journal = require('../models/Journal');

const MAX_TEXTE = 300;
const coupe = (v) => String(v ?? '').slice(0, MAX_TEXTE);
const GNF = (n) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/ | /g, ' ')} GNF`;

async function tracer({ req, utilisateur, action, entite, entiteId, libelle, details }) {
  try {
    const u = utilisateur || req?.user;
    await Journal.create({
      utilisateur: u ? { id: u._id || u.id, nom: coupe(u.nom), email: coupe(u.email), role: u.role } : undefined,
      action, entite,
      entiteId: entiteId ? String(entiteId) : undefined,
      libelle: coupe(libelle),
      details,
      ip: coupe(req?.ip),
    });
  } catch (err) {
    console.error('⚠️ Journal :', err.message);
  }
}

// Middleware à placer APRÈS proteger/autoriser, juste avant le contrôleur.
//  - charger(req)           (optionnel) lit l'état « avant » (ex. le produit avant modification)
//  - decrire({req,avant,body,statut}) renvoie { libelle, entiteId?, details?, utilisateur?, action? } ou null
// L'écriture n'a lieu que si l'opération a réussi (statut < 400), sauf si `echecs` est fourni.
function journaliser({ action, entite, charger, decrire, echecs }) {
  return async (req, res, next) => {
    let avant = null;
    if (charger) { try { avant = await charger(req); } catch { avant = null; } }
    const envoyer = res.json.bind(res);
    res.json = (body) => {
      try {
        const ok = res.statusCode < 400 && body?.success !== false;
        const d = ok ? decrire({ req, avant, body, statut: res.statusCode })
                     : (echecs ? echecs({ req, avant, body, statut: res.statusCode }) : null);
        if (d) tracer({ req, action, entite, ...d });
      } catch (err) { console.error('⚠️ Journal :', err.message); }
      return envoyer(body);
    };
    next();
  };
}

// Compare deux objets sur une liste de champs : [{ champ, label, avant, apres }]
function differences(avant, apres, champs) {
  const out = [];
  if (!avant || !apres) return out;
  for (const [champ, label] of Object.entries(champs)) {
    const a = avant[champ] ?? '';
    const b = apres[champ] ?? '';
    if (String(a) !== String(b)) out.push({ champ, label, avant: a, apres: b });
  }
  return out;
}

module.exports = { tracer, journaliser, differences, GNF };
