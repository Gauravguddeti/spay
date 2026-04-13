"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Plus, X, Pencil, Trash2 } from "lucide-react"

// Types - exported for reusability
export interface KanbanTask {
  id: string
  title: string
  description?: string
  labels?: string[]
  assignee?: string
  highlighted?: boolean
  removing?: boolean
}

export interface KanbanColumn {
  id: string
  title: string
  tasks: KanbanTask[]
}

export interface KanbanBoardProps {
  columns: KanbanColumn[]
  onColumnsChange?: (columns: KanbanColumn[]) => void
  onTaskMove?: (taskId: string, fromColumnId: string, toColumnId: string) => void
  onTaskAdd?: (columnId: string, title: string) => void
  onTaskEdit?: (taskId: string) => void
  onTaskDelete?: (taskId: string) => void
  labelColors?: Record<string, string>
  columnColors?: Record<string, string>
  className?: string
  allowAddTask?: boolean
}

const defaultLabelColors: Record<string, string> = {
  research: "bg-pink-500",
  design: "bg-violet-500",
  frontend: "bg-blue-500",
  backend: "bg-emerald-500",
  devops: "bg-amber-500",
  docs: "bg-slate-500",
  urgent: "bg-red-500",
}

const defaultColumnColors: Record<string, string> = {
  backlog: "bg-slate-500",
  todo: "bg-blue-500",
  "in-progress": "bg-amber-500",
  review: "bg-violet-500",
  done: "bg-emerald-500",
}

const statusColorByColumn: Record<string, string> = {
  active: "var(--status-success)",
  paused: "var(--status-warning)",
  cancelled: "var(--status-danger)",
}

