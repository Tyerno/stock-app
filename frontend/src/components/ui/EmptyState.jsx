import { Inbox } from 'lucide-react';

/**
 * <EmptyState
 *   icon={Package}
 *   title="Aucun produit"
 *   description="Commencez par ajouter votre premier produit au catalogue."
 *   action={<button className="btn-primary" onClick={...}>Ajouter un produit</button>}
 * />
 */
export default function EmptyState({ icon: Icon = Inbox, title = 'Aucune donnée', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={26} className="text-slate-400" />
      </div>
      <h3 className="font-syne font-bold text-slate-700 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-4">{description}</p>}
      {action}
    </div>
  );
}
