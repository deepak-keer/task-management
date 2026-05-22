'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Calendar, FolderOpen, Users,
  Bell, User, Settings, Shield, Zap, ChevronLeft, ChevronRight,
  BarChart3, Building2, Columns3, ClipboardList, X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { setSidebarOpen, toggleSidebar } from '../../store/slices/uiSlice';
import { useGetProjectsQuery } from '../../services/projectsApi';
import { usePermission } from '../../hooks/usePermission';
import { getAvatarUrl, onlineStatusConfig } from '../../lib/utils';
import { cn } from '../../lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/notifications', icon: Bell, label: 'Notifications', badge: true },
];

const adminItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const superAdminItems = [
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/workspaces', icon: Building2, label: 'Workspaces' },
  { href: '/admin/user-tasks', icon: ClipboardList, label: 'User Tasks' },
  { href: '/admin/columns', icon: Columns3, label: 'Columns' },
  { href: '/admin/permissions', icon: Shield, label: 'Permissions' },
  { href: '/admin/stats', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const { data: projects = [] } = useGetProjectsQuery();
  const canViewBoards = usePermission('view_boards');
  const canViewWorkspaces = usePermission('view_workspaces');
  const canManageColumns = usePermission('manage_columns');
  const canViewAnalytics = usePermission('view_analytics');
  const canViewUserTaskOverview = usePermission('view_user_task_overview');

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);
  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      dispatch(setSidebarOpen(false));
    }
  };

  return (
    <>
      <div
        className={cn(
          'fixed left-0 top-0 z-30 hidden h-full w-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block',
          sidebarOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
        aria-hidden={sidebarOpen}
      >
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="absolute -right-8 top-4 flex h-7 w-7 items-center justify-center rounded-r-lg border border-slate-700 bg-slate-800 text-slate-400 shadow-lg shadow-slate-950/20 transition-all duration-200 hover:w-8 hover:text-white"
          title="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        aria-label="Close navigation"
        onClick={() => dispatch(setSidebarOpen(false))}
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[1px] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        aria-hidden={!sidebarOpen}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full w-[min(82vw,240px)] flex-col bg-slate-900 shadow-2xl shadow-slate-950/30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:z-30 lg:w-[240px] lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--color-sidebar-bg)', borderRight: '1px solid #1e293b' }}
      >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <Link href="/dashboard" onClick={closeOnMobile} className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-base truncate">TaskFlow</span>
        </Link>
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          title="Close sidebar"
        >
          <ChevronLeft className="hidden w-4 h-4 lg:block" />
          <X className="w-4 h-4 lg:hidden" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            onClick={closeOnMobile}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              isActive(href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="ml-auto text-xs font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 notif-pop">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        ))}

        {/* Boards */}
        {canViewBoards && (
        <div className="pt-4">
          <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Boards
          </p>
          {projects.filter(Boolean).slice(0, 8).map((project) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              onClick={closeOnMobile}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200',
                pathname.startsWith(`/projects/${project._id}`)
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="truncate">{project.name || 'Untitled board'}</span>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="px-3 text-xs text-slate-600 italic">No boards yet</p>
          )}
          <Link
            href="/projects"
            onClick={closeOnMobile}
            className="mt-1 flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-slate-600 transition-colors hover:text-slate-400"
          >
            <FolderOpen className="w-3 h-3" />
            All boards →
          </Link>
        </div>
        )}

        {/* Admin nav */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Admin
            </p>
            {adminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeOnMobile}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive(href)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        )}

        {user?.role === 'super_admin' && (
          <div className="pt-2">
            <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Super Admin
            </p>
            {superAdminItems
              .filter((item) => {
                if (item.href === '/admin/workspaces') return canViewWorkspaces;
                if (item.href === '/admin/user-tasks') return canViewUserTaskOverview;
                if (item.href === '/admin/columns') return canManageColumns;
                if (item.href === '/admin/stats') return canViewAnalytics;
                return true;
              })
              .map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeOnMobile}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive(href)
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 p-3">
        <Link href="/profile" onClick={closeOnMobile} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800">
          <div className="relative flex-shrink-0">
            <img
              src={getAvatarUrl(user?.name || 'User', user?.avatar)}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900',
                onlineStatusConfig[user?.onlineStatus as keyof typeof onlineStatusConfig]?.dot || 'bg-green-500'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <User className="w-4 h-4 text-slate-600 flex-shrink-0" />
        </Link>
      </div>
      </aside>
    </>
  );
}
