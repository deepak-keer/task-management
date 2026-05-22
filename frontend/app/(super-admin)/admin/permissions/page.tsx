'use client';

import { useState, useEffect } from 'react';
import { useGetPermissionsQuery, useUpdatePermissionsMutation, useGetAuditLogQuery } from '../../../../services/allApis';
import { Skeleton, Avatar } from '../../../../components/ui/index';
import { Shield, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRelative } from '../../../../lib/utils';

const FEATURE_GROUPS = [
  {
    title: 'Workspace',
    features: [
      { key: 'view_workspaces', label: 'View Workspaces', desc: 'Can access workspace overview screens' },
      { key: 'manage_workspaces', label: 'Manage Workspaces', desc: 'Can moderate, archive, restore, or delete workspaces' },
      { key: 'invite_members', label: 'Invite Members', desc: 'Can send invite links' },
      { key: 'remove_members', label: 'Remove Members', desc: 'Can remove members from workspace' },
      { key: 'assign_roles', label: 'Assign Roles', desc: 'Can change user roles' },
      { key: 'manage_announcements', label: 'Manage Announcements', desc: 'Can send announcements to roles or selected people' },
    ],
  },
  {
    title: 'Boards & Columns',
    features: [
      { key: 'view_boards', label: 'View Boards', desc: 'Can open board pages' },
      { key: 'view_all_projects', label: 'View All Boards', desc: 'Can see every board instead of assigned/member boards only' },
      { key: 'create_projects', label: 'Create Boards', desc: 'Can create new boards' },
      { key: 'archive_projects', label: 'Archive Boards', desc: 'Can archive boards' },
      { key: 'delete_projects', label: 'Delete Boards', desc: 'Can delete boards permanently' },
      { key: 'manage_board_members', label: 'Manage Board Members', desc: 'Can add or remove board members' },
      { key: 'manage_columns', label: 'Manage Columns', desc: 'Can add, edit, archive, restore, delete, and reorder columns' },
    ],
  },
  {
    title: 'Tasks',
    features: [
      { key: 'create_tasks', label: 'Create Tasks', desc: 'Can create and edit task details' },
      { key: 'move_tasks', label: 'Move Tasks', desc: 'Can drag tasks between columns' },
      { key: 'assign_tasks', label: 'Assign Tasks', desc: 'Can assign tasks to members' },
      { key: 'view_user_task_overview', label: 'View User Task Overview', desc: 'Can review tasks by user and overall task progress' },
      { key: 'delete_own_tasks', label: 'Delete Own Tasks', desc: 'Can delete tasks they created' },
      { key: 'delete_any_task', label: 'Delete Any Task', desc: 'Can delete any task' },
      { key: 'comment_on_tasks', label: 'Comment on Tasks', desc: 'Can leave comments' },
      { key: 'watch_tasks', label: 'Watch Tasks', desc: 'Can subscribe to task updates' },
      { key: 'upload_attachments', label: 'Upload Attachments', desc: 'Can attach files to tasks' },
      { key: 'export_tasks', label: 'Export Tasks', desc: 'Can export task data' },
    ],
  },
  {
    title: 'Analytics',
    features: [
      { key: 'view_analytics', label: 'View Analytics', desc: 'Access to analytics dashboard and productivity charts' },
    ],
  },
];

type AuditLogEntry = {
  feature?: string;
  role?: string;
  oldValue?: boolean;
  newValue?: boolean;
  changedBy?: { name?: string; avatar?: string };
  changedAt?: string;
};

const formatFeatureName = (feature?: string) => feature?.replace(/_/g, ' ') || 'Unknown feature';

type PermissionFeatures = Record<string, boolean>;
type PermissionEntry = PermissionFeatures | { features?: PermissionFeatures };

const getPermissionFeatures = (entry: PermissionEntry): PermissionFeatures => {
  if (
    'features' in entry &&
    entry.features &&
    typeof entry.features === 'object'
  ) {
    return entry.features;
  }

  return entry as PermissionFeatures;
};

export default function PermissionsPage() {
  const { data: permissions, isLoading } = useGetPermissionsQuery();
  const { data: auditLog = [] } = useGetAuditLogQuery();
  const [updatePerms, { isLoading: saving }] = useUpdatePermissionsMutation();

  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [activeTab, setActiveTab] = useState<'permissions' | 'audit'>('permissions');
  const auditEntries: AuditLogEntry[] = Array.isArray(auditLog) ? (auditLog as AuditLogEntry[]) : [];

  useEffect(() => {
    if (permissions) {
      const p: Record<string, Record<string, boolean>> = {};
      for (const [role, data] of Object.entries(permissions)) {
        p[role] = { ...getPermissionFeatures(data) };
      }
      setLocalPerms(p);
    }
  }, [permissions]);

  const handleToggle = async (role: string, feature: string) => {
    const newValue = !localPerms[role]?.[feature];
    setLocalPerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [feature]: newValue },
    }));
    try {
      await updatePerms({ role, features: { [feature]: newValue } }).unwrap();
      toast.success(`Updated ${feature.replace(/_/g, ' ')} for ${role}`);
    } catch {
      // Revert
      setLocalPerms((prev) => ({
        ...prev,
        [role]: { ...prev[role], [feature]: !newValue },
      }));
      toast.error('Failed to update permission');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Permissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure feature access per role. Changes apply instantly to all connected users.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {[{ key: 'permissions', label: 'Role Permissions', icon: Shield }, { key: 'audit', label: 'Audit Log', icon: History }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'permissions' && (
        <div key="permissions-tab" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden tab-panel-transition">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-300 w-1/2">Feature</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">Admin</span>
                  </th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">Member</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-5 py-3 text-center"><Skeleton className="h-5 w-10 mx-auto rounded-full" /></td>
                      <td className="px-5 py-3 text-center"><Skeleton className="h-5 w-10 mx-auto rounded-full" /></td>
                    </tr>
                  ))
                ) : (
                  FEATURE_GROUPS.flatMap((group) => [
                    <tr key={`group-${group.title}`} className="bg-slate-50 dark:bg-slate-700/40">
                      <td colSpan={3} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        {group.title}
                      </td>
                    </tr>,
                    ...group.features.map(({ key, label, desc }) => (
                      <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900 dark:text-white">{label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                        </td>
                        {['admin', 'member'].map((role) => (
                          <td key={role} className="px-5 py-3 text-center">
                            <button
                              onClick={() => handleToggle(role, key)}
                              disabled={saving}
                              className={`relative w-10 rounded-full transition-colors ${localPerms[role]?.[key] ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                              style={{ height: '22px' }}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${localPerms[role]?.[key] ? 'translate-x-[18px]' : ''}`} />
                            </button>
                          </td>
                        ))}
                      </tr>
                    )),
                  ])
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div key="audit-tab" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden tab-panel-transition">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Feature</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Before</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">After</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Changed By</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {auditEntries.map((entry, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white capitalize">{formatFeatureName(entry.feature)}</td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{entry.role || 'Unknown role'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.oldValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {entry.oldValue ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.newValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {entry.newValue ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.changedBy?.name && (
                        <div className="flex items-center gap-2">
                          <Avatar name={entry.changedBy.name} avatar={entry.changedBy.avatar} size="xs" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{entry.changedBy.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatRelative(entry.changedAt)}</td>
                  </tr>
                ))}
                {auditEntries.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No permission changes recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
