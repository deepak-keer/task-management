'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'next/navigation';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners, pointerWithin,
  type Active, type CollisionDetection, type Over,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  useAddProjectColumnMutation,
  useAddProjectMemberMutation,
  useArchiveProjectColumnMutation,
  useDeleteProjectColumnMutation,
  useGetProjectQuery,
  useRemoveProjectMemberMutation,
  useReorderProjectColumnsMutation,
  useRestoreProjectColumnMutation,
  useUpdateProjectColumnMutation,
} from '../../../../services/projectsApi';
import { useGetTasksQuery, useCreateTaskMutation, useLazyExportTasksQuery, useMoveTaskMutation } from '../../../../services/tasksApi';
import { useGetUsersQuery, type AppUser } from '../../../../services/allApis';
import { useAppDispatch, useAppSelector } from '../../../../store/index';
import { setBoard, optimisticMoveTask, confirmMove, rollbackMove, type BoardColumn } from '../../../../store/slices/boardSlice';
import { setBoardView, setFilter } from '../../../../store/slices/uiSlice';
import { useJoinBoard } from '../../../../hooks/useSocket';
import { usePermission } from '../../../../hooks/usePermission';
import KanbanColumn from '../../../../components/board/KanbanColumn';
import TaskCard from '../../../../components/board/TaskCard';
import TaskDrawer from '../../../../components/tasks/TaskDrawer';
import { Avatar, SkeletonCard, Button, Modal } from '../../../../components/ui/index';
import { Activity, Download, LayoutGrid, List, Plus, Search, UserMinus, UserPlus, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 'todo', name: 'To Do', order: 0, color: '#64748b', archived: false },
  { id: 'in_progress', name: 'In Progress', order: 1, color: '#3b82f6', archived: false },
  { id: 'in_review', name: 'In Review', order: 2, color: '#f59e0b', archived: false },
  { id: 'done', name: 'Done', order: 3, color: '#22c55e', archived: false },
];

