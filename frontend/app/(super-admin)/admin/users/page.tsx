'use client';

import { useRef, useState } from 'react';
import {
  useGetSuperAdminUsersQuery, useGetPendingApprovalsQuery,
  useApproveUserMutation, useRejectUserMutation,
  useBanUserMutation, useUnbanUserMutation, useDeleteAdminUserMutation,
} from '../../../../services/allApis';
import { Avatar, RoleBadge, StatusBadge, Button, Skeleton } from '../../../../components/ui/index';
import { Search, CheckCircle, XCircle, ShieldBan, Trash2, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRelative } from '../../../../lib/utils';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const pendingActionsRef = useRef(new Set<string>());
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});

  const { data: usersData, isLoading } = useGetSuperAdminUsersQuery({ search, role: roleFilter, status: statusFilter });
  const { data: pending = [] } = useGetPendingApprovalsQuery();
  const [approve] = useApproveUserMutation();
  const [reject] = useRejectUserMutation();
  const [ban] = useBanUserMutation();
  const [unban] = useUnbanUserMutation();
  const [deleteUser] = useDeleteAdminUserMutation();

  const users = usersData?.users ?? [];

  const runUserAction = async (key: string, action: () => Promise<void>) => {
    if (pendingActionsRef.current.has(key)) return;

    pendingActionsRef.current.add(key);
    setPendingActions((current) => ({ ...current, [key]: true }));

    try {
      await action();
    } finally {
      pendingActionsRef.current.delete(key);
      setPendingActions((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const isUserActionPending = (id: string) =>
    Object.keys(pendingActions).some((key) => key.startsWith(`${id}:`));

  const handleApprove = async (id: string) => {
    await runUserAction(`${id}:approve`, async () => {
      try { await approve(id).unwrap(); toast.success('User approved!'); }
      catch { toast.error('Failed to approve user'); }
    });
  };

  const handleReject = async (id: string) => {
    await runUserAction(`${id}:reject`, async () => {
      if (!confirm('Reject this user?')) return;
      try { await reject({ id }).unwrap(); toast.success('User rejected'); }
      catch { toast.error('Failed to reject user'); }
    });
  };

  const handleBan = async (id: string) => {
    await runUserAction(`${id}:ban`, async () => {
      if (!confirm('Ban this user?')) return;
      try { await ban(id).unwrap(); toast.success('User banned'); }
      catch { toast.error('Failed to ban user'); }
    });
  };

  const handleUnban = async (id: string) => {
    await runUserAction(`${id}:unban`, async () => {
      try { await unban(id).unwrap(); toast.success('User unbanned'); }
      catch { toast.error('Failed to unban user'); }
    });
  };

  const handleDelete = async (id: string) => {
    await runUserAction(`${id}:delete`, async () => {
      if (!confirm('Permanently delete this user? This cannot be undone.')) return;
      try { await deleteUser(id).unwrap(); toast.success('User deleted'); }
      catch { toast.error('Failed to delete user'); }
    });
  };

  const displayUsers = activeTab === 'pending' ? pending : users;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{usersData?.total ?? 0} total users</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Users className="w-4 h-4" /> All Users
        </button>
        <button onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Clock className="w-4 h-4" /> Pending
          {pending.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pending.length}</span>
          )}
        </button>
      </div>

      {/* Filters (all tab only) */}
      {activeTab === 'all' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Invited By</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Joined</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && displayUsers.map((u) => {
                const actionPending = isUserActionPending(u._id);

                return (
                <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} avatar={u.avatar} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.invitedBy ? u.invitedBy.name : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatRelative(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(u._id)} title="Approve" disabled={actionPending}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-green-900/20 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(u._id)} title="Reject" disabled={actionPending}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-red-900/20 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {u.status === 'active' && u.role !== 'super_admin' && (
                        <button onClick={() => handleBan(u._id)} title="Ban" disabled={actionPending}
                          className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-orange-900/20 transition-colors">
                          <ShieldBan className="w-4 h-4" />
                        </button>
                      )}
                      {u.status === 'banned' && (
                        <button onClick={() => handleUnban(u._id)} title="Unban" disabled={actionPending}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-green-900/20 transition-colors">
                          Unban
                        </button>
                      )}
                      {u.role !== 'super_admin' && (
                        <button onClick={() => handleDelete(u._id)} title="Delete" disabled={actionPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && displayUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">{activeTab === 'pending' ? 'No pending approvals' : 'No users found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
