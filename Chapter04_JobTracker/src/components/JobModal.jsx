import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { STATUSES } from '../hooks/useJobs.js'

const emptyForm = {
  company: '',
  title: '',
  url: '',
  resume: '',
  dateApplied: new Date().toISOString().slice(0, 10),
  followUpDate: '',
  salary: '',
  notes: '',
  status: 'wishlist',
}

export default function JobModal({ open, onClose, onSubmit, initialJob, resumes }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setForm(initialJob ? { ...emptyForm, ...initialJob } : emptyForm)
    setErrors({})
    const t = setTimeout(() => firstFieldRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open, initialJob])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const next = {}
    if (!form.company.trim()) next.company = 'Company name is required.'
    if (!form.title.trim()) next.title = 'Job title is required.'
    if (form.url && !/^https?:\/\/.+/i.test(form.url.trim())) {
      next.url = 'Enter a full URL starting with http:// or https://'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  const inputCls =
    'w-full rounded-lg border bg-white dark:bg-base-dark px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted dark:placeholder:text-muted-dark focus:border-accent dark:focus:border-accent-dark'
  const okBorder = 'border-line dark:border-line-dark'
  const errBorder = 'border-red-400 dark:border-red-500'
  const labelCls = 'mb-1 block text-xs font-medium text-muted dark:text-muted-dark'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initialJob ? 'Edit job application' : 'Add job application'}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-paper dark:bg-surface-dark shadow-2xl animate-[slideIn_0.15s_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-line dark:border-line-dark px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent dark:text-accent-dark">
              {initialJob ? 'Edit opportunity' : 'New opportunity'}
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-ink dark:text-slate-100">
              {initialJob ? 'Update this opportunity' : 'Add a job to your pipeline'}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Company name <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstFieldRef}
                type="text"
                value={form.company}
                onChange={setField('company')}
                className={`${inputCls} ${errors.company ? errBorder : okBorder}`}
                placeholder="e.g. Linear"
              />
              {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company}</p>}
            </div>

            <div>
              <label className={labelCls}>
                Role / job title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={setField('title')}
                className={`${inputCls} ${errors.title ? errBorder : okBorder}`}
                placeholder="e.g. Product Designer"
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            <div>
              <label className={labelCls}>Starting status</label>
              <select value={form.status} onChange={setField('status')} className={`${inputCls} ${okBorder}`}>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Resume used</label>
              <input
                type="text"
                list="resume-options"
                value={form.resume}
                onChange={setField('resume')}
                className={`${inputCls} ${okBorder}`}
                placeholder="e.g. SDE_Resume_v3"
              />
              <datalist id="resume-options">
                {resumes.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelCls}>LinkedIn job URL</label>
              <input
                type="url"
                value={form.url}
                onChange={setField('url')}
                className={`${inputCls} ${errors.url ? errBorder : okBorder}`}
                placeholder="https://linkedin.com/jobs/..."
              />
              {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
            </div>

            <div>
              <label className={labelCls}>Date applied</label>
              <input
                type="date"
                value={form.dateApplied}
                onChange={setField('dateApplied')}
                className={`${inputCls} ${okBorder}`}
              />
            </div>

            <div>
              <label className={labelCls}>
                Follow-up date <span className="text-muted/70 dark:text-muted-dark/70">(optional)</span>
              </label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={setField('followUpDate')}
                className={`${inputCls} ${okBorder}`}
              />
            </div>

            <div>
              <label className={labelCls}>
                Salary range <span className="text-muted/70 dark:text-muted-dark/70">(optional)</span>
              </label>
              <input
                type="text"
                value={form.salary}
                onChange={setField('salary')}
                className={`${inputCls} ${okBorder}`}
                placeholder="$150–180K or ₹25–30 LPA"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>
                Notes <span className="text-muted/70 dark:text-muted-dark/70">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={setField('notes')}
                rows={3}
                className={`${inputCls} ${okBorder} resize-none`}
                placeholder="Recruiter, referral, next steps..."
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-line dark:border-line-dark px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted dark:text-muted-dark hover:bg-black/5 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent/90 dark:bg-accent-dark dark:text-base-dark dark:hover:bg-accent-dark/90"
          >
            {initialJob ? 'Save changes' : 'Add to pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}
