'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { TaskCard as TaskCardType } from '../../store/slices/boardSlice';
import { cn } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';

interface Column { id: string; name: string; order: number; color: string; }

export default function KanbanColumn({
  column,
  tasks,
  projectId,
  onAddTask,
}: {
  column: Column;
  tasks: TaskCardType[];
  projectId: string;
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const canCreatePermission = usePermission('create_tasks');
  const canCreate = canCreatePermission;

  return (
    <div className="flex flex-col w-[272px] flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm flex-1">{column.name}</h3>
        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5 font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors',
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
          className="flex items-center gap-2 px-3 py-2 mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm transition-colors w-full"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          Add task
        </button>
      )}
    </div>
  );
}
