import { X } from 'lucide-react';

/**
 * Modal générique.
 *
 * <Modal open={open} onClose={...} title="Titre" subtitle="Optionnel" footer={<>...</>}>
 *   contenu
 * </Modal>
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg'
  hideHeader = false,
  children,
}) {
  if (!open) return null;

  const maxWidth = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size] || 'max-w-lg';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${maxWidth}`} onClick={(e) => e.stopPropagation()}>
        {!hideHeader && (title || onClose) && (
          <div className="modal-header">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-indigo-600" />
                </div>
              )}
              <div className="min-w-0">
                {title && <h3 className="font-syne font-bold text-slate-900 truncate">{title}</h3>}
                {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 flex-shrink-0">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="modal-body max-h-[70vh] overflow-y-auto">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
