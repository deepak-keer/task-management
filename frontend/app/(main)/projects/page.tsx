"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
} from "../../../services/projectsApi";
import { useGetUsersQuery, type AppUser } from "../../../services/allApis";
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

type BoardMember = Pick<AppUser, "_id" | "name" | "email" | "avatar" | "onlineStatus">;

export default function BoardsPage() {
  const router = useRouter();
  const { data: boards = [], isLoading } = useGetProjectsQuery();
  const { data: users = [] } = useGetUsersQuery();
  const [createBoard, { isLoading: creating }] = useCreateProjectMutation();
  const canCreate = usePermission("create_projects");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const canViewBoards = usePermission("view_boards");
  const usersById = useMemo(() => new Map(users.map((user) => [user._id, user])), [users]);

  const getBoardMembers = (members?: Array<Partial<BoardMember> | string>): BoardMember[] => {
    const seen = new Set<string>();
    return (members || [])
      .map((member) => {
        const partial = typeof member === "object" && member ? member : null;
        const id = typeof member === "string" ? member : partial?._id;
        if (!id || seen.has(id)) return null;
        seen.add(id);

        const details = usersById.get(id);
        return {
          _id: id,
          name: partial?.name || details?.name || "Unknown member",
          email: partial?.email || details?.email || "",
          avatar: partial?.avatar || details?.avatar || "",
          onlineStatus: partial?.onlineStatus || details?.onlineStatus || "offline",
        };
      })
      .filter((member): member is BoardMember => !!member);
  };

  const safeBoards = boards.filter(Boolean);
  const filtered = safeBoards.filter((p) => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
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
      await createBoard(form).unwrap();
      toast.success("Board created!");
      setShowCreate(false);
      setForm({ name: "", description: "" });
    } catch {
      toast.error("Failed to create board");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      {!canViewBoards ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8" />}
          title="Boards are disabled"
          description="Your role does not have permission to view boards."
        />
      ) : (
      <>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-slate-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Boards
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {safeBoards.filter((p) => !p.isArchived).length} active boards for your workspace.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Board
          </Button>
        )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search boards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        {(["all", "active", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${filter === f ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex w-fit items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Boards */}
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
          title="No boards found"
          description={
            canCreate
              ? "Create your first board to get started."
              : "No boards available."
          }
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create Board
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        <div key={`grid-${filter}`} className="grid grid-cols-1 gap-4 tab-panel-transition sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((board) => (
            (() => {
              const boardMembers = getBoardMembers(board.members);
              return (
            <Link
              key={board._id}
              href={`/projects/${board._id}`}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  {board.isArchived ? (
                    <Archive className="w-5 h-5 text-slate-400" />
                  ) : (
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                {board.isArchived && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full px-2 py-0.5">
                    Archived
                  </span>
                )}
              </div>
              <h3 className="mb-1 font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white">
                {board.name || "Untitled board"}
              </h3>
              {board.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                  {board.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-auto">
                <div className="flex -space-x-2">
                  {boardMembers.slice(0, 4).map((m) => (
                    <img
                      key={m._id}
                      src={
                        m.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=3b82f6&color=fff&size=32`
                      }
                      alt={m.name || 'Member'}
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="w-3 h-3" />
                  <span>{boardMembers.length}</span>
                </div>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      ) : (
        <div key={`table-${filter}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white tab-panel-transition dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Board</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Members</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((board) => (
                  <tr
                    key={board._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/projects/${board._id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/projects/${board._id}`);
                      }
                    }}
                    className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-700/30 dark:focus:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                          {board.isArchived ? (
                            <Archive className="w-4 h-4 text-slate-400" />
                          ) : (
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white">{board.name || "Untitled board"}</p>
                          {board.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {board.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{board.owner?.name || 'No owner'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{board.members?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${board.isArchived ? "bg-slate-100 dark:bg-slate-700 text-slate-500" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                        {board.isArchived ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatRelative(board.updatedAt)}</td>
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
        title="Create Board"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Board Name
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
              placeholder="What is this board about?"
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
              Create Board
            </Button>
          </div>
        </form>
      </Modal>
      </>
      )}
    </div>
  );
}
