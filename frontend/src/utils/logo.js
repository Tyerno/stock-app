// Prépare un logo choisi par l'admin : vérifie le type, réduit l'image (256 px max) et la ré-encode
// via un canvas. Le ré-encodage supprime tout contenu caché du fichier d'origine.
const TYPES        = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FICHIER  = 5 * 1024 * 1024; // 5 Mo avant réduction
const MAX_CARACTERES = 100000;        // le serveur accepte 120 000

export async function preparerLogo(fichier) {
  if (!fichier || !TYPES.includes(fichier.type)) {
    throw new Error('Format non pris en charge. Choisissez une image PNG, JPG ou WebP.');
  }
  if (fichier.size > MAX_FICHIER) throw new Error('Image trop lourde (5 Mo maximum).');

  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload  = () => ok(i);
      i.onerror = () => ko(new Error("Impossible de lire cette image."));
      i.src = url;
    });
    if (!img.width || !img.height) throw new Error('Image vide ou illisible.');

    const sortie = fichier.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'; // PNG garde la transparence
    for (const cote of [256, 192, 128, 96]) {
      const ratio = Math.min(1, cote / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width  = Math.max(1, Math.round(img.width * ratio));
      c.height = Math.max(1, Math.round(img.height * ratio));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL(sortie, 0.88);
      if (data.length <= MAX_CARACTERES) return data;
    }
    throw new Error('Image trop détaillée. Essayez un logo plus simple.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
