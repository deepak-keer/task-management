"use client";

import { useAppSelector } from "../../../store/index";
import {
  useGetMyTasksQuery,
  useGetOverdueTasksQuery,
} from "../../../services/tasksApi";
import { useGetProjectsQuery } from "../../../services/projectsApi";
import {
  useGetAdminStatsQuery,
  useGetAllWorkspacesQuery,
  useGetAnnouncementsQuery,
  useGetPendingApprovalsQuery,
} from "../../../services/allApis";
import {
  PriorityBadge,
  Avatar,
  SkeletonCard,
  EmptyState,
} from "../../../components/ui/index";
import { formatDate, getAvatarUrl } from "../../../lib/utils";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  FolderOpen,
  Users,
  Plus,
  Activity,
  BarChart3,
  Building2,
  Megaphone,
  Shield,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { usePermission } from "../../../hooks/usePermission";

export default function DashboardPage() {
  const { user } = useAppSelector((s) => s.auth);
  const canCreateProject = usePermission("create_projects");
  const { data: adminStats, isLoading: adminStatsLoading } = useGetAdminStatsQuery(undefined, {
    skip: user?.role !== "super_admin",
  });
  const { data: workspaces = [] } = useGetAllWorkspacesQuery(undefined, {
    skip: user?.role !== "super_admin",
  });
  const { data: approvals = [] } = useGetPendingApprovalsQuery(undefined, {
    skip: user?.role !== "super_admin",
  });
  const { data: announcements = [] } = useGetAnnouncementsQuery(
    { limit: 3, managed: true },
    { skip: user?.role !== "super_admin" },
  );
  const { data: myTasks = [], isLoading: tasksLoading } = useGetMyTasksQuery();
  const { data: overdueTasks = [] } = useGetOverdueTasksQuery();
  const { data: projects = [], isLoading: projectsLoading } =
    useGetProjectsQuery();

  const dueToday = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const getTaskProjectId = (task: (typeof myTasks)[number]) =>
    typeof task.project === "string" ? task.project : task.project?._id;

  const getTaskHref = (task: (typeof myTasks)[number]) => {
    const projectId = getTaskProjectId(task);
    return projectId ? `/projects/${projectId}/tasks/${task._id}` : "/my-tasks";
  };

  const safeProjects = projects.filter(Boolean);
  const projectById = new Map(safeProjects.map((project) => [project._id, project]));
  const columnByProjectAndId = new Map<string, { name: string; color: string; archived?: boolean }>();

  safeProjects.forEach((project) => {
    project.columns?.forEach((column) => {
      columnByProjectAndId.set(`${project._id}:${column.id}`, column);
    });
  });

  myTasks.forEach((task) => {
    if (task.project && typeof task.project !== "string") {
      const taskProject = task.project;
      taskProject.columns?.forEach((column) => {
        columnByProjectAndId.set(`${taskProject._id}:${column.id}`, column);
      });
    }
  });

  const columnStats = myTasks.reduce<Array<{ key: string; name: string; color: string; count: number }>>(
    (acc, task) => {
      const projectId = getTaskProjectId(task);
      const column = projectId ? columnByProjectAndId.get(`${projectId}:${task.column}`) : undefined;
      const name = column?.name || task.column.replace(/_/g, " ");
      const color = column?.color || "#3b82f6";
      const key = `${projectId || "unknown"}:${task.column}`;
      const existing = acc.find((item) => item.key === key);

      if (existing) existing.count += 1;
      else acc.push({ key, name, color, count: 1 });

      return acc;
    },
    [],
  );

  const activeTasks = myTasks.filter((task) => {
    const projectId = getTaskProjectId(task);
    const project = projectId ? projectById.get(projectId) : undefined;
    const doneColumn = project?.columns?.find((column) => /done|complete/i.test(column.name));
    return task.column !== doneColumn?.id && task.status !== "done";
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (user?.role === "super_admin") {
    const stats = adminStats as
      | {
          users: { total: number; byRole: Array<{ _id: string; count: number }>; newThisWeek: number; activeToday: number };
          projects: { total: number; active: number; archived: number };
          tasks: { total: number; byStatus: Array<{ _id: string; name?: string; count: number }>; byPriority: Array<{ _id: string; count: number }> };
        }
      | undefined;
    const workspaceRows = workspaces as Array<{
      _id: string;
      name?: string;
      owner?: { name?: string };
      members?: unknown[];
      isArchived?: boolean;
      createdAt?: string;
    }>;
    const activeWorkspaces = workspaceRows.filter((workspace) => !workspace.isArchived);
    const archivedWorkspaces = workspaceRows.filter((workspace) => workspace.isArchived);
    const totalMembers = new Set(
      workspaceRows.flatMap((workspace) =>
        (workspace.members || []).map((member) =>
          typeof member === "object" && member && "_id" in member ? String((member as { _id: string })._id) : String(member),
        ),
      ),
    ).size;
    const byRole = stats?.users.byRole || [];
    const maxRoleCount = Math.max(1, ...byRole.map((role) => role.count));
    const completionStatus = stats?.tasks.byStatus.find((status) => /done|complete/i.test(status.name || status._id));
    const completedTasks = completionStatus?.count || 0;
    const completionRate = stats?.tasks.total ? Math.round((completedTasks / stats.tasks.total) * 100) : 0;
    const platformHealth =
      approvals.length > 10 || archivedWorkspaces.length > activeWorkspaces.length
        ? "Needs attention"
        : "Healthy";

    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in sm:space-y-8">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                  <Shield className="h-3.5 w-3.5" />
                  Platform governance
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  Super Admin Control Center
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                  Monitor users, workspaces, announcements, platform health, and system activity from one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/workspaces" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">
                  <Building2 className="h-4 w-4" /> Moderate Workspaces
                </Link>
                <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700">
                  <Users className="h-4 w-4" /> Manage Users
                </Link>
              </div>
            </div>
          </div>
          <div className="grid border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Users", value: stats?.users.total ?? 0, sub: `+${stats?.users.newThisWeek ?? 0} this week`, icon: Users },
              { label: "Workspaces", value: stats?.projects.total ?? workspaceRows.length, sub: `${activeWorkspaces.length} active`, icon: Building2 },
              { label: "Pending Approvals", value: approvals.length, sub: "Need review", icon: UserCheck },
              { label: "Platform Health", value: platformHealth, sub: `${archivedWorkspaces.length} archived`, icon: Activity },
            ].map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="border-b border-slate-200 p-4 dark:border-slate-700 sm:border-r sm:last:border-r-0 lg:border-b-0">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                  <Icon className="h-5 w-5" />
                </div>
                {adminStatsLoading ? <div className="skeleton h-7 w-20" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>}
                <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Workspace Health</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active workspaces, ownership, and participation signals.</p>
              </div>
              <Link href="/admin/workspaces" className="text-sm font-medium text-blue-600 hover:text-blue-500">View all →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Active", value: activeWorkspaces.length },
                { label: "Archived", value: archivedWorkspaces.length },
                { label: "Unique Members", value: totalMembers },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {workspaceRows.slice(0, 5).map((workspace) => (
                <Link key={workspace._id} href={`/projects/${workspace._id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-blue-950/30">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{workspace.name || "Untitled workspace"}</p>
                    <p className="truncate text-xs text-slate-500">{workspace.owner?.name || "No owner"} · {workspace.members?.length || 0} members</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${workspace.isArchived ? "bg-slate-100 text-slate-500 dark:bg-slate-700" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                    {workspace.isArchived ? "Archived" : "Active"}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Announcements</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pinned and recent platform messages.</p>
              </div>
              <Megaphone className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-2">
              {announcements.map((announcement) => (
                <div key={announcement._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="mb-1 flex items-center gap-2">
                    {announcement.pinned && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pinned</span>}
                    <span className="text-xs uppercase text-slate-400">{announcement.tone}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{announcement.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{announcement.body}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                  No announcements yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Platform Usage</h2>
            </div>
            <div className="space-y-4">
              {byRole.map((role) => (
                <div key={role._id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{role._id.replace("_", " ")}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{role.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(role.count / maxRoleCount) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-sm text-slate-500">Task completion signal</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{completionRate}%</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Activity & Security</h2>
            </div>
            <div className="space-y-3">
              {[
                `${approvals.length} pending account approval${approvals.length === 1 ? "" : "s"}`,
                `${stats?.users.activeToday ?? 0} user${stats?.users.activeToday === 1 ? "" : "s"} active today`,
                `${archivedWorkspaces.length} archived workspace${archivedWorkspaces.length === 1 ? "" : "s"} under moderation`,
                `${stats?.tasks.total ?? 0} task records tracked across the platform`,
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Here's what's happening in your workspace today.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateProject && (
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> New Project
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          {
            label: "Due Today",
            value: dueToday.length,
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Overdue",
            value: overdueTasks.length,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-900/20",
          },
          {
            label: "Active Tasks",
            value: activeTasks.length,
            icon: CheckSquare,
            color: "text-yellow-600",
            bg: "bg-yellow-50 dark:bg-yellow-900/20",
          },
          {
            label: "Total Tasks",
            value: myTasks.length,
            icon: CheckSquare,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5"
          >
            <div
              className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Dynamic columns */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700 sm:px-5">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            My Tasks by Column
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {columnStats.length > 0 ? (
            columnStats.map((column) => (
              <div key={column.key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="min-w-0 truncate text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
                    {column.name}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{column.count}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-sm text-slate-500 dark:text-slate-400">
              Assigned tasks will appear here grouped by their project columns.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700 sm:px-5">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                My Tasks
              </h2>
              <Link
                href="/my-tasks"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {tasksLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <SkeletonCard />
                  </div>
                ))}
              {!tasksLoading &&
                myTasks.slice(0, 6).map((task) => (
                  <Link
                    key={task._id}
                    href={getTaskHref(task)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors sm:px-5"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "done" ? "bg-green-500" : "bg-blue-500"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}
                      >
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p
                          className={`text-xs mt-0.5 ${new Date(task.dueDate) < new Date() && task.status !== "done" ? "text-red-500" : "text-slate-400"}`}
                        >
                          {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </Link>
                ))}
              {!tasksLoading && myTasks.length === 0 && (
                <EmptyState
                  icon={<CheckSquare className="w-8 h-8" />}
                  title="No tasks assigned"
                  description="Tasks assigned to you will appear here."
                />
              )}
            </div>
          </div>
        </div>

        {/* Projects */}
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700 sm:px-5">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Projects
              </h2>
              <Link
                href="/projects"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all →
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {projectsLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              {!projectsLoading &&
                safeProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {project.name || "Untitled board"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          {project.members?.length || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              {!projectsLoading && safeProjects.length === 0 && (
                <EmptyState
                  icon={<FolderOpen className="w-6 h-6" />}
                  title="No projects"
                  description="Create or join a project to get started."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overdue tasks warning */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="font-semibold text-red-800 dark:text-red-300">
              {overdueTasks.length} Overdue Task
              {overdueTasks.length !== 1 ? "s" : ""}
            </h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <Link
                key={task._id}
                href={getTaskHref(task)}
                className="flex items-center gap-3 text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="truncate">{task.title}</span>
                {task.dueDate && (
                  <span className="ml-auto text-xs flex-shrink-0">
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
