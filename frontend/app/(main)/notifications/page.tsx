"use client";

import { useState } from "react";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from "../../../services/allApis";
import { useAppDispatch } from "../../../store/index";
import {
  markRead,
  markAllRead,
  removeNotification,
} from "../../../store/slices/notificationSlice";
import { Button, EmptyState, Skeleton } from "../../../components/ui/index";
import { Bell, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { formatRelative, notificationIcons } from "../../../lib/utils";
import Link from "next/link";

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading, refetch } = useGetNotificationsQuery({ page: 1 });
  const [markOne] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();
  const [deleteOne] = useDeleteNotificationMutation();

  const notifications = (data?.notifications ?? []) as Array<{
    _id: string;
    type: string;
    message: string;
    read: boolean;
    link: string;
    createdAt: string;
  }>;
  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const handleMarkOne = async (id: string) => {
    dispatch(markRead(id));
    await markOne(id).unwrap();
    refetch();
  };

  const handleMarkAll = async () => {
    dispatch(markAllRead());
    await markAll().unwrap();
    refetch();
  };

  const handleDelete = async (id: string) => {
    dispatch(removeNotification(id));
    await deleteOne(id).unwrap();
    refetch();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {notifications.filter((n) => !n.read).length} unread
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <Button variant="secondary" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              filter === f
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div key={filter} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden tab-panel-transition">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title="No notifications"
            description={
              filter === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here."
            }
          />
        )}

        {!isLoading &&
          filtered.map((n) => (
            <div
              key={n._id}
              className={`flex items-start gap-3 p-4 transition-colors ${
                !n.read
                  ? "bg-blue-50/50 dark:bg-blue-900/10"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
              }`}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${
                  !n.read
                    ? "bg-blue-100 dark:bg-blue-900/40"
                    : "bg-slate-100 dark:bg-slate-700"
                }`}
              >
                {notificationIcons[n.type] || "🔔"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${!n.read ? "font-medium text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {n.message}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatRelative(n.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => !n.read && handleMarkOne(n._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!n.read && (
                  <button
                    onClick={() => handleMarkOne(n._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
