'use client';

import { useGetAdminStatsQuery } from '../../../../services/allApis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FolderOpen, CheckSquare, BarChart3 } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/index';

const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6' };
const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e', '#64748b'];

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useGetAdminStatsQuery();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const s = stats as {
    users: { total: number; byRole: Array<{ _id: string; count: number }>; newThisWeek: number; activeToday: number };
    projects: { total: number; active: number; archived: number };
    tasks: { total: number; byStatus: Array<{ _id: string; count: number }>; byPriority: Array<{ _id: string; count: number }> };
  };

  const statCards = [
    { label: 'Total Users', value: s.users.total, sub: `+${s.users.newThisWeek} this week`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active Projects', value: s.projects.active, sub: `${s.projects.archived} archived`, icon: FolderOpen, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Total Tasks', value: s.tasks.total, sub: 'Across all projects', icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Active Today', value: s.users.activeToday, sub: 'Users logged in today', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  const tasksByStatus = s.tasks.byStatus.map((item) => ({
    name: item._id?.replace('_', ' ') || 'Unknown',
    value: item.count,
  }));

  const tasksByPriority = s.tasks.byPriority.map((item) => ({
    name: item._id || 'Unknown',
    value: item.count,
  }));

  const usersByRole = s.users.byRole.map((item) => ({
    name: item._id?.replace('_', ' ') || 'Unknown',
    count: item.count,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Workspace-wide statistics</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-0.5">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Tasks by Status</h2>
          {tasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tasksByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {tasksByStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 py-12 text-sm">No task data yet</p>}
        </div>

        {/* Tasks by priority */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Tasks by Priority</h2>
          {tasksByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tasksByPriority} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {tasksByPriority.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 py-12 text-sm">No priority data yet</p>}
        </div>

        {/* Users by role */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Users by Role</h2>
          {usersByRole.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={usersByRole} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 py-12 text-sm">No user data yet</p>}
        </div>

        {/* Quick summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Workspace Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Users', value: s.users.total },
              { label: 'New Users This Week', value: s.users.newThisWeek },
              { label: 'Active Today', value: s.users.activeToday },
              { label: 'Active Projects', value: s.projects.active },
              { label: 'Archived Projects', value: s.projects.archived },
              { label: 'Total Tasks', value: s.tasks.total },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
