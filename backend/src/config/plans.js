const PLANS = {
  gratuit: {
    nom:              'Gratuit',
    prix:             0,
    devise:           'GNF',
    limites: {
      produits:       50,
      utilisateurs:   2,
      ventesParMois:  200,
    },
    fonctionnalites: {
      export:         false,
      statistiques:   false,
      alertesEmail:   false,
      multiDepot:     false,
    },
  },
  pro: {
    nom:              'Pro',
    prix:             29000,
    devise:           'GNF',
    limites: {
      produits:       -1,      // illimité
      utilisateurs:   10,
      ventesParMois:  -1,
    },
    fonctionnalites: {
      export:         true,
      statistiques:   true,
      alertesEmail:   true,
      multiDepot:     false,
    },
  },
  enterprise: {
    nom:              'Enterprise',
    prix:             -1,      // sur devis
    devise:           'GNF',
    limites: {
      produits:       -1,
      utilisateurs:   -1,
      ventesParMois:  -1,
    },
    fonctionnalites: {
      export:         true,
      statistiques:   true,
      alertesEmail:   true,
      multiDepot:     true,
    },
  },
};

module.exports = PLANS;
