import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowDownAZ, ArrowUpDown } from 'lucide-react'
import JobCard from './JobCard.jsx'

const STAGE_DOT = {
  wishlist: 'bg-stage-wishlist',
  applied: 'bg-stage-applied',
  followup: 'bg-stage-followup',
  interview: 'bg-stage-interview',
  offer: 'bg-stage-offer',
  rejected: 'bg-stage-rejected',
}

const STAGE_BORDER = {
  wishlist: 'border-t-stage-wishlist',
  applied: 'border-t-stage-applied',
  followup: 'border-t-stage-followup',
  interview: 'border-t-stage-interview',
  offer: 'border-t-stage-offer',
  rejected: 'border-t-stage-rejected',
}

export default function Column({ status, jobs, sortMode, onSortModeChange, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })

  const displayJobs = useMemo(() => {
    if (sortMode === 'newest') {
      return [...jobs].sort((a, b) => (b.dateApplied || '').localeCompare(a.dateApplied || ''))
    }
    if (sortMode === 'oldest') {
      return [...jobs].sort((a, b) => (a.dateApplied || '').localeCompare(b.dateApplied || ''))
    }
    return jobs
  }, [jobs, sortMode])

  const cycleSort = () => {
    const next = sortMode === 'manual' ? 'newest' : sortMode === 'newest' ? 'oldest' : 'manual'
    onSortModeChange(status.id, next)
  }

  return (
    <div
      className={`flex h-full w-[280px] shrink-0 flex-col rounded-xl border border-t-2 border-line dark:border-line-dark ${STAGE_BORDER[status.id]} bg-black/[0.015] dark:bg-white/[0.015]`}
    >
      <div className="px-3 pb-2.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_DOT[status.id]}`} />
            <h2 className="truncate text-[13.5px] font-semibold text-ink dark:text-slate-100">{status.label}</h2>
            <span className="shrink-0 rounded-full bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[10.5px] text-muted dark:text-muted-dark">
              {jobs.length}
            </span>
          </div>
          <button
            type="button"
            onClick={cycleSort}
            title={`Sort: ${sortMode}`}
            aria-label={`Change sort order, currently ${sortMode}`}
            className={`shrink-0 rounded p-1 ${sortMode !== 'manual' ? 'text-accent dark:text-accent-dark' : 'text-muted/60 dark:text-muted-dark/60'} hover:text-accent dark:hover:text-accent-dark`}
          >
            {sortMode === 'manual' ? <ArrowUpDown size={13} /> : <ArrowDownAZ size={13} />}
          </button>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted dark:text-muted-dark">{status.hint}</p>
      </div>

      <div
        ref={setNodeRef}
        className={`scrollbar-thin flex-1 space-y-2 overflow-y-auto px-2.5 pb-2.5 transition-colors ${
          isOver ? 'bg-accent-soft/60 dark:bg-accent-dark/10' : ''
        }`}
        style={{ minHeight: 80 }}
      >
        <SortableContext items={displayJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {displayJobs.map((job) => (
            <JobCard key={job.id} job={job} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
        {displayJobs.length === 0 && (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-line dark:border-line-dark px-2 py-6 text-center">
            <p className="text-[12px] text-muted/70 dark:text-muted-dark/70">No roles here yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