export function KanbanBoard({
  columns: initialColumns,
  onColumnsChange,
  onTaskMove,
  onTaskAdd,
  onTaskEdit,
  onTaskDelete,
  labelColors = defaultLabelColors,
  columnColors = defaultColumnColors,
  className,
  allowAddTask = true,
}: KanbanBoardProps) {
  const [columns, setColumns] = React.useState<KanbanColumn[]>(initialColumns)
  
  // Keep columns in sync if props update from outside
  React.useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const [draggedTask, setDraggedTask] = React.useState<{
    task: KanbanTask
    sourceColumnId: string
  } | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)
  const [addingCardTo, setAddingCardTo] = React.useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (addingCardTo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [addingCardTo])

  const handleDragStart = (task: KanbanTask, columnId: string) => {
    setDraggedTask({ task, sourceColumnId: columnId })
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDropTarget(columnId)
  }

  const handleDrop = (targetColumnId: string) => {
    if (!draggedTask || draggedTask.sourceColumnId === targetColumnId) {
      setDraggedTask(null)
      setDropTarget(null)
      return
    }

    const newColumns = columns.map((col) => {
      if (col.id === draggedTask.sourceColumnId) {
        return { ...col, tasks: col.tasks.filter((t) => t.id !== draggedTask.task.id) }
      }
      if (col.id === targetColumnId) {
        return { ...col, tasks: [...col.tasks, draggedTask.task] }
      }
      return col
    })

    setColumns(newColumns)
    onColumnsChange?.(newColumns)
    onTaskMove?.(draggedTask.task.id, draggedTask.sourceColumnId, targetColumnId)
    setDraggedTask(null)
    setDropTarget(null)
  }

  const handleAddCard = (columnId: string) => {
    if (!newCardTitle.trim()) return

    const newTask: KanbanTask = {
      id: `task-${crypto.randomUUID()}`,
      title: newCardTitle.trim(),
      labels: [],
    }

    const newColumns = columns.map((col) => (col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col))

    setColumns(newColumns)
    onColumnsChange?.(newColumns)
    onTaskAdd?.(columnId, newCardTitle.trim())
    setNewCardTitle("")
    setAddingCardTo(null)
  }

  const getColumnColor = (columnId: string) => columnColors[columnId] || "bg-slate-500"
  const getLabelColor = (label: string) => labelColors[label] || "bg-slate-500"

  const getColumnAccentColor = (columnId: string) => statusColorByColumn[columnId] ?? "var(--accent-primary)"

  const getColumnCountStyle = (columnId: string) => ({
    backgroundColor: `color-mix(in srgb, ${getColumnAccentColor(columnId)} 15%, transparent)`,
    borderColor: `color-mix(in srgb, ${getColumnAccentColor(columnId)} 30%, transparent)`,
    color: getColumnAccentColor(columnId),
  })

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-none border p-4 [background:var(--surface-sunken)] [background-image:radial-gradient(circle,var(--border-subtle)_1px,transparent_1px)] [background-size:24px_24px] [border-color:var(--border-subtle)]",
        className,
      )}
    >
      <div className="flex gap-4 pb-2">
        {columns.map((column) => {
          const isDropActive = dropTarget === column.id && draggedTask?.sourceColumnId !== column.id

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={() => handleDrop(column.id)}
              onDragLeave={() => setDropTarget(null)}
              className={cn(
                "min-w-[300px] w-[300px] flex flex-col rounded-none border p-4 transition-all duration-200",
                "[background:var(--surface-raised)] [border-color:var(--border-subtle)]",
                isDropActive
                  ? "border-dashed [border-color:var(--accent-primary-border)] [background:var(--accent-primary-muted)]"
                  : "",
              )}
            >
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-none", getColumnColor(column.id))} />
                  <h2 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-primary)]">{column.title}</h2>
                  <span
                    className="rounded-none border px-2 py-0.5 text-xs font-medium"
                    style={getColumnCountStyle(column.id)}
                  >
                    {column.tasks.length}
                  </span>
                </div>
                <button
                  className="rounded-none p-1 text-[var(--text-muted)] transition-colors hover:[background:var(--surface-overlay)] hover:text-[var(--text-primary)]"
                  aria-label="Column options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Tasks */}
              <div className="flex min-h-[100px] flex-col gap-3">
                {column.tasks.map((task) => {
                  const isDragging = draggedTask?.task.id === task.id

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task, column.id)}
                      onDragEnd={() => setDraggedTask(null)}
                      className={cn(
                        "group cursor-grab rounded-none border p-3 transition-all duration-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200",
                        "[background:var(--surface-raised)] [border-color:var(--border-default)] hover:-translate-y-0.5 hover:[border-color:var(--border-accent)] hover:shadow-[var(--shadow-accent)] active:cursor-grabbing",
                        task.highlighted &&
                          "ring-2 ring-[var(--accent-primary-border)] [background:var(--accent-primary-muted)] motion-safe:animate-[pulse_1.4s_ease-in-out_2]",
                        task.removing && "pointer-events-none scale-[0.98] -translate-y-1 opacity-0",
                        isDragging && "rotate-2 opacity-50",
                      )}
                    >
                      {task.labels && task.labels.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {task.labels.map((label) => (
                            <span
                              key={label}
                              className={cn(
                                "rounded-none border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                getLabelColor(label),
                                "[background:var(--accent-primary-muted)] [border-color:var(--accent-primary-border)] text-[var(--text-accent)]",
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn("text-sm font-semibold text-[var(--text-primary)]", task.description && "mb-1")}>
                          {task.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {onTaskEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTaskEdit(task.id)
                              }}
                              className="p-1 text-[var(--text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:text-[var(--text-primary)]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onTaskDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTaskDelete(task.id)
                              }}
                              className="p-1 text-[var(--text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:text-[var(--status-danger)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {task.description && <p className="mb-2 font-display text-base font-bold text-[var(--text-accent)]">{task.description}</p>}

                      {task.assignee && (
                        <div className="flex justify-end">
                          <div className="flex h-7 w-7 items-center justify-center rounded-none bg-[var(--accent-primary)] text-[11px] font-semibold text-white">
                            {task.assignee}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add Card */}
                {allowAddTask && (
                  <>
                    {addingCardTo === column.id ? (
                      <div className="rounded-none border p-3 [background:var(--surface-raised)] [border-color:var(--border-default)]">
                        <input
                          ref={inputRef}
                          type="text"
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCard(column.id)}
                          placeholder="Enter card title..."
                          className="mb-2 w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddCard(column.id)}
                            className="rounded-none bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
                          >
                            Add Card
                          </button>
                          <button
                            onClick={() => {
                              setAddingCardTo(null)
                              setNewCardTitle("")
                            }}
                            className="rounded-none p-1.5 text-[var(--text-muted)] transition-colors hover:[background:var(--surface-overlay)] hover:text-[var(--text-primary)]"
                            aria-label="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingCardTo(column.id)}
                        className="flex w-full items-center justify-center gap-1 rounded-none p-2 text-sm text-[var(--text-muted)] transition-colors hover:[background:var(--surface-overlay)] hover:text-[var(--text-primary)]"
                      >
                        <Plus className="h-4 w-4" />
                        Add a card
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