type BoardMember = Pick<AppUser, '_id' | 'name' | 'email' | 'avatar' | 'role' | 'onlineStatus'>;

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;
  const dispatch = useAppDispatch();

  const boardView = useAppSelector((s) => s.ui.boardView);
  const { columns, tasks, taskOrder } = useAppSelector((s) => s.board);
  const activeFilters = useAppSelector((s) => s.ui.activeFilters);
  const onlineUsers = useAppSelector((s) => s.socket.onlineUsers);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [columnModal, setColumnModal] = useState<{ mode: 'create' | 'edit'; column?: BoardColumn } | null>(null);
  const [columnForm, setColumnForm] = useState({ name: '', color: '#3b82f6' });

  const { data: project, isLoading: projectLoading } = useGetProjectQuery(projectId);
  const { data: taskList } = useGetTasksQuery({ projectId });
  const { data: users = [] } = useGetUsersQuery();
  const [createTask] = useCreateTaskMutation();
  const [exportTasks, { isFetching: exportingTasks }] = useLazyExportTasksQuery();
  const [moveTask] = useMoveTaskMutation();
  const [addMember, { isLoading: addingMember }] = useAddProjectMemberMutation();
  const [removeMember, { isLoading: removingMember }] = useRemoveProjectMemberMutation();
  const [addColumn, { isLoading: addingColumn }] = useAddProjectColumnMutation();
  const [updateColumn, { isLoading: updatingColumn }] = useUpdateProjectColumnMutation();
  const [deleteColumn] = useDeleteProjectColumnMutation();
  const [archiveColumn] = useArchiveProjectColumnMutation();
  const [restoreColumn] = useRestoreProjectColumnMutation();
  const [reorderColumns] = useReorderProjectColumnsMutation();
  const projectColumns = useMemo(
    () => (Array.isArray(project?.columns) && project.columns.length > 0 ? project.columns : DEFAULT_COLUMNS),
    [project?.columns],
  );
  const usersById = useMemo(
    () => new Map(users.map((user) => [user._id, user])),
    [users],
  );
  const projectMembers = useMemo(
    () => {
      const rawMembers = Array.isArray(project?.members) ? (project.members as unknown[]) : [];
      const seen = new Set<string>();

      return rawMembers
        .map((member) => {
          const partialMember =
            typeof member === 'object' && member
              ? (member as Partial<BoardMember>)
              : null;
          const id = typeof member === 'string' ? member : partialMember?._id;
          if (!id || seen.has(id)) return null;
          seen.add(id);

          const userDetails = usersById.get(id);
          return {
            _id: id,
            name: partialMember?.name || userDetails?.name || 'Unknown member',
            email: partialMember?.email || userDetails?.email || '',
            avatar: partialMember?.avatar || userDetails?.avatar || '',
            role: partialMember?.role || userDetails?.role || 'member',
            onlineStatus: partialMember?.onlineStatus || userDetails?.onlineStatus || 'offline',
          } satisfies BoardMember;
        })
        .filter((member): member is BoardMember => !!member);
    },
    [project?.members, usersById],
  );
  const projectTasks = useMemo(
    () => (Array.isArray(taskList) ? taskList : []),
    [taskList],
  );

  const canCreatePermission = usePermission('create_tasks');
  const canMovePermission = usePermission('move_tasks');
  const canViewBoards = usePermission('view_boards');
  const canManageBoardMembers = usePermission('manage_board_members');
  const canExportTasks = usePermission('export_tasks');
  const canCreate = canCreatePermission;
  const canMove = canMovePermission;
  const canManageColumns = usePermission('manage_columns');

  useJoinBoard(projectId);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      window.localStorage.setItem('last-active-board', projectId);
    }
  }, [projectId]);

  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam) setSelectedTaskId(taskParam);
  }, [searchParams]);

  // Populate board on load
  useEffect(() => {
    if (project && taskList) {
      dispatch(setBoard({
        columns: projectColumns,
        tasks: projectTasks,
        projectId,
      }));
    }
  }, [project, taskList, projectColumns, projectTasks, dispatch, projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith('column:')) {
      setActiveColumnId(id.replace('column:', ''));
      return;
    }
    setActiveTaskId(id);
  };

  const getInsertIndex = ({
    active,
    over,
    taskId,
    overId,
    destinationOrder,
  }: {
    active: Active;
    over: Over;
    taskId: string;
    overId: string;
    destinationOrder: string[];
  }) => {
    const orderWithoutActive = destinationOrder.filter((id) => id !== taskId);
    if (!tasks[overId]) return orderWithoutActive.length;

    const overIndex = orderWithoutActive.indexOf(overId);
    if (overIndex === -1) return orderWithoutActive.length;

    const activeRect = active.rect.current.translated || active.rect.current.initial;
    if (!activeRect) return overIndex;
    const activeCenterY = activeRect.top + activeRect.height / 2;
    const insertBeforeThreshold = over.rect.top + over.rect.height * 0.33;

    return overIndex + (activeCenterY > insertBeforeThreshold ? 1 : 0);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTaskId(null);
    setActiveColumnId(null);
    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    if (taskId.startsWith('column:')) {
      if (!canManageColumns || !overId.startsWith('column:')) return;
      const fromColumnId = taskId.replace('column:', '');
      const toColumnId = overId.replace('column:', '');
      if (fromColumnId === toColumnId) return;

      const fromIndex = visibleColumns.findIndex((column) => column.id === fromColumnId);
      const toIndex = visibleColumns.findIndex((column) => column.id === toColumnId);
      if (fromIndex === -1 || toIndex === -1) return;

      const nextColumns = arrayMove(visibleColumns, fromIndex, toIndex);
      try {
        await reorderColumns({ projectId, columnIds: nextColumns.map((column) => column.id) }).unwrap();
      } catch {
        toast.error('Failed to reorder columns');
      }
      return;
    }

    if (!canMove) return;

    // Determine destination column
    let destColumn = overId;
    if (tasks[overId]) destColumn = tasks[overId].column;

    const srcColumn = tasks[taskId]?.column;
    if (!srcColumn) return;

    const destinationOrder = taskOrder[destColumn] || [];
    const newOrder = destinationOrder.filter((id) => id !== taskId);
    const insertAt = getInsertIndex({ active, over, taskId, overId, destinationOrder });
    newOrder.splice(insertAt, 0, taskId);

    if (srcColumn === destColumn && (taskOrder[srcColumn] || []).join('|') === newOrder.join('|')) return;

    dispatch(optimisticMoveTask({ taskId, fromColumn: srcColumn, toColumn: destColumn, newOrder }));

    try {
      await moveTask({ id: taskId, column: destColumn, status: destColumn, order: newOrder.indexOf(taskId) }).unwrap();
      dispatch(confirmMove());
    } catch {
      dispatch(rollbackMove());
      toast.error('Failed to move task');
    }
  };

  const sortedColumns = Object.values(columns).sort((a, b) => a.order - b.order);
  const allColumns = sortedColumns.length > 0 ? sortedColumns : [...projectColumns].sort((a, b) => a.order - b.order);
  const visibleColumns = allColumns.filter((column) => !column.archived);
  const archivedColumns = allColumns.filter((column) => column.archived);
  const visibleColumnIds = new Set(visibleColumns.map((column) => column.id));
  const collisionDetection: CollisionDetection = (args) => {
    if (String(args.active.id).startsWith('column:')) return closestCorners(args);

    const pointerHits = pointerWithin(args);
    const taskHits = pointerHits.filter((collision) => collision.id !== args.active.id && !!tasks[String(collision.id)]);
    if (taskHits.length > 0) return taskHits;

    const columnHits = pointerHits.filter((collision) => visibleColumnIds.has(String(collision.id)));
    if (columnHits.length > 0) return columnHits;

    return closestCorners(args).filter((collision) => visibleColumnIds.has(String(collision.id)));
  };
  const columnNameById = new Map(allColumns.map((column) => [column.id, column.name]));
  const boardTaskList = Object.values(tasks);
  const memberIds = new Set(projectMembers.map((member) => member._id));
  const ownerId = typeof project?.owner === 'object' && project.owner ? project.owner._id : null;
  const memberSearchTerm = memberSearch.trim().toLowerCase();
  const addableUsers = users
    .filter((user) => user.status === 'active')
    .filter((user) => !memberIds.has(user._id))
    .filter((user) => {
      if (!memberSearchTerm) return true;
      return `${user.name} ${user.email}`.toLowerCase().includes(memberSearchTerm);
    })
    .slice(0, 8);
  const recentActivity = boardTaskList
    .flatMap((task) => (task.activityLog || []).map((log) => ({ ...log, taskTitle: task.title })))
    .sort((a, b) => new Date(String(b.performedAt)).getTime() - new Date(String(a.performedAt)).getTime())
    .slice(0, 5);
  const dragOverlay = (
    <DragOverlay dropAnimation={null}>
      {activeTaskId && tasks[activeTaskId] && (
        <TaskCard task={tasks[activeTaskId]} projectId={projectId} isDragging />
      )}
      {activeColumnId && columns[activeColumnId] && (
        <div className="w-[292px] rounded-xl border border-blue-300 bg-white p-4 text-sm font-semibold text-slate-900 shadow-2xl dark:border-blue-500/40 dark:bg-slate-900 dark:text-white">
          {columns[activeColumnId].name}
        </div>
      )}
    </DragOverlay>
  );

  const openCreateColumnModal = () => {
    setColumnForm({ name: '', color: '#3b82f6' });
    setColumnModal({ mode: 'create' });
  };

  const openEditColumnModal = (column: BoardColumn) => {
    setColumnForm({ name: column.name, color: column.color });
    setColumnModal({ mode: 'edit', column });
  };

  const closeColumnModal = () => {
    setColumnModal(null);
    setColumnForm({ name: '', color: '#3b82f6' });
  };

  const handleSaveColumn = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = columnForm.name.trim();
    if (!name) {
      toast.error('Column name is required');
      return;
    }

    try {
      if (columnModal?.mode === 'edit' && columnModal.column) {
        await updateColumn({ projectId, columnId: columnModal.column.id, name, color: columnForm.color }).unwrap();
        toast.success('Column updated');
      } else {
        await addColumn({ projectId, name, color: columnForm.color }).unwrap();
        toast.success('Column created');
      }
      closeColumnModal();
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to save column';
      toast.error(message);
    }
  };

  const handleDeleteColumn = async (column: BoardColumn, taskCount: number) => {
    if (taskCount > 0) {
      toast.error('Move tasks first');
      return;
    }

    try {
      await deleteColumn({ projectId, columnId: column.id }).unwrap();
      toast.success('Column deleted');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to delete column';
      toast.error(message);
    }
  };

  const handleArchiveColumn = async (column: BoardColumn) => {
    try {
      await archiveColumn({ projectId, columnId: column.id }).unwrap();
      toast.success('Column archived');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to archive column';
      toast.error(message);
    }
  };

  const handleRestoreColumn = async (columnId: string) => {
    if (!columnId) return;

    try {
      await restoreColumn({ projectId, columnId }).unwrap();
      toast.success('Column restored');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to restore column';
      toast.error(message);
    }
  };

  const getFilteredTasksForColumn = (columnId: string) => {
    const ids = taskOrder[columnId] || [];
    return ids
      .map((id) => tasks[id])
      .filter(Boolean)
      .filter((t) => {
        if (activeFilters.assignee && t.assignee?._id !== activeFilters.assignee) return false;
        if (activeFilters.priority && t.priority !== activeFilters.priority) return false;
        if (activeFilters.label && !t.labels?.includes(activeFilters.label)) return false;
        if (activeFilters.search && !t.title.toLowerCase().includes(activeFilters.search.toLowerCase())) return false;
        return true;
      });
  };

  const handleQuickCreateTask = async (columnId: string, title: string) => {
    try {
      const task = await createTask({
        projectId,
        title,
        description: '',
        status: columnId,
        column: columnId,
        priority: 'medium',
      }).unwrap();
      setSelectedTaskId(task._id);
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!canManageBoardMembers) {
      toast.error('You do not have permission to manage board members');
      return;
    }

    try {
      await addMember({ projectId, userId }).unwrap();
      setMemberSearch('');
      toast.success('Member added to board');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to add member';
      toast.error(message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!canManageBoardMembers) {
      toast.error('You do not have permission to manage board members');
      return;
    }

    try {
      await removeMember({ projectId, userId }).unwrap();
      toast.success('Member removed from board');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to remove member';
      toast.error(message);
    }
  };

  const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
    const headers = rows[0] ? Object.keys(rows[0]) : ['id', 'title', 'status', 'priority'];
    const escapeCell = (value: string | number | undefined) => {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportTasks = async () => {
    if (!canExportTasks) {
      toast.error('You do not have permission to export tasks');
      return;
    }

    try {
      const result = await exportTasks({
        projectId,
        priority: activeFilters.priority || undefined,
        assignee: activeFilters.assignee || undefined,
        search: activeFilters.search || undefined,
      }).unwrap();
      downloadCsv(result.filename || 'tasks.csv', result.rows || []);
      toast.success('Tasks exported');
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message || 'Failed to export tasks';
      toast.error(message);
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 mb-4" />
        <div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex-1 space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>)}</div>
      </div>
    );
  }

  if (!canViewBoards) return <div className="text-center py-20 text-slate-500">You do not have permission to view boards.</div>;
  if (!project) return <div className="text-center py-20 text-slate-500">Project not found.</div>;

  return (
    <div className="flex h-full flex-col -m-4 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:-m-5 lg:-m-6">
      {/* Board header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/95 sm:px-5 lg:px-6 lg:py-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Board</p>
          <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{project.name}</h1>
        </div>

        {/* Online presence */}
        <div className="flex -space-x-2">
          {projectMembers.slice(0, 6).map((m, index) => (
            <Avatar key={`${m._id || 'member'}-${index}`} name={m.name || 'User'} avatar={m.avatar} size="xs"
              status={onlineUsers.find((u) => u.userId === m._id)?.status || 'offline'}
              className="ring-2 ring-white dark:ring-slate-950" />
          ))}
        </div>

        {canManageBoardMembers && (
          <Button size="sm" variant="secondary" onClick={() => setMemberModalOpen(true)}>
            <Users className="w-3.5 h-3.5" /> Members
          </Button>
        )}

        {canExportTasks && (
          <Button size="sm" variant="secondary" onClick={handleExportTasks} loading={exportingTasks}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        )}

        {/* Filters */}
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={activeFilters.search}
            onChange={(e) => dispatch(setFilter({ search: e.target.value }))}
            placeholder="Search board"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <select
            value={activeFilters.priority || ''}
            onChange={(e) => dispatch(setFilter({ priority: e.target.value || null }))}
            className="max-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">Priority</option>
            {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
          <button onClick={() => dispatch(setBoardView('kanban'))}
            className={`p-1.5 rounded-md transition-all duration-200 ${boardView === 'kanban' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => dispatch(setBoardView('list'))}
            className={`p-1.5 rounded-md transition-all duration-200 ${boardView === 'list' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>

        {canCreate && (
          <Button size="sm" onClick={() => handleQuickCreateTask(visibleColumns[0]?.id || 'todo', 'Untitled task')}>
            <Zap className="w-3.5 h-3.5" /> Quick task
          </Button>
        )}

        {canManageColumns && (
          <>
            {archivedColumns.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  handleRestoreColumn(e.target.value);
                  e.target.value = '';
                }}
                className="max-w-[150px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Restore archived column"
              >
                <option value="">Restore</option>
                {archivedColumns.map((column) => (
                  <option key={column.id} value={column.id}>{column.name}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="secondary" onClick={openCreateColumnModal}>
              <Plus className="w-3.5 h-3.5" /> Column
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-3 sm:px-5 lg:px-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Open tasks</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{boardTaskList.filter((task) => task.status !== 'done').length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Members</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{projectMembers.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="flex items-center gap-1 text-xs text-slate-500"><Activity className="h-3.5 w-3.5" /> Latest activity</p>
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{recentActivity[0]?.taskTitle || 'No recent changes yet'}</p>
        </div>
      </div>

      {/* Board content */}
      {boardView === 'kanban' ? (
        <div key="kanban-view" className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full min-h-0 gap-4 p-4 sm:p-5 lg:p-6" style={{ minWidth: visibleColumns.length * 308 + 'px' }}>
              <SortableContext items={visibleColumns.map((col) => `column:${col.id}`)} strategy={horizontalListSortingStrategy}>
                {visibleColumns.map((col) => {
                  const colTasks = getFilteredTasksForColumn(col.id);
                  return (
                    <SortableContext key={col.id} items={colTasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                      <KanbanColumn
                        column={col}
                        tasks={colTasks}
                        projectId={projectId}
                        canManageColumns={canManageColumns}
                        onEditColumn={openEditColumnModal}
                        onDeleteColumn={handleDeleteColumn}
                        onArchiveColumn={handleArchiveColumn}
                        onOpenTask={setSelectedTaskId}
                        onQuickCreateTask={handleQuickCreateTask}
                      />
                    </SortableContext>
                  );
                })}
              </SortableContext>
            </div>
            {typeof document !== 'undefined' ? createPortal(dragOverlay, document.body) : dragOverlay}
          </DndContext>
        </div>
      ) : (
        <div key="list-view" className="flex-1 overflow-auto p-4 tab-panel-transition sm:p-5 lg:p-6">
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
            {Object.values(tasks).map((task) => (
              <button
                key={task._id}
                type="button"
                onClick={() => setSelectedTaskId(task._id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800/80 dark:focus:bg-slate-800/80 sm:flex-nowrap sm:gap-4"
              >
                <span className="w-20 flex-shrink-0 truncate text-sm text-slate-400">{columnNameById.get(task.column) || task.column.replace('_', ' ')}</span>
                <span className="min-w-0 flex-1 basis-[calc(100%-6rem)] truncate text-sm font-medium text-slate-900 dark:text-white sm:basis-auto">{task.title}</span>
                {task.assignee && <Avatar name={task.assignee.name} avatar={task.assignee.avatar} size="xs" />}
                {task.dueDate && <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString()}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {canCreate && (
        <button
          type="button"
          onClick={() => handleQuickCreateTask(visibleColumns[0]?.id || 'todo', 'Untitled task')}
          className="fixed bottom-5 right-5 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-950/40 transition-transform hover:-translate-y-0.5 hover:bg-blue-500"
          title="Quick create task"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      <TaskDrawer projectId={projectId} taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />

      <Modal
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Board Members"
        size="xl"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Current members</p>
              <span className="text-xs text-slate-400">{projectMembers.length} total</span>
            </div>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {projectMembers.map((member) => {
                const isOwner = ownerId === member._id;
                return (
                  <div key={member._id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <Avatar name={member.name || 'User'} avatar={member.avatar} size="sm" status={member.onlineStatus || 'offline'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{member.name || 'User'}</p>
                      <p className="truncate text-xs text-slate-500">{member.email || member.role}</p>
                    </div>
                    {isOwner && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Owner
                      </span>
                    )}
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={removingMember}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                        title="Remove from board"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Add member</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search active users"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {addableUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => handleAddMember(user._id)}
                  disabled={addingMember}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                >
                  <Avatar name={user.name || 'User'} avatar={user.avatar} size="sm" status={user.onlineStatus || 'offline'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <UserPlus className="h-4 w-4 text-blue-500" />
                </button>
              ))}
              {addableUsers.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
                  No users available to add.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!columnModal}
        onClose={closeColumnModal}
        title={columnModal?.mode === 'edit' ? 'Edit Column' : 'Add Column'}
        size="sm"
      >
        <form onSubmit={handleSaveColumn} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
            <input
              value={columnForm.name}
              onChange={(e) => setColumnForm((current) => ({ ...current, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Color</span>
            <input
              type="color"
              value={columnForm.color}
              onChange={(e) => setColumnForm((current) => ({ ...current, color: e.target.value }))}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeColumnModal}>Cancel</Button>
            <Button type="submit" loading={addingColumn || updatingColumn}>
              {columnModal?.mode === 'edit' ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
