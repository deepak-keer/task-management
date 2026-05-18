"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
} from "../../../services/projectsApi";
import {
  SkeletonCard,
  EmptyState,
  Modal,
  Button,
} from "../../../components/ui/index";
import { usePermission } from "../../../hooks/usePermission";
import { formatRelative } from "../../../lib/utils";
import { FolderOpen, Plus, Users, Archive, Search, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useGetProjectsQuery();
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const canCreate = usePermission("create_projects");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "archived"
          ? p.isArchived
          : !p.isArchived;
    return matchSearch && matchFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await createProject(form).unwrap();
      toast.success("Project created!");
      setShowCreate(false);
      setForm({ name: "", description: "" });
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Projects
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {projects.filter((p) => !p.isArchived).length} active projects
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(["all", "active", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex w-fit items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8" />}
          title="No projects found"
          description={
            canCreate
              ? "Create your first project to get started."
              : "No projects available."
          }
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create Project
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                  {project.isArchived ? (
                    <Archive className="w-5 h-5 text-slate-400" />
                  ) : (
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                {project.isArchived && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full px-2 py-0.5">
                    Archived
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-auto">
                <div className="flex -space-x-2">
                  {project.members.slice(0, 4).map((m) => (
                    <img
                      key={m._id}
                      src={
                        m.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=3b82f6&color=fff&size=32`
                      }
                      alt={m.name}
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="w-3 h-3" />
                  <span>{project.members.length}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Members</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((project) => (
                  <tr
                    key={project._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/projects/${project._id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/projects/${project._id}`);
                      }
                    }}
                    className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-700/30 dark:focus:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                          {project.isArchived ? (
                            <Archive className="w-4 h-4 text-slate-400" />
                          ) : (
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{project.owner.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{project.members.length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${project.isArchived ? "bg-slate-100 dark:bg-slate-700 text-slate-500" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                        {project.isArchived ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatRelative(project.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Project"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Website Redesign"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={3}
              placeholder="What is this project about?"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
