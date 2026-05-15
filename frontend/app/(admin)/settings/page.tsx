'use client';

import { useState } from 'react';
import { useAppSelector } from '../../../store/index';
import { useGetUsersQuery } from '../../../services/allApis';
import {
  useGetInvitesQuery, useCreateInviteMutation,
  useRevokeInviteMutation, useDeleteInviteMutation,
} from '../../../services/allApis';
import { Button, Avatar, RoleBadge, StatusBadge, Modal } from '../../../components/ui/index';
import { Users, Link2, Plus, Copy, X, Check, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatRelative } from '../../../lib/utils';

export default function SettingsPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: users = [] } = useGetUsersQuery();
  const { data: invites = [] } = useGetInvitesQuery();
  const [createInvite, { isLoading: creating }] = useCreateInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();
  const [deleteInvite] = useDeleteInviteMutation();

  const [inviteForm, setInviteForm] = useState({
    role: 'member',
    expiresIn: '86400',
    maxUses: '-1',
  });

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <div className="text-center py-20 text-slate-500">Access denied.</div>;
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInvite({
        role: inviteForm.role as 'admin' | 'member',
        expiresIn: inviteForm.expiresIn === 'null' ? null : parseInt(inviteForm.expiresIn),
        maxUses: parseInt(inviteForm.maxUses),
      }).unwrap();
      toast.success('Invite link created!');
      setShowCreateInvite(false);
    } catch {
      toast.error('Failed to create invite link');
    }
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabs = [
    { key: 'members', label: 'Members', icon: Users },
    { key: 'invites', label: 'Invite Links', icon: Link2 },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {activeTab === 'members' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Workspace Members ({users.length})</h2>
            <Button size="sm" onClick={() => setShowCreateInvite(true)}>
              <Plus className="w-3.5 h-3.5" /> Invite Member
            </Button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            {users.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={u.name} avatar={u.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <RoleBadge role={u.role} />
                <StatusBadge status={u.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invites tab */}
      {activeTab === 'invites' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Invite Links</h2>
            <Button size="sm" onClick={() => setShowCreateInvite(true)}>
              <Plus className="w-3.5 h-3.5" /> Create Link
            </Button>
          </div>

          {invites.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <Link2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No invite links yet. Create one to invite team members.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {invites.map((invite) => (
                <div key={invite._id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <RoleBadge role={invite.role} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        invite.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        invite.status === 'revoked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700'
                      }`}>{invite.status}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Used {invite.usedCount}{invite.maxUses !== -1 ? `/${invite.maxUses}` : ''} times
                      {invite.expiresAt ? ` · Expires ${formatDate(invite.expiresAt)}` : ' · Never expires'}
                      {' · '}Created {formatRelative(invite.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {invite.status === 'active' && (
                      <button onClick={() => copyLink(invite.token, invite._id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200">
                        {copiedId === invite._id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === invite._id ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                    {invite.status === 'active' && (
                      <button onClick={async () => { await revokeInvite(invite._id); toast.success('Invite revoked'); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                        Revoke
                      </button>
                    )}
                    <button onClick={async () => { await deleteInvite(invite._id); toast.success('Deleted'); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create invite modal */}
      <Modal open={showCreateInvite} onClose={() => setShowCreateInvite(false)} title="Create Invite Link" size="sm">
        <form onSubmit={handleCreateInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
            <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="member">Member</option>
              {user.role === 'super_admin' && <option value="admin">Admin</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Expires In</label>
            <select value={inviteForm.expiresIn} onChange={(e) => setInviteForm({ ...inviteForm, expiresIn: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="3600">1 Hour</option>
              <option value="86400">24 Hours</option>
              <option value="604800">7 Days</option>
              <option value="2592000">30 Days</option>
              <option value="null">Never</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Max Uses</label>
            <select value={inviteForm.maxUses} onChange={(e) => setInviteForm({ ...inviteForm, maxUses: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1">1 use</option>
              <option value="5">5 uses</option>
              <option value="10">10 uses</option>
              <option value="-1">Unlimited</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setShowCreateInvite(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Link</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
