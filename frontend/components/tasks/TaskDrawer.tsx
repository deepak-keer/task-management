'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Download,
  MessageSquare,
  Paperclip,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  useAddAttachmentMutation,
  useAddSubtaskMutation,
  useDeleteTaskMutation,
  useGetTaskQuery,
  useToggleSubtaskMutation,
  useUpdateTaskMutation,
} from '../../services/tasksApi';
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useGetUsersQuery,
} from '../../services/allApis';
import { useGetProjectQuery } from '../../services/projectsApi';
import { useAppSelector } from '../../store/index';
import type { TaskCard } from '../../store/slices/boardSlice';
import { usePermission } from '../../hooks/usePermission';
import { Avatar, Button, PriorityBadge } from '../ui/index';
import { cn, formatRelative } from '../../lib/utils';
import toast from 'react-hot-toast';

const TASK_PRIORITIES: TaskCard['priority'][] = ['urgent', 'high', 'medium', 'low'];

export default function TaskDrawer({
  projectId,
  taskId,
  onClose,
}: {
  projectId: string;
  taskId: string | null;
  onClose: () => void;
}) {
  const open = !!taskId;
  const { user } = useAppSelector((s) => s.auth);
  const allTypingUsers = useAppSelector((s) => s.socket.typingUsers);
  const typingUsers = useMemo(
    () => allTypingUsers.filter((typingUser) => typingUser.taskId === taskId),
    [allTypingUsers, taskId],
  );
  const { data: task, isLoading } = useGetTaskQuery(taskId || '', { skip: !taskId });
  const { data: project } = useGetProjectQuery(projectId, { skip: !projectId });
  const { data: comments = [] } = useGetCommentsQuery(taskId || '', { skip: !taskId });
  const { data: users = [] } = useGetUsersQuery();
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();
  const [addAttachment, { isLoading: uploadingAttachment }] = useAddAttachmentMutation();
  const [addSubtask] = useAddSubtaskMutation();
  const [toggleSubtask] = useToggleSubtaskMutation();
  const [createComment, { isLoading: commenting }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const canEditTaskDetails = usePermission('create_tasks');
  const canAssignPermission = usePermission('assign_tasks');
  const canDeleteAnyTask = usePermission('delete_any_task');
  const canDeleteOwnTask = usePermission('delete_own_tasks');
  const canCommentPermission = usePermission('comment_on_tasks');
  const canMove = usePermission('move_tasks');
  const canUploadAttachmentsPermission = usePermission('upload_attachments');

  const [draft, setDraft] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskCard['priority'],
    dueDate: '',
    status: '',
    assigneeId: '',
    labels: '',
  });
  const [commentText, setCommentText] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (!task) return;

    setDraft({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      status: task.status,
      assigneeId: task.assignee?._id || '',
      labels: (task.labels || []).join(', '),
    });
  }, [task]);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const projectColumns = Array.isArray(project?.columns) ? project.columns.filter((column) => !column.archived) : [];
  const assigneeOptions = useMemo(() => {
    const projectMembers = Array.isArray(project?.members) ? project.members : [];
    const activeUsers = users.filter((member) => member.status === 'active' && member.role !== 'super_admin');
    return activeUsers.length > 0 ? activeUsers : projectMembers;
  }, [project?.members, users]);

  if (!open) return null;

  const isMember = user?.role === 'member';
  const isAssignedToCurrentUser = task?.assignee?._id === user?._id;
  const canManageTaskDetails =
    !!task &&
    (isMember
      ? isAssignedToCurrentUser && canEditTaskDetails
      : (user?.role === 'super_admin' || user?.role === 'admin') && canEditTaskDetails);
  const canAssign = !isMember && canAssignPermission;
  const canComment = isMember ? isAssignedToCurrentUser && canCommentPermission : canCommentPermission;
  const canUpdateStatus = isMember ? isAssignedToCurrentUser && canMove : canManageTaskDetails || canMove;
  const canUploadAttachments = isMember ? isAssignedToCurrentUser && canUploadAttachmentsPermission : canUploadAttachmentsPermission;
  const canDeleteTask =
    !!task &&
    (isMember
      ? isAssignedToCurrentUser && canDeleteOwnTask
      : canDeleteAnyTask || task.createdBy?._id === user?._id);
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const completedSubs = subtasks.filter((subtask) => subtask.done).length;
  const progress = subtasks.length > 0 ? Math.round((completedSubs / subtasks.length) * 100) : 0;
  const activityItems = (task?.activityLog || []).slice().reverse();

  const formatFileSize = (size?: number) => {
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const saveTask = async () => {
    if (!task) return;

    const currentDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    const nextLabels = draft.labels
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
    const data: Partial<TaskCard> & { assigneeId?: string | null } = {};

    if (canManageTaskDetails) {
      if (draft.title.trim() && draft.title.trim() !== task.title) data.title = draft.title.trim();
      if (draft.description !== (task.description || '')) data.description = draft.description;
      if (draft.priority !== task.priority) data.priority = draft.priority;
      if (draft.dueDate !== currentDueDate) data.dueDate = draft.dueDate || null;
      if (JSON.stringify(nextLabels) !== JSON.stringify(task.labels || [])) data.labels = nextLabels;
    }

    if (canAssign && draft.assigneeId !== (task.assignee?._id || '')) {
      data.assigneeId = draft.assigneeId || null;
    }

    if (canUpdateStatus && draft.status !== task.status) {
      data.status = draft.status;
      data.column = draft.status;
    }

    if (Object.keys(data).length === 0) return;

    try {
      await updateTask({ id: task._id, data }).unwrap();
      toast.success('Task saved');
    } catch {
      toast.error('Failed to save task');
    }
  };

  const handleAddSubtask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task || !newSubtask.trim()) return;
    try {
      await addSubtask({ taskId: task._id, title: newSubtask.trim() }).unwrap();
      setNewSubtask('');
    } catch {
      toast.error('Failed to add subtask');
    }
  };

  const handleComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task || !commentText.trim()) return;
    try {
      await createComment({ taskId: task._id, text: commentText.trim() }).unwrap();
      setCommentText('');
    } catch {
      toast.error('Failed to comment');
    }
  };

  const handleDeleteTask = async () => {
    if (!task || deleting) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteTask(task._id).unwrap();
      toast.success('Task deleted');
      onClose();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!task || !file) return;
    if (!canUploadAttachments) {
      toast.error('You do not have permission to upload attachments');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Attachment must be 5 MB or smaller');
      return;
    }

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      await addAttachment({ taskId: task._id, url, name: file.name, size: file.size }).unwrap();
      toast.success('Attachment uploaded');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to upload attachment';
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close task" onClick={onClose} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm animate-fade-in" />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl animate-drawer-in will-change-transform dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">Task</p>
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{task?.title || 'Loading task'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !task ? (
          <div className="space-y-4 p-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-28 w-full" />
            <div className="skeleton h-48 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                disabled={!canManageTaskDetails}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-lg font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500 disabled:opacity-80 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                    disabled={!canUpdateStatus}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    {projectColumns.map((column) => (
                      <option key={column.id} value={column.id}>{column.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Priority</span>
                  <select
                    value={draft.priority}
                    onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskCard['priority'] }))}
                    disabled={!canManageTaskDetails}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Assignee</span>
                  <select
                    value={draft.assigneeId}
                    onChange={(event) => setDraft((current) => ({ ...current, assigneeId: event.target.value }))}
                    disabled={!canAssign}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((member) => (
                      <option key={member._id} value={member._id}>{member.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Due date</span>
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                    disabled={!canManageTaskDetails}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Labels</span>
                <input
                  value={draft.labels}
                  onChange={(event) => setDraft((current) => ({ ...current, labels: event.target.value }))}
                  disabled={!canManageTaskDetails}
                  placeholder="design, bug, launch"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  disabled={!canManageTaskDetails}
                  rows={5}
                  placeholder="Add context, acceptance notes, links..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                {task.dueDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {comments.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <Paperclip className="h-3.5 w-3.5" />
                  {task.attachments?.length || 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Subtasks</p>
                  <p className="text-xs text-slate-500">{completedSubs}/{subtasks.length} complete</p>
                </div>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <button
                    key={subtask.id}
                    type="button"
                    onClick={() => toggleSubtask({ taskId: task._id, subtaskId: subtask.id })}
                    disabled={!canManageTaskDetails}
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
                  >
                    <CheckSquare className={cn('h-4 w-4', subtask.done ? 'text-green-400' : 'text-slate-500')} />
                    <span className={cn(subtask.done && 'line-through text-slate-500')}>{subtask.title}</span>
                  </button>
                ))}
                {canManageTaskDetails && (
                  <form onSubmit={handleAddSubtask} className="flex gap-2">
                    <input
                      value={newSubtask}
                      onChange={(event) => setNewSubtask(event.target.value)}
                      placeholder="Add subtask"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <Button type="submit" size="sm" variant="secondary">Add</Button>
                  </form>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attachments</h3>
                    <p className="text-xs text-slate-500">{task.attachments?.length || 0} files</p>
                  </div>
                  {canUploadAttachments && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingAttachment ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleAttachmentUpload}
                        disabled={uploadingAttachment}
                      />
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  {(task.attachments || []).map((attachment, index) => (
                    <a
                      key={`${attachment.name}-${attachment.uploadedAt}-${index}`}
                      href={attachment.url}
                      download={attachment.name}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                    >
                      <Paperclip className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{attachment.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
                      </div>
                      <Download className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    </a>
                  ))}
                  {(task.attachments || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
                      No attachments yet.
                    </div>
                  )}
                  {!canUploadAttachments && (
                    <p className="text-xs text-slate-500">Your role can view attachments but cannot upload new files.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Comments & activity</h3>
                  {typingUsers.length > 0 && <span className="text-xs text-blue-600 dark:text-blue-300">Someone is typing...</span>}
                </div>
                {canComment && (
                  <form onSubmit={handleComment} className="flex gap-2">
                    <input
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Write a comment"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <Button type="submit" size="sm" loading={commenting}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
                <div className="space-y-2">
                  {comments.slice().reverse().map((comment) => (
                    <div key={comment._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-2 flex items-center gap-2">
                        <Avatar name={comment.author.name} avatar={comment.author.avatar} size="xs" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.author.name}</span>
                        <span className="text-xs text-slate-500">{formatRelative(comment.createdAt)}</span>
                        {comment.author._id === user?._id && (
                          <button
                            type="button"
                            onClick={() => deleteComment(comment._id)}
                            className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{comment.text}</p>
                    </div>
                  ))}
                  {activityItems.slice(0, 8).map((log, index) => {
                    const actor = typeof log.performedBy === 'string' ? 'Someone' : log.performedBy.name;
                    return (
                      <div key={`${log.action}-${index}`} className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900/70">
                        {actor} {log.action.replace(/_/g, ' ')} {formatRelative(String(log.performedAt))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          {canDeleteTask ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDeleteTask} loading={deleting}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <Button type="button" size="sm" onClick={saveTask} loading={updating}>
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </aside>
    </div>
  );
}
