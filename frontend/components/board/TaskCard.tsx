'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { MessageSquare, Paperclip, Calendar, CheckSquare } from 'lucide-react';
import { TaskCard as TaskCardType } from '../../store/slices/boardSlice';
import { PriorityBadge, Avatar } from '../ui/index';
import { cn, formatDate, isDueDate } from '../../lib/utils';

export default function TaskCard({
  task,
  projectId,
  isDragging = false,
}: {
  task: TaskCardType;
  projectId: string;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks = task.subtasks.filter((s) => s.done).length;
  const subtaskPct = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;
  const overdue = task.dueDate && isDueDate(task.dueDate) && task.status !== 'done';
  const attachmentCount = task.attachments?.length ?? 0;

  const card = (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-grab active:cursor-grabbing select-none card-enter',
        (isSortableDragging || isDragging) && 'opacity-50 rotate-2 shadow-xl',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all'
      )}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span key={label} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className={cn('text-sm font-medium text-slate-900 dark:text-white leading-snug mb-2', task.status === 'done' && 'line-through text-slate-400')}>
        {task.title}
      </p>

      {/* Priority */}
      <div className="mb-2">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Subtask progress */}
      {task.subtasks.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedSubtasks}/{task.subtasks.length}
            </span>
            <span>{Math.round(subtaskPct)}%</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
    </div>
  );

  if (isDragging) return card;

  return (
    <Link href={`/projects/${projectId}/tasks/${task._id}`} onClick={(e) => e.stopPropagation()}>
      {card}
    </Link>
  );
}
