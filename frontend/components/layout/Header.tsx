'use client';

import { Bell, Search, LogOut, Menu } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { toggleSidebar, toggleCommandPalette } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const { user } = useAppSelector((s) => s.auth);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 gap-3 flex-shrink-0 sticky top-0 z-20">
      {!sidebarOpen && (
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Search trigger */}
      <button
        onClick={() => dispatch(toggleCommandPalette())}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-sm transition-colors flex-1 max-w-xs"
      >
        <Search className="w-4 h-4" />
        <span>Search…</span>
        <span className="ml-auto text-xs text-slate-400 font-mono">⌘K</span>
      </button>

      <div className="flex-1" />

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 notif-pop">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
        title="Sign out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
