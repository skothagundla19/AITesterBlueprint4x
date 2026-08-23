export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm rounded-xl2 bg-white dark:bg-surface-dark p-5 shadow-2xl"
      >
        <h3 className="font-display text-base font-medium text-ink dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-muted dark:text-muted-dark">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted dark:text-muted-dark hover:bg-black/5 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
