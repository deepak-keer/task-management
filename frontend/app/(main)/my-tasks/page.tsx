"use client";

import { useState } from "react";
import { useGetMyTasksQuery } from "../../../services/tasksApi";
import {
  PriorityBadge,
  SkeletonCard,
  EmptyState,
} from "../../../components/ui/index";
import { formatDate } from "../../../lib/utils";
import { CheckSquare, Filter, SortAsc } from "lucide-react";
import Link from "next/link";

const PRIORITIES = ["urgent", "high", "medium", "low"];
const STATUSES = ["todo", "in_progress", "in_review", "done"];

export default function MyTasksPage() {
  const { data: tasks = [], isLoading } = useGetMyTasksQuery();
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "createdAt">(
    "dueDate",
  );
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "none">(
    "status",
  );

  const filtered = tasks
    .filter(
      (t) =>
        (!filterPriority || t.priority === filterPriority) &&
        (!filterStatus || t.status === filterStatus),
    )
    .sort((a, b) => {
      if (sortBy === "dueDate")
        return (
          new Date(a.dueDate || 0).getTime() -
          new Date(b.dueDate || 0).getTime()
        );
      if (sortBy === "priority")
        return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const grouped: Record<string, typeof tasks> = {};
  if (groupBy === "none") {
    grouped["All"] = filtered;
  } else {
    for (const task of filtered) {
      const key = groupBy === "status" ? task.status : task.priority;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Tasks
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <SortAsc className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="createdAt">Created</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="status">Group: Status</option>
            <option value="priority">Group: Priority</option>
            <option value="none">No grouping</option>
          </select>
        </div>
      </div>

      {/* Task groups */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8" />}
          title="No tasks found"
          description="Adjust your filters or check back later."
        />
      ) : (
        Object.entries(grouped).map(([group, groupTasks]) => (
          <div key={group}>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
              {group.replace("_", " ")}{" "}
              <span className="normal-case font-normal">
                ({groupTasks.length})
              </span>
            </h3>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {groupTasks.map((task) => {
                const projectId =
                  typeof task.project === "string"
                    ? task.project
                    : (task.project as { _id: string })._id;
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== "done";
                return (
                  <Link
                    key={task._id}
                    href={`/projects/${projectId}/tasks/${task._id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === "done" ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-blue-500"}`}
                    />
                    <span
                      className={`flex-1 text-sm font-medium truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}
                    >
                      {task.title}
                    </span>
                    {typeof task.project === "object" && (
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {(task.project as { name: string }).name}
                      </span>
                    )}
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && (
                      <span
                        className={`text-xs flex-shrink-0 ${isOverdue ? "text-red-500 font-medium" : "text-slate-400"}`}
                      >
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
