// Liste de suggestions de noms (attribut HTML « list » des champs « Nom du client »).
export const ID_LISTE_CLIENTS = 'clients-connus';

export default function ListeClients({ clients }) {
  return (
    <datalist id={ID_LISTE_CLIENTS}>
      {clients.slice(0, 300).map((c) => <option key={c.cle} value={c.nom} />)}
    </datalist>
  );
}
