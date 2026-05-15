'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Calendar, FolderOpen, Users,
  Bell, User, Settings, Shield, Zap, ChevronLeft, ChevronRight,
  BarChart3, Building2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useGetProjectsQuery } from '../../services/projectsApi';
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

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  if (!sidebarOpen) {
    return (
      <div className="fixed left-0 top-0 h-full w-0 z-30">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="absolute top-4 -right-8 w-7 h-7 bg-slate-800 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full z-30 flex flex-col"
      style={{ width: '240px', background: 'var(--color-sidebar-bg)', borderRight: '1px solid #1e293b' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-base">TaskFlow</span>
        </Link>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="text-slate-500 hover:text-slate-300 p-1 rounded"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
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

        {/* Projects */}
        <div className="pt-4">
          <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Projects
          </p>
          {projects.slice(0, 8).map((project) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname.startsWith(`/projects/${project._id}`)
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="truncate">{project.name}</span>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="px-3 text-xs text-slate-600 italic">No projects yet</p>
          )}
          <Link
            href="/projects"
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-400 transition-colors mt-1"
          >
            <FolderOpen className="w-3 h-3" />
            All projects →
          </Link>
        </div>

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
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
            {superAdminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
        <Link href="/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors">
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
  );
}
