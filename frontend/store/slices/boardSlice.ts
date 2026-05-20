import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TaskCard {
  _id: string;
  title: string;
  description: string;
  status: string;
  column: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  order: number;
  assignee: { _id: string; name: string; avatar: string } | null;
  createdBy: { _id: string; name: string; avatar: string };
  dueDate: string | null;
  labels: string[];
  subtasks: Array<{ id: string; title: string; done: boolean }>;
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string | Date;
  }>;
  watchers: string[];
  activityLog?: Array<{
    action: string;
    performedBy: string | { _id: string; name: string; avatar?: string };
    performedAt: string | Date;
    meta: Record<string, unknown>;
  }>;
  project: string | { _id: string; name: string; columns?: BoardColumn[] } | null;
  createdAt: string;
  updatedAt: string;
  _commentCount?: number;
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  color: string;
  archived?: boolean;
}

interface BoardState {
  columns: Record<string, BoardColumn>;
  tasks: Record<string, TaskCard>;
  taskOrder: Record<string, string[]>; // columnId -> taskIds
  activeProjectId: string | null;
  previousState: {
    tasks: Record<string, TaskCard>;
    taskOrder: Record<string, string[]>;
  } | null;
}

const initialState: BoardState = {
  columns: {},
  tasks: {},
  taskOrder: {},
  activeProjectId: null,
  previousState: null,
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setBoard(
      state,
      action: PayloadAction<{
        columns: BoardColumn[];
        tasks: TaskCard[];
        projectId: string;
      }>,
    ) {
      const { columns, tasks, projectId } = action.payload;
      state.activeProjectId = projectId;
      state.columns = {};
      state.tasks = {};
      state.taskOrder = {};

      for (const col of columns) {
        state.columns[col.id] = col;
        state.taskOrder[col.id] = [];
      }

      for (const task of tasks) {
        state.tasks[task._id] = task;
        if (state.taskOrder[task.column]) {
          state.taskOrder[task.column].push(task._id);
        }
      }

      for (const colId of Object.keys(state.taskOrder)) {
        state.taskOrder[colId].sort(
          (a, b) => (state.tasks[a]?.order ?? 0) - (state.tasks[b]?.order ?? 0),
        );
      }
    },

    optimisticMoveTask(
      state,
      action: PayloadAction<{
        taskId: string;
        fromColumn: string;
        toColumn: string;
        newOrder: string[];
      }>,
    ) {
      const { taskId, fromColumn, toColumn, newOrder } = action.payload;

      // Save snapshot for rollback
      state.previousState = {
        tasks: { ...state.tasks },
        taskOrder: JSON.parse(JSON.stringify(state.taskOrder)),
      };

      // Update task column
      if (state.tasks[taskId]) {
        state.tasks[taskId].column = toColumn;
        state.tasks[taskId].status = toColumn;
      }

      // Remove from old column
      state.taskOrder[fromColumn] = state.taskOrder[fromColumn]?.filter((id) => id !== taskId) ?? [];

      // Set new order for destination column
      state.taskOrder[toColumn] = newOrder;

      // Update order numbers
      newOrder.forEach((id, index) => {
        if (state.tasks[id]) state.tasks[id].order = index;
      });
    },

    rollbackMove(state) {
      if (state.previousState) {
        state.tasks = state.previousState.tasks;
        state.taskOrder = state.previousState.taskOrder;
        state.previousState = null;
      }
    },

    confirmMove(state) {
      state.previousState = null;
    },

    addTask(state, action: PayloadAction<TaskCard>) {
      const task = action.payload;
      state.tasks[task._id] = task;
      if (!state.taskOrder[task.column]) state.taskOrder[task.column] = [];
      if (!state.taskOrder[task.column].includes(task._id)) {
        state.taskOrder[task.column].push(task._id);
      }
    },

    updateTask(state, action: PayloadAction<TaskCard>) {
      const task = action.payload;
      if (state.tasks[task._id]) {
        const oldColumn = state.tasks[task._id].column;
        state.tasks[task._id] = task;
        if (oldColumn !== task.column) {
          state.taskOrder[oldColumn] = state.taskOrder[oldColumn]?.filter((id) => id !== task._id) ?? [];
          if (!state.taskOrder[task.column]) state.taskOrder[task.column] = [];
          state.taskOrder[task.column].push(task._id);
        }
        state.taskOrder[task.column] = (state.taskOrder[task.column] || []).sort(
          (a, b) => (state.tasks[a]?.order ?? 0) - (state.tasks[b]?.order ?? 0),
        );
      }
    },

    removeTask(state, action: PayloadAction<string>) {
      const taskId = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        state.taskOrder[task.column] = state.taskOrder[task.column]?.filter((id) => id !== taskId) ?? [];
        delete state.tasks[taskId];
      }
    },

    clearBoard(state) {
      state.columns = {};
      state.tasks = {};
      state.taskOrder = {};
      state.activeProjectId = null;
      state.previousState = null;
    },
  },
});

export const {
  setBoard,
  optimisticMoveTask,
  rollbackMove,
  confirmMove,
  addTask,
  updateTask,
  removeTask,
  clearBoard,
} = boardSlice.actions;
export default boardSlice.reducer;
