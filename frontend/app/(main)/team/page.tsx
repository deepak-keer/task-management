"use client";

import { useState } from "react";
import { useGetUsersQuery } from "../../../services/allApis";
import {
  Avatar,
  RoleBadge,
  StatusBadge,
  Skeleton,
  EmptyState,
} from "../../../components/ui/index";
import { useAppSelector } from "../../../store/index";
import { Users, Search } from "lucide-react";
import { onlineStatusConfig } from "../../../lib/utils";

export default function TeamPage() {
  const { data: users = [], isLoading } = useGetUsersQuery();
  const onlineUsers = useAppSelector((s) => s.socket.onlineUsers);
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const getStatus = (userId: string, defaultStatus: string) =>
    onlineUsers.find((u) => u.userId === userId)?.status || defaultStatus;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Team
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {users.filter((u) => u.status === "active").length} active members
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Members grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3"
            >
              <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No members found"
          description="Try adjusting your search."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => {
            const status = getStatus(member._id, member.onlineStatus);
            const statusCfg =
              onlineStatusConfig[status as keyof typeof onlineStatusConfig] ||
              onlineStatusConfig.online;
            return (
              <div
                key={member._id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    name={member.name}
                    avatar={member.avatar}
                    size="md"
                    status={status}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
                      {member.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RoleBadge role={member.role} />
                      <StatusBadge status={member.status} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
