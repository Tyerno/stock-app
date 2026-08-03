import { AlertTriangle, Loader } from 'lucide-react';
import Modal from './Modal';

/**
 * Dialogue de confirmation pour les actions sensibles (suppression, désactivation...).
 *
 * <ConfirmDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Supprimer ce produit ?"
 *   message="Cette action est irréversible."
 *   danger
 *   loading={isPending}
 * />
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmer l’action',
  message = 'Cette action est irréversible.',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="btn-secondary">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading} className={danger ? 'btn-danger' : 'btn-primary'}>
            {loading ? <Loader size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle size={18} className={danger ? 'text-red-600' : 'text-amber-600'} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500 mt-1">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
