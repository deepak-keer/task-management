'use client';

import { useState } from 'react';
import {
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetAnnouncementsQuery,
  useGetUsersQuery,
} from '../../services/allApis';
import { useAppSelector } from '../../store/index';
import { usePermission } from '../../hooks/usePermission';
import { Skeleton } from '../ui/index';
import { Megaphone, Pin, Plus, Send, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

type TargetType = 'all' | 'role' | 'users';
type TargetRole = 'super_admin' | 'admin' | 'member';

const targetLabel = (targetType: TargetType, targetRole: TargetRole | null, recipients: unknown[]) => {
  if (targetType === 'role') return targetRole === 'member' ? 'Members' : targetRole === 'admin' ? 'Admins' : 'Super admins';
  if (targetType === 'users') return `${recipients.length} selected`;
  return 'Everyone';
};

export default function AnnouncementCenter({ managed = true }: { managed?: boolean }) {
  const { user } = useAppSelector((state) => state.auth);
  const canTargetSuperAdmin = user?.role === 'super_admin';
  const canManageAnnouncements = usePermission('manage_announcements');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    tone: 'info',
    pinned: true,
    targetType: 'all' as TargetType,
    targetRole: 'member' as TargetRole,
    recipients: [] as string[],
  });

  const { data: announcements = [], isLoading } = useGetAnnouncementsQuery({ limit: 8, managed });
  const { data: users = [] } = useGetUsersQuery();
  const [createAnnouncement, { isLoading: creating }] = useCreateAnnouncementMutation();
  const [deleteAnnouncement] = useDeleteAnnouncementMutation();

  const activeUsers = users.filter((item) => item.status === 'active');
  const allowedRoles: TargetRole[] = canTargetSuperAdmin ? ['member', 'admin', 'super_admin'] : ['member', 'admin'];

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Add a title and message');
      return;
    }

    if (form.targetType === 'users' && form.recipients.length === 0) {
      toast.error('Choose at least one recipient');
      return;
    }

    try {
      await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        tone: form.tone,
        pinned: form.pinned,
        targetType: form.targetType,
        targetRole: form.targetType === 'role' ? form.targetRole : null,
        recipients: form.targetType === 'users' ? form.recipients : [],
      }).unwrap();
      setForm({ title: '', body: '', tone: 'info', pinned: true, targetType: 'all', targetRole: 'member', recipients: [] });
      setShowForm(false);
      toast.success('Announcement sent');
    } catch {
      toast.error('Failed to send announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try { await deleteAnnouncement(id).unwrap(); toast.success('Announcement deleted'); }
    catch { toast.error('Failed to delete announcement'); }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Announcements</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Send updates to everyone, a role, or selected people.</p>
        </div>
        {canManageAnnouncements && (
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:bg-slate-700 dark:hover:text-blue-400"
            title={showForm ? 'Close announcement form' : 'New announcement'}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>

      {showForm && canManageAnnouncements && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Announcement title"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <textarea
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            placeholder="Write the update..."
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select
              value={form.targetType}
              onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value as TargetType }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Everyone</option>
              <option value="role">Specific role</option>
              <option value="users">Selected people</option>
            </select>

            {form.targetType === 'role' && (
              <select
                value={form.targetRole}
                onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value as TargetRole }))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {allowedRoles.map((role) => (
                  <option key={role} value={role}>{role.replace('_', ' ')}</option>
                ))}
              </select>
            )}

            {form.targetType === 'users' && (
              <select
                multiple
                value={form.recipients}
                onChange={(event) => {
                  const recipients = Array.from(event.target.selectedOptions).map((option) => option.value);
                  setForm((current) => ({ ...current, recipients }));
                }}
                className="min-h-24 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:col-span-2"
              >
                {activeUsers.map((item) => (
                  <option key={item._id} value={item._id}>{item.name} ({item.role})</option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={form.tone}
              onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="alert">Alert</option>
            </select>
            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                className="h-3.5 w-3.5 accent-blue-600"
              />
              Pinned
            </label>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {creating ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        {!isLoading && announcements.map((announcement) => (
          <div key={announcement._id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{announcement.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {targetLabel(announcement.targetType || 'all', announcement.targetRole, announcement.recipients || [])}
                  </span>
                  {announcement.pinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  )}
                </div>
              </div>
              {canManageAnnouncements && (
                <button
                  type="button"
                  onClick={() => handleDelete(announcement._id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Delete announcement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{announcement.body}</p>
          </div>
        ))}
        {!isLoading && announcements.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No announcements yet.
          </p>
        )}
      </div>
    </section>
  );
}
