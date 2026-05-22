'use client';

import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ClipboardList, Search, UserRoundCheck } from 'lucide-react';
import { useGetUserTaskOverviewQuery } from '../../../../services/allApis';
import { Avatar, PriorityBadge, RoleBadge, Skeleton } from '../../../../components/ui/index';
import { cn, formatDate } from '../../../../lib/utils';
import type { TaskCard } from '../../../../store/slices/boardSlice';

const getProjectName = (task: TaskCard) => {
  if (task.project && typeof task.project === 'object') return task.project.name || 'Untitled board';
  return 'Unknown board';
};

const isOverdue = (task: TaskCard) => {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate).getTime() < Date.now();
};

export default function UserTasksOverviewPage() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetUserTaskOverviewQuery(selectedUserId ? { userId: selectedUserId } : undefined);

  const users = data?.users || [];
  const tasks = data?.tasks || [];
  const columns = data?.columns || [];
  const summary = data?.summary;
  const selectedUser = users.find((user) => user._id === selectedUserId);
  const searchTerm = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(searchTerm));
  }, [searchTerm, users]);

  const tasksByColumn = useMemo(() => {
    const grouped = new Map<string, TaskCard[]>();
    for (const task of tasks) {
      const key = task.column || task.status || 'unknown';
      grouped.set(key, [...(grouped.get(key) || []), task]);
    }
    for (const [key, taskList] of Array.from(grouped.entries())) {
      grouped.set(
        key,
        [...taskList].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title)),
      );
    }
    return grouped;
  }, [tasks]);

  const visibleColumns = useMemo(() => {
    const knownColumnIds = new Set(columns.map((column) => column.id));
    const missingColumns = Array.from(tasksByColumn.keys())
      .filter((columnId) => !knownColumnIds.has(columnId))
      .map((columnId) => ({
        id: columnId,
        name: columnId.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        color: '#64748b',
        order: 999,
        count: tasksByColumn.get(columnId)?.length || 0,
      }));

    return [...columns, ...missingColumns].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [columns, tasksByColumn]);

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Task Board</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {selectedUser ? `${selectedUser.name}'s tasks and progress` : 'All assigned tasks and overall progress'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tasks', value: summary?.totalTasks ?? 0, icon: ClipboardList },
            { label: 'Complete', value: summary?.completedTasks ?? 0, icon: CheckCircle2 },
            { label: 'Overdue', value: summary?.overdueTasks ?? 0, icon: Calendar },
            { label: 'Progress', value: `${summary?.progress ?? 0}%`, icon: UserRoundCheck },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-[116px] rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-h-0 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedUserId('')}
              className={cn(
                'mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                selectedUserId
                  ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
              )}
            >
              <span>All users</span>
              <span>{users.reduce((total, user) => total + user.taskCount, 0)}</span>
            </button>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <div className="max-h-[calc(100vh-280px)] space-y-1 overflow-y-auto p-2">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-lg p-3">
                  <Skeleton className="h-9 w-full" />
                </div>
              ))
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => setSelectedUserId(user._id)}
                  className={cn(
                    'w-full rounded-lg p-3 text-left transition-colors',
                    selectedUserId === user._id
                      ? 'bg-blue-50 dark:bg-blue-500/15'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/70',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} avatar={user.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{user.taskCount} tasks</span>
                    <span>{user.progress}% done</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${user.progress}%` }} />
                  </div>
                </button>
              ))
            )}
            {!isLoading && filteredUsers.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-slate-400">No users found.</p>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100/80 p-3 dark:border-slate-700 dark:bg-slate-950/40">
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="w-[292px] flex-shrink-0 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  <Skeleton className="mb-4 h-5 w-28" />
                  <Skeleton className="mb-2 h-28 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : visibleColumns.length === 0 ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No tasks found for this view.
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] gap-3 overflow-x-auto pb-2">
              {visibleColumns.map((column) => {
                const columnTasks = tasksByColumn.get(column.id) || [];
                return (
                  <div key={column.id} className="flex w-[292px] flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-2 flex items-center gap-2 px-2 py-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: column.color }} />
                      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{column.name}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {columnTasks.map((task) => (
                        <div key={task._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-white">{task.title}</p>
                            <PriorityBadge priority={task.priority} />
                          </div>
                          <p className="mb-3 truncate text-xs text-slate-500 dark:text-slate-400">{getProjectName(task)}</p>
                          <div className="flex items-center gap-2">
                            {task.assignee ? (
                              <>
                                <Avatar name={task.assignee.name} avatar={task.assignee.avatar} size="xs" />
                                <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{task.assignee.name}</span>
                              </>
                            ) : (
                              <span className="flex-1 text-xs text-slate-400">Unassigned</span>
                            )}
                            {task.dueDate && (
                              <span className={cn('text-[10px]', isOverdue(task) ? 'text-red-500' : 'text-slate-400')}>
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400 dark:border-slate-700">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
