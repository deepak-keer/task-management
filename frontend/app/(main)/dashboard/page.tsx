"use client";

import { useAppSelector } from "../../../store/index";
import {
  useGetMyTasksQuery,
  useGetOverdueTasksQuery,
} from "../../../services/tasksApi";
import { useGetProjectsQuery } from "../../../services/projectsApi";
import { useGetRecentlyViewedQuery } from "../../../services/allApis";
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
  Columns3,
} from "lucide-react";
import Link from "next/link";
import { usePermission } from "../../../hooks/usePermission";

export default function DashboardPage() {
  const { user } = useAppSelector((s) => s.auth);
  const canCreateProject = usePermission("create_projects");
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

  const projectById = new Map(projects.map((project) => [project._id, project]));
  const columnByProjectAndId = new Map<string, { name: string; color: string; archived?: boolean }>();

  projects.forEach((project) => {
    project.columns?.forEach((column) => {
      columnByProjectAndId.set(`${project._id}:${column.id}`, column);
    });
  });

  myTasks.forEach((task) => {
    if (typeof task.project !== "string") {
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
          {user?.role === "super_admin" && (
            <Link
              href="/admin/columns"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              <Columns3 className="w-4 h-4" /> Manage Columns
            </Link>
          )}
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
          {user?.role === "super_admin" && (
            <Link href="/admin/columns" className="text-sm text-blue-600 hover:text-blue-500">
              Manage →
            </Link>
          )}
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
                    href={`/projects/${typeof task.project === "string" ? task.project : (task.project as { _id: string })._id}/tasks/${task._id}`}
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
                projects.slice(0, 5).map((project) => (
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
                        {project.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          {project.members.length}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              {!projectsLoading && projects.length === 0 && (
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
                href={`/projects/${typeof task.project === "string" ? task.project : (task.project as { _id: string })._id}/tasks/${task._id}`}
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
