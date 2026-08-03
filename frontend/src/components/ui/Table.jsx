import { TableSkeleton } from './LoadingState';
import EmptyState from './EmptyState';

/**
 * <Table columns={['Produit','Stock','Prix','Actions']} loading={isLoading} isEmpty={!data.length}>
 *   {data.map(row => <tr key={row._id}>...</tr>)}
 * </Table>
 *
 * `children` doit être le contenu du <tbody> (les <tr> de chaque page, inchangés).
 */
export default function Table({ columns = [], loading, isEmpty, emptyState, children }) {
  if (loading) {
    return (
      <div className="card p-5">
        <TableSkeleton cols={columns.length || 4} />
      </div>
    );
  }

  if (isEmpty) {
    return <div className="card">{emptyState || <EmptyState title="Aucun résultat" />}</div>;
  }

  return (
    <div className="card table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => {
              const label = typeof c === 'string' ? c : c.label;
              const align = typeof c === 'string' ? 'left' : c.align || 'left';
              return (
                <th key={label} className={align === 'right' ? 'text-right' : undefined}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
