'use client';

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, Edit2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import TaskCard from './TaskCard';
import { TaskCard as TaskCardType } from '../../store/slices/boardSlice';
import { cn } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';

interface Column { id: string; name: string; order: number; color: string; archived?: boolean; }

export default function KanbanColumn({
  column,
  tasks,
  projectId,
  onAddTask,
  canManageColumns = false,
  onEditColumn,
  onDeleteColumn,
  onArchiveColumn,
  onOpenTask,
  onQuickCreateTask,
}: {
  column: Column;
  tasks: TaskCardType[];
  projectId: string;
  onAddTask?: () => void;
  canManageColumns?: boolean;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (column: Column, taskCount: number) => void;
  onArchiveColumn?: (column: Column) => void;
  onOpenTask?: (taskId: string) => void;
  onQuickCreateTask?: (columnId: string, title: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column:${column.id}`,
    disabled: !canManageColumns,
  });
  const canCreatePermission = usePermission('create_tasks');
  const canCreate = canCreatePermission;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!menuOpen) return;

    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  const submitQuickTask = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || !onQuickCreateTask) return;
    setSaving(true);
    try {
      await onQuickCreateTask(column.id, nextTitle);
      setTitle('');
      setIsAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        'flex h-full min-h-0 w-[292px] flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-100/80 p-2 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/55 dark:shadow-xl dark:shadow-black/10',
        isDragging && 'opacity-60'
      )}
    >
      {/* Column header */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'relative mb-2 flex items-center gap-2 rounded-lg px-2 py-2',
          canManageColumns && 'cursor-grab active:cursor-grabbing hover:bg-white/70 dark:hover:bg-slate-900',
        )}
        onContextMenu={(event) => {
          if (!canManageColumns) return;
          event.preventDefault();
          setMenuOpen(true);
        }}
      >
        {canManageColumns && <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-400" />}
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex-1 truncate">{column.name}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-full px-2 py-0.5 font-medium">
          {tasks.length}
        </span>
        {menuOpen && (
          <div
            className="absolute left-2 top-9 z-40 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEditColumn?.(column);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onArchiveColumn?.(column);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDeleteColumn?.(column, tasks.length);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className={cn(
          'scrollbar-hide min-h-[200px] flex-1 overflow-y-auto rounded-xl p-2 space-y-2 transition-colors',
          isOver
            ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset dark:bg-blue-950/40'
            : 'bg-white/55 dark:bg-slate-950/40'
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} projectId={projectId} onOpen={onOpenTask} />
        ))}
      </div>

      {/* Add task */}
      {canCreate && (
        <div className="mt-2 flex-shrink-0">
          {isAdding ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitQuickTask();
              }}
              className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <textarea
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitQuickTask();
                  }
                  if (event.key === 'Escape') {
                    setIsAdding(false);
                    setTitle('');
                  }
                }}
                rows={2}
                autoFocus
                placeholder="Task title"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setTitle('');
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                if (onQuickCreateTask) setIsAdding(true);
                else onAddTask?.();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
