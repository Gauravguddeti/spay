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
      id: `task-${Date.now()}`,
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

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((column) => {
        const isDropActive = dropTarget === column.id && draggedTask?.sourceColumnId !== column.id

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={() => handleDrop(column.id)}
            onDragLeave={() => setDropTarget(null)}
            className={cn(
              "min-w-[280px] w-[280px] flex flex-col rounded-none p-3 transition-all duration-200",
              "bg-muted/50 border-2",
              isDropActive ? "border-primary/50 border-dashed bg-primary/5" : "border-transparent",
            )}
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-none", getColumnColor(column.id))} />
                <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
                <span className="rounded-none bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {column.tasks.length}
                </span>
              </div>
              <button
                className="rounded-none p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Column options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Tasks */}
            <div className="flex min-h-[100px] flex-col gap-2">
              {column.tasks.map((task) => {
                const isDragging = draggedTask?.task.id === task.id

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task, column.id)}
                    onDragEnd={() => setDraggedTask(null)}
                    className={cn(
                      "group cursor-grab rounded-none border border-border bg-card p-3 shadow-sm transition-all duration-150",
                      "hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
                      isDragging && "rotate-2 opacity-50",
                    )}
                  >
                    {task.labels && task.labels.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {task.labels.map((label) => (
                          <span
                            key={label}
                            className={cn(
                              "rounded-none px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white",
                              getLabelColor(label),
                            )}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <h3 className={cn("text-sm font-medium text-card-foreground", task.description && "mb-1")}>
                        {task.title}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onTaskEdit && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskEdit(task.id); }}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onTaskDelete && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onTaskDelete(task.id); }}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {task.description && <p className="mb-2 text-xs text-muted-foreground">{task.description}</p>}

                    {task.assignee && (
                      <div className="flex justify-end">
                        <div className="flex h-7 w-7 items-center justify-center rounded-none bg-primary text-[11px] font-semibold text-primary-foreground">
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
                    <div className="rounded-none border border-border bg-card p-3 shadow-sm">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCard(column.id)}
                        placeholder="Enter card title..."
                        className="mb-2 w-full border-none bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddCard(column.id)}
                          className="rounded-none bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          Add Card
                        </button>
                        <button
                          onClick={() => {
                            setAddingCardTo(null)
                            setNewCardTitle("")
                          }}
                          className="rounded-none p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCardTo(column.id)}
                      className="flex w-full items-center justify-center gap-1 rounded-none p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
  )
}
