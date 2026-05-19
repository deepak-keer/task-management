'use client';

import { useDroppable } from '@dnd-kit/core';
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
  onColumnDragStart,
  onColumnDrop,
}: {
  column: Column;
  tasks: TaskCardType[];
  projectId: string;
  onAddTask: () => void;
  canManageColumns?: boolean;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (column: Column, taskCount: number) => void;
  onArchiveColumn?: (column: Column) => void;
  onColumnDragStart?: (columnId: string) => void;
  onColumnDrop?: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const canCreatePermission = usePermission('create_tasks');
  const canCreate = canCreatePermission;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <div className="flex h-full min-h-0 w-[272px] flex-shrink-0 flex-col">
      {/* Column header */}
      <div
        className={cn(
          'relative mb-3 flex items-center gap-2 rounded-lg px-1 py-1',
          canManageColumns && 'cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-800',
        )}
        draggable={canManageColumns}
        onDragStart={() => onColumnDragStart?.(column.id)}
        onDragOver={(event) => {
          if (canManageColumns) event.preventDefault();
        }}
        onDrop={() => onColumnDrop?.(column.id)}
        onContextMenu={(event) => {
          if (!canManageColumns) return;
          event.preventDefault();
          setMenuOpen(true);
        }}
      >
        {canManageColumns && <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-400" />}
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm flex-1 truncate">{column.name}</h3>
        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5 font-medium">
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
            ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 ring-inset'
            : 'bg-slate-100/60 dark:bg-slate-800/50'
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} projectId={projectId} />
        ))}
      </div>

      {/* Add task */}
      {canCreate && (
        <button
          onClick={onAddTask}
          className="mt-2 flex w-full flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          Add task
        </button>
      )}
    </div>
  );
}
