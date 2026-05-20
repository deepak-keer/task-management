'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { cn } from '../../lib/utils';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import CommandPalette from '../../components/shared/CommandPalette';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  useEffect(() => {
    dispatch(setSidebarOpen(window.innerWidth >= 1024));
    setMounted(true);
  }, [dispatch]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && user.role !== 'super_admin') router.replace('/dashboard');
  }, [isAuthenticated, mounted, user, router]);

  if (!mounted || !isAuthenticated || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className={cn('flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', sidebarOpen && 'lg:ml-[240px]')}>
        <Header />
        <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <div key={pathname} className="h-full min-h-full page-transition">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
