'use client';

import Link from 'next/link';
import {
  useGetAllWorkspacesQuery,
  useArchiveWorkspaceMutation,
  useRestoreWorkspaceMutation,
  useDeleteWorkspaceMutation,
} from '../../../../services/allApis';
import { Skeleton, EmptyState } from '../../../../components/ui/index';
import AnnouncementCenter from '../../../../components/announcements/AnnouncementCenter';
import { usePermission } from '../../../../hooks/usePermission';
import { Building2, Archive, Trash2, Users, Columns3, FolderOpen, ExternalLink, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRelative } from '../../../../lib/utils';

type WorkspaceProject = {
  _id: string;
  name: string;
  description: string;
  owner: { name: string };
  members: unknown[];
  columns?: Array<{ id: string; name: string; color: string; archived?: boolean }>;
  isArchived: boolean;
  createdAt: string;
};

export default function WorkspacesPage() {
  const { data: projects = [], isLoading } = useGetAllWorkspacesQuery();
  const canViewWorkspaces = usePermission('view_workspaces');
  const canManageWorkspaces = usePermission('manage_workspaces');
  const [archive] = useArchiveWorkspaceMutation();
  const [restore] = useRestoreWorkspaceMutation();
  const [deleteWs] = useDeleteWorkspaceMutation();
  const workspaces = projects as WorkspaceProject[];
  const activeWorkspaces = workspaces.filter((workspace) => !workspace.isArchived);
  const archivedWorkspaces = workspaces.filter((workspace) => workspace.isArchived);
  const workspaceTableColumnCount = canManageWorkspaces ? 6 : 5;
  const memberCount = new Set(
    workspaces.flatMap((workspace) =>
      (workspace.members || []).map((member) =>
        typeof member === 'object' && member && '_id' in member ? String((member as { _id: string })._id) : String(member),
      ),
    ),
  ).size;

  const handleArchive = async (id: string) => {
    if (!canManageWorkspaces) {
      toast.error('You do not have permission to manage workspaces');
      return;
    }
    if (!confirm('Archive this workspace?')) return;
    try { await archive(id).unwrap(); toast.success('Workspace archived'); }
    catch { toast.error('Failed to archive'); }
  };

  const handleRestore = async (id: string) => {
    if (!canManageWorkspaces) {
      toast.error('You do not have permission to manage workspaces');
      return;
    }
    try { await restore(id).unwrap(); toast.success('Workspace restored'); }
    catch { toast.error('Failed to restore'); }
  };

  const handleDelete = async (id: string) => {
    if (!canManageWorkspaces) {
      toast.error('You do not have permission to manage workspaces');
      return;
    }
    if (!confirm('Permanently delete this workspace and all its tasks?')) return;
    try { await deleteWs(id).unwrap(); toast.success('Workspace deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  if (!canViewWorkspaces) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Workspace access disabled</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your role does not have permission to view workspace controls.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-slate-400" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Workspaces</h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Manage workspace health, boards, members, announcements, and moderation.
              </p>
            </div>
          </div>
        </div>

        <div className="grid border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40 sm:grid-cols-4">
          {[
            { label: 'Active', value: activeWorkspaces.length, icon: Building2 },
            { label: 'Archived', value: archivedWorkspaces.length, icon: Archive },
            { label: 'Members', value: memberCount, icon: Users },
            { label: 'Boards', value: workspaces.length, icon: Columns3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Workspace Overview</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Recently active workspaces and board structure.</p>
            </div>
            <FolderOpen className="h-5 w-5 text-slate-400" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            {!isLoading && activeWorkspaces.slice(0, 4).map((workspace) => (
              <Link key={workspace._id} href={`/projects/${workspace._id}`} className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{workspace.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{workspace.owner?.name || 'No owner'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Active
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                </div>
                <div className="mt-4 flex gap-1.5">
                  {(workspace.columns || []).filter((column) => !column.archived).slice(0, 5).map((column) => (
                    <span key={column.id} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: column.color }} />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {workspace.members?.length || 0}</span>
                  <span>{formatRelative(workspace.createdAt)}</span>
                </div>
              </Link>
            ))}
            {!isLoading && activeWorkspaces.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyState icon={<Building2 className="w-8 h-8" />} title="No active workspaces" description="Active workspaces will appear here." />
              </div>
            )}
          </div>
        </section>

        <AnnouncementCenter />
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
        {!isLoading && workspaces.map((p) => (
          <div key={p._id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span>Owner: {p.owner?.name || '—'}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.members?.length || 0}</span>
                  <span>{formatRelative(p.createdAt)}</span>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${p.isArchived ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                {p.isArchived ? 'Archived' : 'Active'}
              </span>
            </div>
            {canManageWorkspaces && (
            <div className="mt-4 flex justify-end gap-2">
              {!p.isArchived && (
                <button onClick={() => handleArchive(p._id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  <Archive className="h-4 w-4" /> Archive
                </button>
              )}
              {p.isArchived && (
                <button onClick={() => handleRestore(p._id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <RotateCcw className="h-4 w-4" /> Restore
                </button>
              )}
              <button onClick={() => handleDelete(p._id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
            )}
          </div>
        ))}
        {!isLoading && projects.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <EmptyState icon={<Building2 className="w-8 h-8" />} title="No workspaces" description="Workspaces created by users will appear here." />
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Workspace</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Owner</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Members</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                {canManageWorkspaces && <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: workspaceTableColumnCount }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && workspaces.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p._id}`} className="inline-flex items-center gap-1 font-medium text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                      {p.name}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {p.description && <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{p.owner?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5" /> {p.members?.length || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatRelative(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isArchived ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {p.isArchived ? 'Archived' : 'Active'}
                    </span>
                  </td>
                  {canManageWorkspaces && <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!p.isArchived && (
                        <button onClick={() => handleArchive(p._id)} title="Archive"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      {p.isArchived && (
                        <button onClick={() => handleRestore(p._id)} title="Restore"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(p._id)} title="Delete permanently"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && projects.length === 0 && (
          <EmptyState icon={<Building2 className="w-8 h-8" />} title="No workspaces" description="Workspaces created by users will appear here." />
        )}
      </div>
    </div>
  );
}
