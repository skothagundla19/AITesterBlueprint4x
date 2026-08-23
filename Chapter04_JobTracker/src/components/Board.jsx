import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { STATUSES } from '../hooks/useJobs.js'
import Column from './Column.jsx'
import JobCard from './JobCard.jsx'

export default function Board({ jobsByStatus, onMove, onEdit, onDelete }) {
  const [activeJob, setActiveJob] = useState(null)
  const [sortModes, setSortModes] = useState({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  )

  const findStatusOfJob = (jobId) => {
    for (const status of STATUSES) {
      if (jobsByStatus[status.id]?.some((j) => j.id === jobId)) return status.id
    }
    return null
  }

  const handleDragStart = (event) => {
    const jobId = event.active.id
    for (const status of STATUSES) {
      const found = jobsByStatus[status.id]?.find((j) => j.id === jobId)
      if (found) {
        setActiveJob(found)
        break
      }
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveJob(null)
    if (!over) return

    const activeId = active.id
    const overId = over.id

    const isColumnTarget = STATUSES.some((s) => s.id === overId)
    let newStatus
    let newIndex

    if (isColumnTarget) {
      newStatus = overId
      newIndex = jobsByStatus[newStatus]?.length || 0
    } else {
      newStatus = findStatusOfJob(overId)
      if (!newStatus) return
      const list = jobsByStatus[newStatus] || []
      newIndex = list.findIndex((j) => j.id === overId)
      if (newIndex === -1) newIndex = list.length
    }

    onMove(activeId, newStatus, newIndex)
  }

  const handleSortModeChange = (statusId, mode) => {
    setSortModes((prev) => ({ ...prev, [statusId]: mode }))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveJob(null)}
    >
      <div className="scrollbar-thin flex flex-1 gap-3 overflow-x-auto px-1 pb-4">
        {STATUSES.map((status) => (
          <Column
            key={status.id}
            status={status}
            jobs={jobsByStatus[status.id] || []}
            sortMode={sortModes[status.id] || 'manual'}
            onSortModeChange={handleSortModeChange}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="w-[264px] rotate-1">
            <JobCard job={activeJob} onEdit={() => {}} onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
