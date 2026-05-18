'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useGetProjectQuery } from '../../../../services/projectsApi';
import { useGetTasksQuery, useCreateTaskMutation, useMoveTaskMutation } from '../../../../services/tasksApi';
import { useAppDispatch, useAppSelector } from '../../../../store/index';
import { setBoard, optimisticMoveTask, confirmMove, rollbackMove } from '../../../../store/slices/boardSlice';
import { setBoardView, setFilter } from '../../../../store/slices/uiSlice';
import { useJoinBoard } from '../../../../hooks/useSocket';
import { usePermission } from '../../../../hooks/usePermission';
import KanbanColumn from '../../../../components/board/KanbanColumn';
import TaskCard from '../../../../components/board/TaskCard';
import CreateTaskModal from '../../../../components/tasks/CreateTaskModal';
import { Avatar, SkeletonCard, Button } from '../../../../components/ui/index';
import { LayoutGrid, List, Plus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const DEFAULT_COLUMNS = [
  { id: 'todo', name: 'To Do', order: 0, color: '#64748b' },
  { id: 'in_progress', name: 'In Progress', order: 1, color: '#3b82f6' },
  { id: 'in_review', name: 'In Review', order: 2, color: '#f59e0b' },
  { id: 'done', name: 'Done', order: 3, color: '#22c55e' },
];

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const dispatch = useAppDispatch();

  const boardView = useAppSelector((s) => s.ui.boardView);
  const { columns, tasks, taskOrder } = useAppSelector((s) => s.board);
  const activeFilters = useAppSelector((s) => s.ui.activeFilters);
  const onlineUsers = useAppSelector((s) => s.socket.onlineUsers);

  const [createTaskModal, setCreateTaskModal] = useState(false);
  const [defaultColumn, setDefaultColumn] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const { data: project, isLoading: projectLoading } = useGetProjectQuery(projectId);
  const { data: taskList, isLoading: tasksLoading } = useGetTasksQuery({ projectId });
  const [moveTask] = useMoveTaskMutation();
  const projectColumns = useMemo(
    () => (Array.isArray(project?.columns) && project.columns.length > 0 ? project.columns : DEFAULT_COLUMNS),
    [project?.columns],
  );
  const projectMembers = useMemo(
    () => (Array.isArray(project?.members) ? project.members : []),
    [project?.members],
  );
  const projectTasks = useMemo(
    () => (Array.isArray(taskList) ? taskList : []),
    [taskList],
  );

  const canCreatePermission = usePermission('create_tasks');
  const canMovePermission = usePermission('move_tasks');
  const canCreate = canCreatePermission;
  const canMove = canMovePermission;

  useJoinBoard(projectId);

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
    setActiveTaskId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = e;
    if (!over || !canMove) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine destination column
    let destColumn = overId;
    if (tasks[overId]) destColumn = tasks[overId].column;

    const srcColumn = tasks[taskId]?.column;
    if (!srcColumn || srcColumn === destColumn) return;

    const newOrder = [...(taskOrder[destColumn] || [])];
    if (!newOrder.includes(taskId)) newOrder.push(taskId);

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
  const visibleColumns = sortedColumns.length > 0 ? sortedColumns : [...projectColumns].sort((a, b) => a.order - b.order);

  const getFilteredTasksForColumn = (columnId: string) => {
    const ids = taskOrder[columnId] || [];
    return ids
      .map((id) => tasks[id])
      .filter(Boolean)
      .filter((t) => {
        if (activeFilters.assignee && t.assignee?._id !== activeFilters.assignee) return false;
        if (activeFilters.priority && t.priority !== activeFilters.priority) return false;
        if (activeFilters.label && !t.labels?.includes(activeFilters.label)) return false;
        return true;
      });
  };

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 mb-4" />
        <div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex-1 space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>)}</div>
      </div>
    );
  }

  if (!project) return <div className="text-center py-20 text-slate-500">Project not found.</div>;

  return (
    <div className="flex h-full flex-col -m-4 sm:-m-5 lg:-m-6">
      {/* Board header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5 lg:px-6 lg:py-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{project.name}</h1>
        </div>

        {/* Online presence */}
        <div className="flex -space-x-2">
          {projectMembers.slice(0, 6).map((m) => (
            <Avatar key={m._id} name={m.name} avatar={m.avatar} size="xs"
              status={onlineUsers.find((u) => u.userId === m._id)?.status || 'offline'}
              className="ring-2 ring-white dark:ring-slate-900" />
          ))}
        </div>

        {/* Filters */}
        <div className="flex min-w-0 items-center gap-2">
          <select
            value={activeFilters.priority || ''}
            onChange={(e) => dispatch(setFilter({ priority: e.target.value || null }))}
            className="max-w-[140px] text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 focus:outline-none"
          >
            <option value="">Priority</option>
            {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button onClick={() => dispatch(setBoardView('kanban'))}
            className={`p-1.5 rounded-md transition-colors ${boardView === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => dispatch(setBoardView('list'))}
            className={`p-1.5 rounded-md transition-colors ${boardView === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>

        {canCreate && (
          <Button size="sm" onClick={() => { setDefaultColumn(visibleColumns[0]?.id || ''); setCreateTaskModal(true); }}>
            <Plus className="w-3.5 h-3.5" /> Task
          </Button>
        )}
      </div>

      {/* Board content */}
      {boardView === 'kanban' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4 p-4 sm:p-5 lg:p-6" style={{ minWidth: visibleColumns.length * 280 + 'px' }}>
              {visibleColumns.map((col) => {
                const colTasks = getFilteredTasksForColumn(col.id);
                return (
                  <SortableContext key={col.id} items={colTasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                    <KanbanColumn
                      column={col}
                      tasks={colTasks}
                      projectId={projectId}
                      onAddTask={() => { setDefaultColumn(col.id); setCreateTaskModal(true); }}
                    />
                  </SortableContext>
                );
              })}
            </div>
            <DragOverlay>
              {activeTaskId && tasks[activeTaskId] && (
                <TaskCard task={tasks[activeTaskId]} projectId={projectId} isDragging />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            {Object.values(tasks).map((task) => (
              <Link
                key={task._id}
                href={`/projects/${projectId}/tasks/${task._id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-700/50 dark:focus:bg-slate-700/50 transition-colors sm:flex-nowrap sm:gap-4"
              >
                <span className="w-20 flex-shrink-0 text-sm capitalize text-slate-400">{task.column.replace('_', ' ')}</span>
                <span className="min-w-0 flex-1 basis-[calc(100%-6rem)] truncate text-sm font-medium text-slate-900 dark:text-white sm:basis-auto">{task.title}</span>
                {task.assignee && <Avatar name={task.assignee.name} avatar={task.assignee.avatar} size="xs" />}
                {task.dueDate && <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString()}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {createTaskModal && (
        <CreateTaskModal
          projectId={projectId}
          defaultColumn={defaultColumn}
          columns={visibleColumns}
          members={projectMembers}
          onClose={() => setCreateTaskModal(false)}
        />
      )}
    </div>
  );
}
