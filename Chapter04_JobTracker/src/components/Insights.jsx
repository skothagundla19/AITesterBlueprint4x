import { useEffect } from 'react'
import { CheckCircle2, TrendingUp, X, BarChart2 } from 'lucide-react'
import { STATUSES } from '../hooks/useJobs.js'

const STAGE_BAR = {
  wishlist: 'bg-stage-wishlist',
  applied: 'bg-stage-applied',
  followup: 'bg-stage-followup',
  interview: 'bg-stage-interview',
  offer: 'bg-stage-offer',
  rejected: 'bg-stage-rejected',
}

export default function Insights({ open, onClose, jobsByStatus }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const counts = Object.fromEntries(STATUSES.map((s) => [s.id, jobsByStatus[s.id]?.length || 0]))
  const applications = STATUSES.reduce((sum, s) => sum + (s.id === 'wishlist' ? 0 : counts[s.id]), 0)
  const interviewRate = applications ? Math.round((counts.interview / applications) * 100) : 0
  const offerRate = applications ? Math.round((counts.offer / applications) * 100) : 0
  const maxCount = Math.max(1, ...STATUSES.map((s) => counts[s.id]))

  const resumeUsage = {}
  for (const s of STATUSES) {
    for (const job of jobsByStatus[s.id] || []) {
      if (job.resume) resumeUsage[job.resume] = (resumeUsage[job.resume] || 0) + 1
    }
  }
  const resumeEntries = Object.entries(resumeUsage).sort((a, b) => b[1] - a[1])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pipeline insights"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto scrollbar-thin rounded-2xl bg-paper dark:bg-surface-dark shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line dark:border-line-dark px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
              Your search, quantified
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-ink dark:text-slate-100">
              Pipeline insights
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted dark:text-muted-dark hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<TrendingUp size={15} />} label="Applications" value={applications} />
            <StatCard icon={<BarChart2 size={15} />} label="Interview rate" value={`${interviewRate}%`} />
            <StatCard icon={<CheckCircle2 size={15} />} label="Offer rate" value={`${offerRate}%`} />
          </div>

          <p className="mb-2 mt-6 text-[10.5px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
            Status distribution
          </p>
          <div className="space-y-2.5">
            {STATUSES.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-ink dark:text-slate-100">{s.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${STAGE_BAR[s.id]}`}
                    style={{ width: `${(counts[s.id] / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-4 shrink-0 text-right text-xs text-muted dark:text-muted-dark">
                  {counts[s.id]}
                </span>
              </div>
            ))}
          </div>

          <p className="mb-2 mt-6 text-[10.5px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
            Resume usage
          </p>
          {resumeEntries.length === 0 ? (
            <p className="text-xs text-muted dark:text-muted-dark">
              Tag resumes on applications to compare usage here.
            </p>
          ) : (
            <div className="space-y-2">
              {resumeEntries.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-ink dark:text-slate-100">{name}</span>
                  <span className="text-muted dark:text-muted-dark">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-line dark:border-line-dark bg-white dark:bg-base-dark px-3.5 py-3">
      <span className="text-accent dark:text-accent-dark">{icon}</span>
      <p className="mt-2 text-[11px] text-muted dark:text-muted-dark">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-ink dark:text-slate-100">{value}</p>
    </div>
  )
}
