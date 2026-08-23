import { useRef } from 'react'
import { BarChart3, Briefcase, Download, Plus, Upload } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'

export default function Header({ onAdd, onExport, onImportFile, onOpenInsights, theme, onToggleTheme }) {
  const fileInputRef = useRef(null)

  const ghostBtn =
    'inline-flex items-center gap-1.5 rounded-lg border border-line dark:border-line-dark px-3 py-2 text-sm font-medium text-ink dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'

  return (
    <header className="border-b border-line dark:border-line-dark bg-paper/90 dark:bg-base-dark/90 backdrop-blur px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white dark:bg-accent-dark dark:text-base-dark">
            <Briefcase size={17} />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-base font-bold tracking-tight text-ink dark:text-slate-100">
              JobTracker
            </h1>
            <span className="block text-[11px] text-muted dark:text-muted-dark">Personal command center</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <button type="button" onClick={onOpenInsights} className={ghostBtn}>
            <BarChart3 size={15} />
            <span className="hidden sm:inline">Insights</span>
          </button>

          <button type="button" onClick={onExport} className={ghostBtn}>
            <Download size={15} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button type="button" onClick={() => fileInputRef.current?.click()} className={ghostBtn}>
            <Upload size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImportFile(file)
              e.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 dark:bg-accent-dark dark:text-base-dark dark:hover:bg-accent-dark/90"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add job</span>
          </button>
        </div>
      </div>
    </header>
  )
}
