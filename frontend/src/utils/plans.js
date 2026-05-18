// Plans SaaS - utilisé côté frontend pour afficher les limites
const PLANS = {
  gratuit: {
    nom:    'Gratuit',
    prix:   0,
    devise: 'GNF',
    limites: { produits: 50, utilisateurs: 2, ventesParMois: 200 },
    fonctionnalites: { export: false, statistiques: false, alertesEmail: false },
  },
  pro: {
    nom:    'Pro',
    prix:   29000,
    devise: 'GNF',
    limites: { produits: -1, utilisateurs: 10, ventesParMois: -1 },
    fonctionnalites: { export: true, statistiques: true, alertesEmail: true },
  },
  enterprise: {
    nom:    'Enterprise',
    prix:   -1,
    devise: 'GNF',
    limites: { produits: -1, utilisateurs: -1, ventesParMois: -1 },
    fonctionnalites: { export: true, statistiques: true, alertesEmail: true },
  },
};

export default PLANS;
