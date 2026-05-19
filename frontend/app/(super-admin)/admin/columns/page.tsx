'use client';

import { useMemo, useState } from 'react';
import {
  useAddProjectColumnMutation,
  useArchiveProjectColumnMutation,
  useDeleteProjectColumnMutation,
  useGetProjectsQuery,
  useReorderProjectColumnsMutation,
  useRestoreProjectColumnMutation,
  useUpdateProjectColumnMutation,
  type Project,
} from '../../../../services/projectsApi';
import { Button, Modal, Skeleton } from '../../../../components/ui/index';
import { Archive, ArrowDown, ArrowUp, Edit2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Column = Project['columns'][number];

export default function ColumnsAdminPage() {
  const { data: projects = [], isLoading } = useGetProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; column?: Column } | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3b82f6' });

  const [addColumn, { isLoading: adding }] = useAddProjectColumnMutation();
  const [updateColumn, { isLoading: updating }] = useUpdateProjectColumnMutation();
  const [deleteColumn] = useDeleteProjectColumnMutation();
  const [archiveColumn] = useArchiveProjectColumnMutation();
  const [restoreColumn] = useRestoreProjectColumnMutation();
  const [reorderColumns] = useReorderProjectColumnsMutation();

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId) || projects[0],
    [projects, selectedProjectId],
  );
  const projectId = selectedProject?._id || '';
  const columns = [...(selectedProject?.columns || [])].sort((a, b) => a.order - b.order);
  const activeColumns = columns.filter((column) => !column.archived);
  const archivedColumns = columns.filter((column) => column.archived);

  const duplicateName = form.name.trim()
    ? columns.some((column) =>
        column.id !== modal?.column?.id &&
        column.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
      )
    : false;
  const duplicateColor = columns.some((column) =>
    column.id !== modal?.column?.id &&
    column.color.trim().toLowerCase() === form.color.trim().toLowerCase(),
  );

  const openCreate = () => {
    setForm({ name: '', color: '#3b82f6' });
    setModal({ mode: 'create' });
  };

  const openEdit = (column: Column) => {
    setForm({ name: column.name, color: column.color });
    setModal({ mode: 'edit', column });
  };

  const closeModal = () => {
    setModal(null);
    setForm({ name: '', color: '#3b82f6' });
  };

  const saveColumn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) return;
    if (!form.name.trim()) {
      toast.error('Column name is required');
      return;
    }
    if (duplicateName) {
      toast.error('Column name already exists');
      return;
    }
    if (duplicateColor) {
      toast.error('Column color already exists');
      return;
    }

    try {
      if (modal?.mode === 'edit' && modal.column) {
        await updateColumn({ projectId, columnId: modal.column.id, name: form.name.trim(), color: form.color }).unwrap();
        toast.success('Column updated');
      } else {
        await addColumn({ projectId, name: form.name.trim(), color: form.color }).unwrap();
        toast.success('Column created');
      }
      closeModal();
    } catch (error) {
      toast.error((error as { data?: { message?: string } })?.data?.message || 'Failed to save column');
    }
  };

  const removeColumn = async (column: Column) => {
    if (!projectId) return;
    try {
      await deleteColumn({ projectId, columnId: column.id }).unwrap();
      toast.success('Column deleted');
    } catch (error) {
      toast.error((error as { data?: { message?: string } })?.data?.message || 'Failed to delete column');
    }
  };

  const archive = async (column: Column) => {
    if (!projectId) return;
    try {
      await archiveColumn({ projectId, columnId: column.id }).unwrap();
      toast.success('Column archived');
    } catch (error) {
      toast.error((error as { data?: { message?: string } })?.data?.message || 'Failed to archive column');
    }
  };

  const restore = async (column: Column) => {
    if (!projectId) return;
    try {
      await restoreColumn({ projectId, columnId: column.id }).unwrap();
      toast.success('Column restored');
    } catch (error) {
      toast.error((error as { data?: { message?: string } })?.data?.message || 'Failed to restore column');
    }
  };

  const moveColumn = async (columnId: string, direction: -1 | 1) => {
    if (!projectId) return;
    const next = [...activeColumns];
    const index = next.findIndex((column) => column.id === columnId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    const [column] = next.splice(index, 1);
    next.splice(target, 0, column);

    try {
      await reorderColumns({ projectId, columnIds: next.map((column) => column.id) }).unwrap();
    } catch {
      toast.error('Failed to reorder columns');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Columns</h1>
        </div>
        <select
          value={selectedProject?._id || ''}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={openCreate} disabled={!projectId}>
          <Plus className="h-4 w-4" /> Column
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-[1fr_120px_180px] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
          <span>Name</span>
          <span>Color</span>
          <span className="text-right">Actions</span>
        </div>
        {activeColumns.map((column, index) => (
          <div key={column.id} className="grid grid-cols-[1fr_120px_180px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
            <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{column.name}</span>
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: column.color }} />
              {column.color}
            </span>
            <div className="flex justify-end gap-1">
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => moveColumn(column.id, -1)} disabled={index === 0}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => moveColumn(column.id, 1)} disabled={index === activeColumns.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => openEdit(column)}>
                <Edit2 className="h-4 w-4" />
              </button>
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => archive(column)}>
                <Archive className="h-4 w-4" />
              </button>
              <button className="rounded p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => removeColumn(column)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {archivedColumns.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Archived</h2>
          {archivedColumns.map((column) => (
            <div key={column.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-sm text-slate-700 dark:text-slate-200">{column.name}</span>
              <Button size="sm" variant="secondary" onClick={() => restore(column)}>
                <RotateCcw className="h-4 w-4" /> Restore
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modal?.mode === 'edit' ? 'Edit Column' : 'Add Column'} size="sm">
        <form onSubmit={saveColumn} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
            />
            {duplicateName && <span className="mt-1 block text-xs text-red-500">This name is already used.</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Color</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
            />
            {duplicateColor && <span className="mt-1 block text-xs text-red-500">This color is already used.</span>}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={adding || updating} disabled={duplicateName || duplicateColor}>
              {modal?.mode === 'edit' ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
