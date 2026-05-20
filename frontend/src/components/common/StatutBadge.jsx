/**
 * StatutBadge — Affiche le statut d'un produit selon son stock.
 * Utilisé dans : Produits, Dashboard, Alertes
 */
export default function StatutBadge({ produit }) {
  if (produit.quantiteStock === 0)
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">Rupture</span>;
  if (produit.quantiteStock <= produit.seuilAlerte)
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-600">Stock faible</span>;
  return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-600">En stock</span>;
}
