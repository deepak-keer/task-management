'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, Calendar, CheckSquare } from 'lucide-react';
import { TaskCard as TaskCardType } from '../../store/slices/boardSlice';
import { PriorityBadge, Avatar } from '../ui/index';
import { cn, formatDate, isDueDate } from '../../lib/utils';

export default function TaskCard({
  task,
  projectId,
  isDragging = false,
  onOpen,
}: {
  task: TaskCardType;
  projectId: string;
  isDragging?: boolean;
  onOpen?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: task._id,
    disabled: isDragging,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const labels = Array.isArray(task.labels) ? task.labels : [];
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasks.filter((s) => s.done).length;
  const subtaskPct = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
  const overdue = task.dueDate && isDueDate(task.dueDate) && task.status !== 'done';
  const attachmentCount = task.attachments?.length ?? 0;

  void projectId;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(event) => {
        event.stopPropagation();
        if (!isDragging) onOpen?.(task._id);
      }}
      className={cn(
        'block w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm card-enter cursor-grab active:cursor-grabbing select-none dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-black/20',
        isSortableDragging && !isDragging && 'opacity-0',
        isDragging && 'opacity-95 shadow-xl',
        'hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-50 hover:shadow-lg transition-all duration-200 dark:hover:border-blue-500/60 dark:hover:bg-slate-900 dark:hover:shadow-black/25'
      )}
    >
      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.slice(0, 3).map((label) => (
            <span key={label} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className={cn('text-sm font-medium text-slate-900 dark:text-white leading-snug mb-2', task.status === 'done' && 'line-through text-slate-500')}>
        {task.title}
      </p>

      {/* Priority */}
      <div className="mb-2">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Subtask progress */}
      {subtasks.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedSubtasks}/{subtasks.length}
            </span>
            <span>{Math.round(subtaskPct)}%</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${subtaskPct}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2">
        {task.assignee && (
          <Avatar name={task.assignee.name} avatar={task.assignee.avatar} size="xs" />
        )}
        <div className="flex-1" />
        {task.dueDate && (
          <span className={cn('flex items-center gap-1 text-[10px]', overdue ? 'text-red-500' : 'text-slate-400')}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
        {(task._commentCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
            <MessageSquare className="w-3 h-3" />
            {task._commentCount}
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
            <Paperclip className="w-3 h-3" />
            {attachmentCount}
          </span>
        )}
      </div>
    </button>
  );
}
