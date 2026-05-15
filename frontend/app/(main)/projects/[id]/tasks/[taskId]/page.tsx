'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGetTaskQuery, useUpdateTaskMutation, useDeleteTaskMutation, useAddSubtaskMutation, useToggleSubtaskMutation, useWatchTaskMutation, useUnwatchTaskMutation } from '../../../../../../services/tasksApi';
import { useGetCommentsQuery, useCreateCommentMutation, useDeleteCommentMutation, useGetUsersQuery } from '../../../../../../services/allApis';
import { useGetProjectQuery } from '../../../../../../services/projectsApi';
import { useAppSelector } from '../../../../../../store/index';
import type { TaskCard } from '../../../../../../store/slices/boardSlice';
import { usePermission } from '../../../../../../hooks/usePermission';
import { PriorityBadge, Avatar, Button } from '../../../../../../components/ui/index';
import { formatDate, formatRelative } from '../../../../../../lib/utils';
import { ArrowLeft, Eye, EyeOff, Plus, Trash2, Check, Send, Clock, Tag, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const TASK_PRIORITIES: TaskCard['priority'][] = ['urgent', 'high', 'medium', 'low'];

const getActivityMeta = (meta: unknown): { from?: string; to?: string } => {
  if (!meta || typeof meta !== 'object') return {};
  const { from, to } = meta as { from?: unknown; to?: unknown };
  return {
    from: typeof from === 'string' ? from : undefined,
    to: typeof to === 'string' ? to : undefined,
  };
};

type AssignableUser = { _id: string; name: string; avatar?: string; status?: string };

const getActorName = (actor: NonNullable<TaskCard['activityLog']>[number]['performedBy'] | undefined) => {
  if (!actor) return 'Someone';
  return typeof actor === 'string' ? 'Someone' : actor.name;
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string; taskId: string }>();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const typingUsers = useAppSelector((s) => s.socket.typingUsers.filter((t) => t.taskId === params.taskId));

  const { data: task, isLoading } = useGetTaskQuery(params.taskId);
  const { data: project } = useGetProjectQuery(params.id);
  const { data: comments = [] } = useGetCommentsQuery(params.taskId);
  const { data: users = [] } = useGetUsersQuery();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();
  const [addSubtask] = useAddSubtaskMutation();
  const [toggleSubtask] = useToggleSubtaskMutation();
  const [watch] = useWatchTaskMutation();
  const [unwatch] = useUnwatchTaskMutation();
  const [createComment, { isLoading: commenting }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const canEditTaskDetails = usePermission('create_tasks');
  const canAssignPermission = usePermission('assign_tasks');
  const canDeleteAnyTask = usePermission('delete_any_task');
  const canDeleteOwnTask = usePermission('delete_own_tasks');
  const canCommentPermission = usePermission('comment_on_tasks');
  const canWatchPermission = usePermission('watch_tasks');
  const canMove = usePermission('move_tasks');

  const [commentText, setCommentText] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isWatching = task?.watchers?.includes(user?._id || '');

  const handleFieldEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleFieldSave = async (field: string) => {
    if (!task) return;
    try {
      await updateTask({ id: task._id, data: { [field]: editValue } as Record<string, string> }).unwrap();
      setEditingField(null);
      toast.success('Updated!');
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteTask(params.taskId).unwrap();
      toast.success('Task deleted');
      router.push(`/projects/${params.id}`);
    } catch { toast.error('Delete failed'); }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    await addSubtask({ taskId: params.taskId, title: newSubtask }).unwrap();
    setNewSubtask('');
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await createComment({ text: commentText, taskId: params.taskId }).unwrap();
      setCommentText('');
    } catch { toast.error('Comment failed'); }
  };

  const handleWatch = async () => {
    if (isWatching) {
      await unwatch(params.taskId).unwrap();
      toast.success('Unwatched task');
    } else {
      await watch(params.taskId).unwrap();
      toast.success('Watching task');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    );
  }

  if (!task) return <div className="text-center py-20 text-slate-500">Task not found.</div>;

  const assignableUsers: AssignableUser[] = users
    .filter((member) => member.status === 'active' && member.role !== 'super_admin')
    .map((member) => ({
      _id: member._id,
      name: member.name,
      avatar: member.avatar,
      status: member.status,
    }));
  const fallbackMembers: AssignableUser[] = Array.isArray(project?.members) ? project.members : [];
  const assigneeOptions = assignableUsers.length > 0 ? assignableUsers : fallbackMembers;
  const projectColumns = Array.isArray(project?.columns) ? project.columns : [];
  const isMember = user?.role === 'member';
  const isAssignedToCurrentUser = task.assignee?._id === user?._id;
  const canManageTaskDetails =
    isMember
      ? isAssignedToCurrentUser && canEditTaskDetails
      : (user?.role === 'super_admin' || user?.role === 'admin') && canEditTaskDetails;
  const canAssign = !isMember && canAssignPermission;
  const canComment = isMember ? isAssignedToCurrentUser && canCommentPermission : canCommentPermission;
  const canWatch = isMember ? isAssignedToCurrentUser && canWatchPermission : canWatchPermission;
  const canDeleteTask = isMember
    ? isAssignedToCurrentUser && canDeleteOwnTask
    : canDeleteAnyTask || task.createdBy?._id === user?._id;
  const canUpdateStatus =
    isMember ? isAssignedToCurrentUser : canManageTaskDetails || canMove;
  const completionLog = [...(task.activityLog || [])]
    .reverse()
    .find((log) => {
      const meta = getActivityMeta(log.meta);
      return ['done', 'completed'].includes((meta.to || '').toLowerCase());
    });
  const completedSubs = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link href={`/projects/${params.id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to board
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            {editingField === 'title' ? (
              <div className="flex gap-2">
                <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave('title'); if (e.key === 'Escape') setEditingField(null); }}
                  className="flex-1 text-xl font-bold bg-transparent text-slate-900 dark:text-white border-b-2 border-blue-500 focus:outline-none" />
                <Button size="sm" onClick={() => handleFieldSave('title')}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => canManageTaskDetails && handleFieldEdit('title', task.title)}>
                {task.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <PriorityBadge priority={task.priority} />
              {task.labels.map((l) => (
                <span key={l} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">{l}</span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Description</h3>
            {editingField === 'description' ? (
              <div className="space-y-2">
                <textarea rows={5} autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleFieldSave('description')}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="cursor-pointer" onClick={() => canManageTaskDetails && handleFieldEdit('description', task.description || '')}>
                {task.description ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: task.description }} />
                ) : (
                  <p className="text-slate-400 text-sm italic">{canManageTaskDetails ? 'Click to add a description…' : 'No description'}</p>
                )}
              </div>
            )}
          </div>

          {/* Subtasks */}
          {(task.subtasks.length > 0 || canManageTaskDetails) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Subtasks {task.subtasks.length > 0 && `(${completedSubs}/${task.subtasks.length})`}
                </h3>
              </div>
              {task.subtasks.length > 0 && (
                <div className="mb-3">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${task.subtasks.length > 0 ? (completedSubs / task.subtasks.length) * 100 : 0}%` }} />
                  </div>
                  <div className="space-y-2">
                    {task.subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-3">
                        <button disabled={!canManageTaskDetails} onClick={() => canManageTaskDetails && toggleSubtask({ taskId: task._id, subtaskId: sub.id })}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${sub.done ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'}`}>
                          {sub.done && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <span className={`text-sm ${sub.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {canManageTaskDetails && (
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add a subtask…"
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <Button size="sm" type="submit"><Plus className="w-3.5 h-3.5" /></Button>
                </form>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Comments ({comments.length})
            </h3>
            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <Avatar name={comment.author.name} avatar={comment.author.avatar} size="sm" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.author.name}</span>
                      <span className="text-xs text-slate-400">{formatRelative(comment.createdAt)}</span>
                      {comment.author._id === user?._id && (
                        <button onClick={() => deleteComment(comment._id)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{comment.text}</p>
                    {comment.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {comment.reactions.map((r) => (
                          <span key={r.emoji} className="text-xs bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
                            {r.emoji} {r.users.length}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  Someone is typing…
                </div>
              )}
            </div>

            {canComment && (
              <form onSubmit={handleComment} className="flex gap-2">
                <Avatar name={user?.name || ''} avatar={user?.avatar} size="sm" className="flex-shrink-0" />
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment…"
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <Button type="submit" size="sm" loading={commenting} disabled={!commentText.trim()}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            {/* Created by */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <User className="w-3 h-3" /> Created By
              </label>
              <div className="flex items-center gap-2">
                <Avatar name={task.createdBy?.name || 'Unknown'} avatar={task.createdBy?.avatar} size="xs" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{task.createdBy?.name || 'Unknown'}</span>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <User className="w-3 h-3" /> Assignee
              </label>
              {canAssign ? (
                <select
                  value={task.assignee?._id || ''}
                  onChange={async (e) => {
                    await updateTask({ id: task._id, data: { assigneeId: e.target.value || null } }).unwrap();
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              ) : task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar name={task.assignee.name} avatar={task.assignee.avatar} size="xs" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{task.assignee.name}</span>
                </div>
              ) : <span className="text-sm text-slate-400">Unassigned</span>}
            </div>

            {/* Completed by */}
            {completionLog && (
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <Check className="w-3 h-3" /> Completed By
                </label>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {getActorName(completionLog.performedBy)}
                  <span className="block text-xs text-slate-400">{formatRelative(completionLog.performedAt)}</span>
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
              {canManageTaskDetails ? (
                <select
                  value={task.priority}
                  onChange={async (e) => { await updateTask({ id: task._id, data: { priority: e.target.value as TaskCard['priority'] } }).unwrap(); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              ) : <PriorityBadge priority={task.priority} />}
            </div>

            {/* Due date */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Clock className="w-3 h-3" /> Due Date
              </label>
              {canManageTaskDetails ? (
                <input
                  type="date"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={async (e) => { await updateTask({ id: task._id, data: { dueDate: e.target.value || null } }).unwrap(); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : task.dueDate ? (
                <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(task.dueDate)}</span>
              ) : <span className="text-sm text-slate-400">No due date</span>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              {canUpdateStatus ? (
                <select
                  value={task.status}
                  onChange={async (e) => { await updateTask({ id: task._id, data: { status: e.target.value, column: e.target.value } }).unwrap(); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projectColumns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{task.status.replace('_', ' ')}</span>}
            </div>

            {/* Watch */}
            {canWatch && (
              <Button variant={isWatching ? 'secondary' : 'ghost'} size="sm" className="w-full" onClick={handleWatch}>
                {isWatching ? <><EyeOff className="w-3.5 h-3.5" /> Unwatch</> : <><Eye className="w-3.5 h-3.5" /> Watch</>}
              </Button>
            )}

            {/* Delete */}
            {canDeleteTask && (
              <Button variant="danger" size="sm" className="w-full" loading={deleting} onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5" /> Delete Task
              </Button>
            )}
          </div>

          {/* Activity */}
          {task.activityLog && task.activityLog.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Activity</h3>
              <div className="space-y-3">
                {[...task.activityLog].reverse().slice(0, 8).map((log, i) => {
                  const meta = getActivityMeta(log.meta);

                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 capitalize">
                          {(log.action || 'updated').replace('_', ' ')}
                          {meta.from && (
                            <span className="text-slate-400"> from <em>{meta.from}</em> to <em>{meta.to}</em></span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getActorName(log.performedBy)} - {formatRelative(log.performedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
