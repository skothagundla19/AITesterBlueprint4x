import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useJobs, STATUSES } from './hooks/useJobs.js'
import { downloadJSON, readJSONFile } from './lib/export.js'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Toolbar from './components/Toolbar.jsx'
import Board from './components/Board.jsx'
import JobModal from './components/JobModal.jsx'
import Insights from './components/Insights.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('job-tracker-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('job-tracker-theme', theme)
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

const defaultFilters = { status: 'all', resume: 'all', reminder: 'all' }

export default function App() {
  const { jobs, jobsByStatus, resumes, loading, addJob, updateJob, removeJob, moveJob, importData, exportData } =
    useJobs()
  const [theme, toggleTheme] = useTheme()
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [modalOpen, setModalOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters(defaultFilters)
      return
    }
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const filteredByStatus = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = {}
    for (const s of STATUSES) {
      result[s.id] = (jobsByStatus[s.id] || []).filter((j) => {
        if (q && !(j.company.toLowerCase().includes(q) || j.title.toLowerCase().includes(q) || (j.resume || '').toLowerCase().includes(q))) {
          return false
        }
        if (filters.status !== 'all' && j.status !== filters.status) return false
        if (filters.resume !== 'all' && j.resume !== filters.resume) return false
        if (filters.reminder === 'upcoming' && !j.followUpDate) return false
        if (filters.reminder === 'overdue') {
          if (!j.followUpDate) return false
          if (new Date(j.followUpDate) >= new Date(new Date().toDateString())) return false
        }
        return true
      })
    }
    return result
  }, [jobsByStatus, search, filters])

  const stats = useMemo(() => {
    const inProgress = jobs.filter((j) => ['applied', 'followup', 'interview'].includes(j.status)).length
    const offers = jobs.filter((j) => j.status === 'offer').length
    return { total: jobs.length, inProgress, offers }
  }, [jobs])

  const openAddModal = () => {
    setEditingJob(null)
    setModalOpen(true)
  }

  const openEditModal = (job) => {
    setEditingJob(job)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (editingJob) {
      await updateJob(editingJob.id, form)
      setToast('Changes saved')
    } else {
      await addJob(form)
      setToast('Application added')
    }
    setModalOpen(false)
    setEditingJob(null)
  }

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return
    await removeJob(pendingDelete.id)
    setPendingDelete(null)
    setToast('Application deleted')
  }

  const handleExport = () => {
    downloadJSON(exportData())
    setToast('Backup downloaded')
  }

  const handleImportFile = async (file) => {
    try {
      const data = await readJSONFile(file)
      await importData(data)
      setToast('Backup imported')
    } catch (err) {
      setToast(err.message || 'Import failed')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper dark:bg-base-dark text-muted dark:text-muted-dark text-sm font-mono">
        Loading your board…
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-paper dark:bg-base-dark">
      <Header
        onAdd={openAddModal}
        onExport={handleExport}
        onImportFile={handleImportFile}
        onOpenInsights={() => setInsightsOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex flex-1 flex-col overflow-hidden px-5">
        <Hero totalRoles={stats.total} inProgress={stats.inProgress} offers={stats.offers} />

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          filters={filters}
          onFilterChange={handleFilterChange}
          resumes={resumes}
        />

        {jobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="font-display text-lg text-ink dark:text-slate-100">Your board is empty</p>
            <p className="max-w-sm text-sm text-muted dark:text-muted-dark">
              Add the first role you're tracking — it'll land in Wishlist until you apply.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 dark:bg-accent-dark dark:text-base-dark"
            >
              Add your first job
            </button>
          </div>
        ) : (
          <>
            <Board jobsByStatus={filteredByStatus} onMove={moveJob} onEdit={openEditModal} onDelete={setPendingDelete} />

            <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line dark:border-line-dark bg-white dark:bg-surface-dark px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent dark:bg-accent-dark/15 dark:text-accent-dark">
                  <ClipboardList size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">Your pipeline starts here</p>
                  <p className="text-xs text-muted dark:text-muted-dark">
                    Add your first opportunity and turn a blank slate into a clear next step.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent/90 dark:bg-accent-dark dark:text-base-dark shrink-0"
              >
                Add your first job
                <Plus size={15} />
              </button>
            </div>
          </>
        )}
      </main>

      <JobModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingJob(null)
        }}
        onSubmit={handleSubmit}
        initialJob={editingJob}
        resumes={resumes}
      />

      <Insights open={insightsOpen} onClose={() => setInsightsOpen(false)} jobsByStatus={jobsByStatus} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this application?"
        message={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.title} at ${pendingDelete.company} from your board.`
            : ''
        }
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-ink dark:bg-white px-4 py-2 text-sm text-white dark:text-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
