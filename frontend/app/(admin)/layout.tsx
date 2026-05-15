'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/index';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import CommandPalette from '../../components/shared/CommandPalette';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && user.role !== 'admin' && user.role !== 'super_admin') router.replace('/dashboard');
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200" style={{ marginLeft: sidebarOpen ? '240px' : '0' }}>
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
