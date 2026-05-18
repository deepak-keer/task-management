'use client';

import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { setSidebarOpen, toggleCommandPalette } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InstallAppButton from '../pwa/InstallAppButton';

export default function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const { user } = useAppSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0 sticky top-0 z-20">
      <button
        type="button"
        onClick={() => dispatch(setSidebarOpen(true))}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
        title="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search trigger */}
      <button
        onClick={() => dispatch(toggleCommandPalette())}
        className="flex min-w-0 items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-sm transition-colors flex-1 sm:max-w-xs"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Search...</span>
        <span className="ml-auto hidden text-xs text-slate-400 font-mono sm:inline">Cmd K</span>
      </button>

      <div className="hidden flex-1 sm:block" />

      <InstallAppButton />

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
