'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Hash, FolderOpen, User, CheckSquare } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { setCommandPaletteOpen } from '../../store/slices/uiSlice';
import { useGetProjectsQuery } from '../../services/projectsApi';
import { useGetUsersQuery } from '../../services/allApis';
import { cn } from '../../lib/utils';

export default function CommandPalette() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const open = useAppSelector((s) => s.ui.commandPaletteOpen);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useGetProjectsQuery();
  const { data: users = [] } = useGetUsersQuery();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch(setCommandPaletteOpen(true));
      }
      if (e.key === 'Escape') dispatch(setCommandPaletteOpen(false));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredProjects = projects.filter((p) =>
    (p.name || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const allItems = [
    ...filteredProjects.map((p) => ({
      type: 'project',
      id: p._id,
      label: p.name || 'Untitled board',
      sub: `${p.members?.length || 0} members`,
      href: `/projects/${p._id}`,
      icon: FolderOpen,
    })),
    ...filteredUsers.map((u) => ({
      type: 'user',
      id: u._id,
      label: u.name,
      sub: u.email,
      href: `/team`,
      icon: User,
    })),
  ];

  const navigate = (href: string) => {
    router.push(href);
    dispatch(setCommandPaletteOpen(false));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh] animate-fade-in"
      onClick={() => dispatch(setCommandPaletteOpen(false))}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-modal-in will-change-transform dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, people…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, allItems.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && allItems[selected]) navigate(allItems[selected].href);
            }}
            className="flex-1 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          <button type="button" onClick={() => dispatch(setCommandPaletteOpen(false))} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {allItems.length === 0 && query && (
            <p className="text-center text-slate-400 text-sm py-8">No results for "{query}"</p>
          )}
          {!query && (
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick nav</p>
              {[
                { label: 'Dashboard', href: '/dashboard', icon: CheckSquare },
                { label: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
                { label: 'Calendar', href: '/calendar', icon: CheckSquare },
                { label: 'Team', href: '/team', icon: User },
              ].map(({ label, href, icon: Icon }, i) => (
                <button key={href} onClick={() => navigate(href)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors', i === selected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700')}>
                  <Icon className="w-4 h-4 text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
          )}
          {allItems.length > 0 && allItems.map((item, i) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => navigate(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                i === selected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              )}
            >
              <item.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex gap-4 text-xs text-slate-400">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
