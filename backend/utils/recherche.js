// Recherche texte tolérante : partielle ("cim" trouve "Ciment"), insensible à la casse
// et aux accents ("beton" trouve "Béton"), et sûre (les caractères spéciaux sont neutralisés).

const GROUPES_ACCENTS = {
  a: 'aàáâãäå', c: 'cç', e: 'eèéêë', i: 'iìíîï',
  n: 'nñ', o: 'oòóôõö', u: 'uùúûü', y: 'yýÿ',
};

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Transforme un mot saisi en motif de regex (chaîne) insensible aux accents.
function motifMot(mot) {
  return [...mot.toLowerCase()].map((c) => {
    const base = Object.keys(GROUPES_ACCENTS).find((k) => GROUPES_ACCENTS[k].includes(c));
    return base ? `[${GROUPES_ACCENTS[base]}${GROUPES_ACCENTS[base].toUpperCase()}]` : echapper(c);
  }).join('');
}

// Construit une condition MongoDB : chaque mot saisi doit se retrouver dans au moins un des champs.
// Renvoie null si la saisie est vide.
function conditionRecherche(texte, champs) {
  const mots = String(texte || '').trim().slice(0, 100).split(/\s+/).filter(Boolean).slice(0, 6);
  if (!mots.length) return null;
  return {
    $and: mots.map((mot) => {
      const re = { $regex: motifMot(mot), $options: 'i' };
      return { $or: champs.map((c) => ({ [c]: re })) };
    }),
  };
}

module.exports = { conditionRecherche };
