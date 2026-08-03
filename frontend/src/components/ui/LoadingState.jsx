/** Bloc skeleton brut : <Skeleton className="h-7 w-64" /> */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

/** Petit spinner inline, pour les boutons/en-têtes de page. */
export function Spinner({ size = 28, className = '' }) {
  return (
    <div
      className={`border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Spinner centré occupant l'espace disponible (remplace les blocs "flex justify-center py-16"). */
export function CenteredSpinner({ size = 28, className = 'py-16' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Spinner size={size} />
    </div>
  );
}

/** Grille de cartes KPI en chargement. */
export function KpiCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}

/** Lignes de tableau en chargement. */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
