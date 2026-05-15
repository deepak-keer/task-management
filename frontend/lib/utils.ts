import { type ClassValue, clsx } from 'clsx';
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ');
}

export const priorityConfig = {
  urgent: { label: 'Urgent', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300', dot: 'bg-blue-500' },
} as const;

export const onlineStatusConfig = {
  online: { label: 'Online', dot: 'bg-green-500' },
  away: { label: 'Away', dot: 'bg-yellow-500' },
  dnd: { label: 'Do Not Disturb', dot: 'bg-red-500' },
} as const;

export const roleConfig = {
  super_admin: { label: 'Super Admin', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  admin: { label: 'Admin', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  member: { label: 'Member', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
} as const;

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isDueDate(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

export function getAvatarUrl(name: string, avatar?: string): string {
  if (avatar) return avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=128`;
}

export function truncate(str: string, len = 50): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export const notificationIcons: Record<string, string> = {
  task_assigned: '📋',
  task_completed: '✅',
  task_status_changed: '🔄',
  task_updated: '✏️',
  comment_added: '💬',
  mentioned: '@',
  due_reminder: '⏰',
  attachment_added: '📎',
  invite_used: '🔗',
  login: '🔓',
  user_approved: '✅',
  user_rejected: '❌',
  permission_changed: '🔐',
  task_watched: '👁',
};
