"use client";

import { useState } from "react";
import { useGetMyTasksQuery } from "../../../services/tasksApi";
import { useRouter } from "next/navigation";
import { priorityConfig } from "../../../lib/utils";

// Minimal calendar without react-big-calendar dependency issues
type ViewType = "month" | "week";

export default function CalendarPage() {
  const { data: tasks = [], isLoading } = useGetMyTasksQuery();
  const router = useRouter();
  const [view, setView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const tasksWithDue = tasks.filter((t) => t.dueDate);

  // Build calendar days for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to 6 rows
  while (days.length % 7 !== 0) days.push(null);

  const getTasksForDay = (day: number) => {
    return tasksWithDue.filter((t) => {
      const d = new Date(t.dueDate!);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });
  };

  const today = new Date();
  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Calendar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tasks with due dates across all projects
          </p>
        </div>
      </div>

      {/* Calendar controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="font-semibold text-slate-900 dark:text-white min-w-[160px] text-center">
              {monthName}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium"
          >
            Today
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isToday =
              day !== null &&
              today.getDate() === day &&
              today.getMonth() === month &&
              today.getFullYear() === year;
            const dayTasks = day !== null ? getTasksForDay(day) : [];
            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700/50 p-1.5 ${
                  day === null
                    ? "bg-slate-50/50 dark:bg-slate-800/50"
                    : "bg-white dark:bg-slate-800"
                }`}
              >
                {day !== null && (
                  <>
                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                        isToday
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map((task) => {
                        const pCfg =
                          priorityConfig[
                            task.priority as keyof typeof priorityConfig
                          ];
                        const projectId =
                          typeof task.project === "string"
                            ? task.project
                            : (task.project as { _id: string })._id;
                        return (
                          <button
                            key={task._id}
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}/tasks/${task._id}`,
                              )
                            }
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${pCfg?.bg || "bg-blue-100"} ${pCfg?.color || "text-blue-700"} hover:opacity-80 transition-opacity`}
                          >
                            {task.title}
                          </button>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <p className="text-[10px] text-slate-400 pl-1">
                          +{dayTasks.length - 3} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">Priority:</span>
        {Object.entries(priorityConfig).map(([key, cfg]) => (
          <span
            key={key}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
