'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAddSubtaskMutation,
  useDeleteTaskMutation,
  useGetTaskQuery,
  useToggleSubtaskMutation,
  useUnwatchTaskMutation,
  useUpdateTaskMutation,
  useWatchTaskMutation,
} from '../../../../../../services/tasksApi';
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useGetUsersQuery,
} from '../../../../../../services/allApis';
import { useGetProjectQuery } from '../../../../../../services/projectsApi';
import { useAppSelector } from '../../../../../../store/index';
import type { TaskCard } from '../../../../../../store/slices/boardSlice';
import { usePermission } from '../../../../../../hooks/usePermission';
import { Avatar, Button, PriorityBadge } from '../../../../../../components/ui/index';
import { formatDate, formatRelative } from '../../../../../../lib/utils';
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const TASK_PRIORITIES: TaskCard['priority'][] = ['urgent', 'high', 'medium', 'low'];

type AssignableUser = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  status?: string;
};

type TimelineItem =
  | {
      id: string;
      type: 'comment';
      createdAt: string;
      author: { _id: string; name: string; avatar: string };
      text: string;
    }
  | {
      id: string;
      type: 'activity';
      createdAt: string;
      actor: string;
      text: string;
    };

const getActivityMeta = (meta: unknown): { from?: string; to?: string } => {
  if (!meta || typeof meta !== 'object') return {};
  const { from, to } = meta as { from?: unknown; to?: unknown };
  return {
    from: typeof from === 'string' ? from : undefined,
    to: typeof to === 'string' ? to : undefined,
  };
};

const getActorName = (actor: NonNullable<TaskCard['activityLog']>[number]['performedBy'] | undefined) => {
  if (!actor) return 'Someone';
  return typeof actor === 'string' ? 'Someone' : actor.name;
};

const formatStatus = (status: string) => status.replace(/_/g, ' ');

