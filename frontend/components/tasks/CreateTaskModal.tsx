'use client';

import { useState } from 'react';
import { useCreateTaskMutation } from '../../services/tasksApi';
import { useAppSelector } from '../../store/index';
import type { TaskCard } from '../../store/slices/boardSlice';
import { Modal, Button } from '../ui/index';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
  defaultColumn: string;
  columns: Array<{ id: string; name: string }>;
  members: Array<{ _id: string; name: string; avatar: string }>;
  onClose: () => void;
}

interface TaskForm {
  title: string;
  description: string;
  column: string;
  priority: TaskCard['priority'];
  assigneeId: string;
  dueDate: string;
}

const TASK_PRIORITIES: TaskCard['priority'][] = ['urgent', 'high', 'medium', 'low'];

export default function CreateTaskModal({ projectId, defaultColumn, columns, members, onClose }: Props) {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isMember = currentUser?.role === 'member';
  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    column: defaultColumn,
    priority: 'medium',
    assigneeId: isMember ? currentUser?._id || '' : '',
    dueDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await createTask({
        title: form.title,
        description: form.description,
        status: form.column,
        column: form.column,
        priority: form.priority,
        projectId,
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined,
      }).unwrap();
      toast.success('Task created!');
      onClose();
    } catch {
      toast.error('Failed to create task');
    }
  };

  return (
    <Modal open onClose={onClose} title="Create Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Title *</label>
          <input
            type="text" required autoFocus
            placeholder="What needs to be done?"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Column</label>
            <select value={form.column} onChange={(e) => setForm({ ...form, column: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskCard['priority'] })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Assignee</label>
            {isMember ? (
              <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white">
                {currentUser?.name || 'Me'}
              </div>
            ) : (
              <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isLoading}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
