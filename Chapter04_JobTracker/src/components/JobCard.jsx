import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, GripVertical, History, Pencil, Trash2 } from 'lucide-react'
import { daysSince } from '../lib/export.js'

const AVATAR_BG = {
  wishlist: 'bg-stage-wishlist/15 text-stage-wishlist',
  applied: 'bg-stage-applied/15 text-stage-applied',
  followup: 'bg-stage-followup/15 text-stage-followup',
  interview: 'bg-stage-interview/15 text-stage-interview',
  offer: 'bg-stage-offer/15 text-stage-offer',
  rejected: 'bg-stage-rejected/15 text-stage-rejected',
}

export default function JobCard({ job, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { status: job.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const days = daysSince(job.dateApplied)
  const dateLabel = days === null ? '' : days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`
  const initial = (job.company || '?').trim().charAt(0).toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-line dark:border-line-dark bg-white dark:bg-surface-dark p-3 shadow-card hover:shadow-cardHover transition-shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder or move"
            className="shrink-0 cursor-grab touch-none text-muted/50 dark:text-muted-dark/50 hover:text-muted dark:hover:text-muted-dark active:cursor-grabbing"
          >
            <GripVertical size={15} />
          </button>
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${AVATAR_BG[job.status] || 'bg-black/10 text-muted'}`}
          >
            {initial}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {job.notes && (
            <span title={job.notes} className="rounded p-1 text-muted dark:text-muted-dark">
              <History size={13} />
            </span>
          )}
          <button
            type="button"
            onClick={() => onEdit(job)}
            aria-label="Edit job"
            className="rounded p-1 text-muted dark:text-muted-dark hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink dark:hover:text-slate-100"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(job)}
            aria-label="Delete job"
            className="rounded p-1 text-muted dark:text-muted-dark hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-2">
        <p className="truncate text-[13.5px] font-semibold leading-snug text-ink dark:text-slate-100">
          {job.company}
        </p>
        <p className="truncate text-[12.5px] text-muted dark:text-muted-dark">{job.title}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
        <span
          className={`truncate rounded px-1.5 py-0.5 font-mono ${
            job.resume
              ? 'bg-accent-soft text-accent dark:bg-accent-dark/15 dark:text-accent-dark'
              : 'bg-black/5 text-muted/70 dark:bg-white/5 dark:text-muted-dark/70'
          }`}
        >
          {job.resume || 'No resume tagged'}
        </span>
        {dateLabel && (
          <span className="flex shrink-0 items-center gap-1 text-muted dark:text-muted-dark">
            <CalendarDays size={12} />
            {dateLabel}
          </span>
        )}
      </div>
    </div>
  )
}
