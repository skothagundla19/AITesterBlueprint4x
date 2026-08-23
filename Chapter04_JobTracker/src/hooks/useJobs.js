import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAllJobs,
  putJob,
  deleteJob as dbDeleteJob,
  getAllResumes,
  addResumeName,
  replaceAllData,
} from '../db.js'

export const STATUSES = [
  { id: 'wishlist', label: 'Wishlist', hint: 'Roles worth keeping an eye on' },
  { id: 'applied', label: 'Applied', hint: 'Applications in motion' },
  { id: 'followup', label: 'Follow-up', hint: 'Keep the conversation warm' },
  { id: 'interview', label: 'Interview', hint: 'Rounds and conversations' },
  { id: 'offer', label: 'Offer', hint: 'Good news territory' },
  { id: 'rejected', label: 'Rejected', hint: 'Closed applications' },
]

function uid() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [allJobs, allResumes] = await Promise.all([getAllJobs(), getAllResumes()])
      if (cancelled) return
      setJobs(allJobs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)))
      setResumes(allResumes)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addJob = useCallback(
    async (input) => {
      const status = input.status || 'wishlist'
      const positionsInColumn = jobs.filter((j) => j.status === status)
      const maxPos = positionsInColumn.length
        ? Math.max(...positionsInColumn.map((j) => j.position ?? 0))
        : -1
      const job = {
        id: uid(),
        company: input.company.trim(),
        title: input.title.trim(),
        url: input.url?.trim() || '',
        resume: input.resume?.trim() || '',
        dateApplied: input.dateApplied || todayISO(),
        followUpDate: input.followUpDate || '',
        salary: input.salary?.trim() || '',
        notes: input.notes?.trim() || '',
        status,
        position: maxPos + 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await putJob(job)
      if (job.resume) await addResumeName(job.resume)
      setJobs((prev) => [...prev, job])
      if (job.resume && !resumes.includes(job.resume)) {
        setResumes((prev) => [...prev, job.resume])
      }
      return job
    },
    [jobs, resumes]
  )

  const updateJob = useCallback(
    async (id, patch) => {
      const existing = jobs.find((j) => j.id === id)
      if (!existing) return
      const updated = { ...existing, ...patch, updatedAt: Date.now() }
      await putJob(updated)
      if (updated.resume) await addResumeName(updated.resume)
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
      if (updated.resume && !resumes.includes(updated.resume)) {
        setResumes((prev) => [...prev, updated.resume])
      }
    },
    [jobs, resumes]
  )

  const removeJob = useCallback(async (id) => {
    await dbDeleteJob(id)
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  const moveJob = useCallback(async (id, newStatus, newPosition) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === id)
      if (!job) return prev

      const withoutJob = prev.filter((j) => j.id !== id)
      const destItems = withoutJob
        .filter((j) => j.status === newStatus)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      const clampedIndex = Math.max(0, Math.min(newPosition, destItems.length))
      destItems.splice(clampedIndex, 0, { ...job, status: newStatus })

      const renumbered = destItems.map((j, idx) => ({ ...j, position: idx }))
      const renumberedMap = new Map(renumbered.map((j) => [j.id, j]))

      const next = withoutJob.map((j) => renumberedMap.get(j.id) || j)
      next.push(renumbered.find((j) => j.id === id))

      // Persist the moved job and any reordered siblings in the destination column.
      renumbered.forEach((j) => {
        putJob(j).catch(() => {})
      })

      return next
    })
  }, [])

  const importData = useCallback(async (data) => {
    const importedJobs = Array.isArray(data?.jobs) ? data.jobs : []
    const importedResumes = Array.isArray(data?.resumes) ? data.resumes : []
    await replaceAllData({ jobs: importedJobs, resumes: importedResumes })
    setJobs(importedJobs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)))
    setResumes(importedResumes)
  }, [])

  const exportData = useCallback(() => {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      jobs,
      resumes,
    }
  }, [jobs, resumes])

  const jobsByStatus = useMemo(() => {
    const map = {}
    for (const s of STATUSES) map[s.id] = []
    for (const job of jobs) {
      if (!map[job.status]) map[job.status] = []
      map[job.status].push(job)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    }
    return map
  }, [jobs])

  return {
    jobs,
    jobsByStatus,
    resumes,
    loading,
    addJob,
    updateJob,
    removeJob,
    moveJob,
    importData,
    exportData,
  }
}