export default function TaskDetailPage() {
  const params = useParams<{ id: string; taskId: string }>();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const typingUsers = useAppSelector((s) => s.socket.typingUsers.filter((t) => t.taskId === params.taskId));
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const { data: task, isLoading } = useGetTaskQuery(params.taskId, { skip: isDeletingTask });
  const { data: project } = useGetProjectQuery(params.id);
  const { data: comments = [] } = useGetCommentsQuery(params.taskId, { skip: isDeletingTask });
  const { data: users = [] } = useGetUsersQuery();
  const [updateTask, { isLoading: updatingTask }] = useUpdateTaskMutation();
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
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [draft, setDraft] = useState<{
    title: string;
    assigneeId: string;
    priority: TaskCard['priority'];
    dueDate: string;
    status: string;
  }>({
    title: '',
    assigneeId: '',
    priority: 'medium',
    dueDate: '',
    status: '',
  });

  const isWatching = task?.watchers?.includes(user?._id || '');

  useEffect(() => {
    if (!task) return;

    setDraft({
      title: task.title,
      assigneeId: task.assignee?._id || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      status: task.status,
    });
    setDescriptionDraft(task.description || '');
  }, [task]);

  if (isLoading || isDeletingTask) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="skeleton h-14 w-full" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  if (!task) return <div className="text-center py-20 text-slate-500">Task not found.</div>;

  const assignableUsers: AssignableUser[] = users
    .filter((member) => member.status === 'active' && member.role !== 'super_admin')
    .map((member) => ({
      _id: member._id,
      name: member.name,
      email: member.email,
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
  const canUpdateStatus = isMember ? isAssignedToCurrentUser : canManageTaskDetails || canMove;
  const currentDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
  const completedSubs = task.subtasks.filter((s) => s.done).length;
  const progress = task.subtasks.length > 0 ? Math.round((completedSubs / task.subtasks.length) * 100) : 0;
  const selectedAssignee =
    assigneeOptions.find((m) => m._id === draft.assigneeId) ||
    users.find((m) => m._id === draft.assigneeId) ||
    fallbackMembers.find((m) => m._id === draft.assigneeId) ||
    (task.assignee
      ? {
          _id: task.assignee._id,
          name: task.assignee.name,
          avatar: task.assignee.avatar,
        }
      : null);
  const filteredAssignees = assigneeOptions.filter((member) => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return true;
    return member.name.toLowerCase().includes(query) || (member.email || '').toLowerCase().includes(query);
  });
  const isHeaderDirty =
    draft.title.trim() !== task.title ||
    draft.assigneeId !== (task.assignee?._id || '') ||
    draft.priority !== task.priority ||
    draft.dueDate !== currentDueDate ||
    draft.status !== task.status;
  const isDescriptionDirty = descriptionDraft !== (task.description || '');
  const watcherUsers = task.watchers
    .map((id) => users.find((member) => member._id === id))
    .filter(Boolean) as AssignableUser[];
  const commentItems: TimelineItem[] = comments.map((comment) => ({
    id: comment._id,
    type: 'comment',
    createdAt: comment.createdAt,
    author: comment.author,
    text: comment.text,
  }));
  const activityItems: TimelineItem[] = (task.activityLog || []).map((log, index) => {
    const meta = getActivityMeta(log.meta);
    const action = (log.action || 'updated').replace(/_/g, ' ');
    const detail = meta.from ? ` from ${meta.from} to ${meta.to}` : '';

    return {
      id: `activity-${index}`,
      type: 'activity',
      createdAt: String(log.performedAt),
      actor: getActorName(log.performedBy),
      text: `${action}${detail}`,
    };
  });
  const timelineItems = [...commentItems, ...activityItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const resetHeaderDraft = () => {
    setDraft({
      title: task.title,
      assigneeId: task.assignee?._id || '',
      priority: task.priority,
      dueDate: currentDueDate,
      status: task.status,
    });
  };

  const handleHeaderSave = async () => {
    const data: Partial<TaskCard> & { assigneeId?: string | null } = {};

    if (canManageTaskDetails && draft.title.trim() && draft.title.trim() !== task.title) {
      data.title = draft.title.trim();
    }

    if (canAssign && draft.assigneeId !== (task.assignee?._id || '')) {
      data.assigneeId = draft.assigneeId || null;
    }

    if (canManageTaskDetails) {
      if (draft.priority !== task.priority) data.priority = draft.priority;
      if (draft.dueDate !== currentDueDate) data.dueDate = draft.dueDate || null;
    }

    if (canUpdateStatus && draft.status !== task.status) {
      data.status = draft.status;
      data.column = draft.status;
    }

    if (Object.keys(data).length === 0) return;

    try {
      await updateTask({ id: task._id, data }).unwrap();
      setAssigneePickerOpen(false);
      toast.success('Task saved');
    } catch {
      toast.error('Failed to save task');
      resetHeaderDraft();
    }
  };

  const handleDescriptionSave = async () => {
    if (!isDescriptionDirty) return;

    try {
      await updateTask({ id: task._id, data: { description: descriptionDraft } }).unwrap();
      toast.success('Description saved');
    } catch {
      toast.error('Failed to save description');
      setDescriptionDraft(task.description || '');
    }
  };

  const handleDelete = async () => {
    if (isDeletingTask || deleting) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setIsDeletingTask(true);
    try {
      await deleteTask(params.taskId).unwrap();
      toast.success('Task deleted');
      router.replace(`/projects/${params.id}`);
    } catch {
      setIsDeletingTask(false);
      toast.error('Delete failed');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    try {
      await addSubtask({ taskId: params.taskId, title: newSubtask.trim() }).unwrap();
      setNewSubtask('');
    } catch {
      toast.error('Failed to add subtask');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await createComment({ text: commentText.trim(), taskId: params.taskId }).unwrap();
      setCommentText('');
    } catch {
      toast.error('Comment failed');
    }
  };

  const handleWatch = async () => {
    try {
      if (isWatching) {
        await unwatch(params.taskId).unwrap();
        toast.success('Unwatched task');
      } else {
        await watch(params.taskId).unwrap();
        toast.success('Watching task');
      }
    } catch {
      toast.error('Watch update failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto -mt-2">
      <div className="sticky top-14 z-10 -mx-6 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/projects/${params.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title="Back to board"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <input
            value={draft.title}
            disabled={!canManageTaskDetails}
            onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
            className="min-w-56 flex-1 bg-transparent text-lg font-semibold text-slate-950 outline-none placeholder:text-slate-400 disabled:cursor-default dark:text-white"
          />

          {canUpdateStatus ? (
            <select
              value={draft.status}
              onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {projectColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {formatStatus(task.status)}
            </span>
          )}

          {canManageTaskDetails ? (
            <select
              value={draft.priority}
              onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value as TaskCard['priority'] }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <PriorityBadge priority={task.priority} />
          )}

          <div className="relative">
            <button
              type="button"
              disabled={!canAssign}
              onClick={() => setAssigneePickerOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-default dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {selectedAssignee ? (
                <>
                  <Avatar name={selectedAssignee.name} avatar={selectedAssignee.avatar} size="xs" />
                  <span className="max-w-32 truncate">{selectedAssignee.name}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unassigned</span>
                </>
              )}
            </button>

            {assigneePickerOpen && (
              <div className="absolute right-0 top-11 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft((current) => ({ ...current, assigneeId: '' }));
                    setAssigneePickerOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                    <X className="h-3 w-3" />
                  </span>
                  Unassigned
                </button>
                <div className="max-h-64 overflow-auto">
                  {filteredAssignees.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({ ...current, assigneeId: member._id }));
                        setAssigneePickerOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Avatar name={member.name} avatar={member.avatar} size="xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {member.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{member.email || 'Email not available'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            size="sm"
            loading={updatingTask}
            disabled={!isHeaderDirty || updatingTask}
            onClick={handleHeaderSave}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </Button>

          {canWatch && (
            <Button variant={isWatching ? 'secondary' : 'ghost'} size="sm" onClick={handleWatch}>
              {isWatching ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          )}

          {canDeleteTask && (
            <Button variant="danger" size="sm" loading={deleting || isDeletingTask} onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-10">
          <section className="border-b border-slate-200 pb-8 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Description</h2>
              {canManageTaskDetails && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!isDescriptionDirty || updatingTask}
                    onClick={() => setDescriptionDraft(task.description || '')}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    loading={updatingTask}
                    disabled={!isDescriptionDirty || updatingTask}
                    onClick={handleDescriptionSave}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
            {canManageTaskDetails ? (
              <textarea
                rows={7}
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                placeholder="Write context, decisions, links, and acceptance notes..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            ) : task.description ? (
              <div
                className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            ) : (
              <p className="text-sm text-slate-400">No description</p>
            )}
          </section>

          {(task.subtasks.length > 0 || canManageTaskDetails) && (
            <section className="border-b border-slate-200 pb-8 dark:border-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Checklist</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {completedSubs} of {task.subtasks.length} complete
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">{progress}%</span>
              </div>
              {task.subtasks.length > 0 && (
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              <div className="space-y-1">
                {task.subtasks.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    disabled={!canManageTaskDetails}
                    onClick={() => canManageTaskDetails && toggleSubtask({ taskId: task._id, subtaskId: sub.id })}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100 disabled:hover:bg-transparent dark:hover:bg-slate-800"
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                        sub.done ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {sub.done && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className={`text-sm ${sub.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
              {canManageTaskDetails && (
                <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add checklist item..."
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <Button size="sm" type="submit">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </form>
              )}
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Timeline</h2>
            </div>
            {canComment && (
              <form onSubmit={handleComment} className="mb-6 flex gap-3">
                <Avatar name={user?.name || ''} avatar={user?.avatar} size="sm" className="flex-shrink-0" />
                <div className="flex-1">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment or update..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <Button type="submit" size="sm" loading={commenting} disabled={!commentText.trim()}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}
            <div className="space-y-5">
              {timelineItems.map((item) =>
                item.type === 'comment' ? (
                  <div key={item.id} className="flex gap-3">
                    <Avatar name={item.author.name} avatar={item.author.avatar} size="sm" className="mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{item.author.name}</span>
                        <span className="text-xs text-slate-400">{formatRelative(item.createdAt)}</span>
                        {item.author._id === user?._id && (
                          <button
                            type="button"
                            onClick={() => deleteComment(item.id)}
                            className="ml-auto text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{item.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div>
                      <p className="text-sm capitalize text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{item.actor}</span> {item.text}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatRelative(item.createdAt)}</p>
                    </div>
                  </div>
                ),
              )}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                  Someone is typing...
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-5 text-sm">
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Creator</p>
                <div className="flex items-center gap-2">
                  <Avatar name={task.createdBy?.name || 'Unknown'} avatar={task.createdBy?.avatar} size="xs" />
                  <span className="truncate text-slate-700 dark:text-slate-200">{task.createdBy?.name || 'Unknown'}</span>
                </div>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Clock className="h-3 w-3" /> Due date
                </p>
                {canManageTaskDetails ? (
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => setDraft((current) => ({ ...current, dueDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                ) : task.dueDate ? (
                  <span className="text-slate-700 dark:text-slate-200">{formatDate(task.dueDate)}</span>
                ) : (
                  <span className="text-slate-400">No due date</span>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Labels</p>
                {task.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">No labels</span>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Watchers</p>
                {watcherUsers.length > 0 ? (
                  <div className="flex -space-x-2">
                    {watcherUsers.slice(0, 8).map((watcher) => (
                      <Avatar
                        key={watcher._id}
                        name={watcher.name}
                        avatar={watcher.avatar}
                        size="xs"
                        className="ring-2 ring-white dark:ring-slate-900"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">No watchers</span>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
