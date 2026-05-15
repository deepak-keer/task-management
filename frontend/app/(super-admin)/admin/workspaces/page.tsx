'use client';

import { useGetAllWorkspacesQuery, useArchiveWorkspaceMutation, useDeleteWorkspaceMutation } from '../../../../services/allApis';
import { Skeleton, EmptyState, Button } from '../../../../components/ui/index';
import { Building2, Archive, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRelative } from '../../../../lib/utils';

export default function WorkspacesPage() {
  const { data: projects = [], isLoading } = useGetAllWorkspacesQuery();
  const [archive] = useArchiveWorkspaceMutation();
  const [deleteWs] = useDeleteWorkspaceMutation();

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this project?')) return;
    try { await archive(id).unwrap(); toast.success('Project archived'); }
    catch { toast.error('Failed to archive'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this project and all its tasks?')) return;
    try { await deleteWs(id).unwrap(); toast.success('Project deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspaces</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage all projects across the system</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Project</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Owner</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Members</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
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
              {!isLoading && (projects as Array<{ _id: string; name: string; description: string; owner: { name: string }; members: unknown[]; isArchived: boolean; createdAt: string }>).map((p) => (
                <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!p.isArchived && (
                        <button onClick={() => handleArchive(p._id)} title="Archive"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(p._id)} title="Delete permanently"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && projects.length === 0 && (
          <EmptyState icon={<Building2 className="w-8 h-8" />} title="No projects" description="Projects created by users will appear here." />
        )}
      </div>
    </div>
  );
}
