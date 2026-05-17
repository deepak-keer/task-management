import { baseApi } from './baseApi';
import { TaskCard } from '../store/slices/boardSlice';

interface TaskFilters {
  projectId?: string;
  status?: string;
  assignee?: string;
  priority?: string;
  search?: string;
}

type CreateTaskInput = Partial<TaskCard> & {
  projectId: string;
  title: string;
  status: string;
  column: string;
  assigneeId?: string;
};

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<TaskCard[], TaskFilters>({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: (result) =>
        result
          ? [
              { type: 'Task' as const, id: 'LIST' },
              ...result.map((task) => ({ type: 'Task' as const, id: task._id })),
            ]
          : [{ type: 'Task' as const, id: 'LIST' }],
    }),
    getMyTasks: builder.query<TaskCard[], void>({
      query: () => '/tasks/my',
      providesTags: (result) =>
        result
          ? [
              { type: 'Task' as const, id: 'MY' },
              ...result.map((task) => ({ type: 'Task' as const, id: task._id })),
            ]
          : [{ type: 'Task' as const, id: 'MY' }],
    }),
    getOverdueTasks: builder.query<TaskCard[], void>({
      query: () => '/tasks/overdue',
      providesTags: (result) =>
        result
          ? [
              { type: 'Task' as const, id: 'OVERDUE' },
              ...result.map((task) => ({ type: 'Task' as const, id: task._id })),
            ]
          : [{ type: 'Task' as const, id: 'OVERDUE' }],
    }),
    getTask: builder.query<TaskCard, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<TaskCard, CreateTaskInput>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id: 'MY' },
        { type: 'Task', id: 'OVERDUE' },
      ],
    }),
    updateTask: builder.mutation<TaskCard, { id: string; data: Partial<TaskCard> & { assigneeId?: string | null } }>({
      query: ({ id, data }) => ({ url: `/tasks/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Task', id }],
    }),
    moveTask: builder.mutation<TaskCard, { id: string; column: string; status: string; order: number }>({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}/move`, method: 'PATCH', body }),
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id: 'MY' },
        { type: 'Task', id: 'OVERDUE' },
      ],
    }),
    addSubtask: builder.mutation<TaskCard, { taskId: string; title: string }>({
      query: ({ taskId, title }) => ({ url: `/tasks/${taskId}/subtasks`, method: 'POST', body: { title } }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Task', id: taskId }],
    }),
    toggleSubtask: builder.mutation<TaskCard, { taskId: string; subtaskId: string }>({
      query: ({ taskId, subtaskId }) => ({ url: `/tasks/${taskId}/subtasks/${subtaskId}`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Task', id: taskId }],
    }),
    watchTask: builder.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}/watch`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    unwatchTask: builder.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}/watch`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    addAttachment: builder.mutation<TaskCard, { taskId: string; url: string; name: string; size: number }>({
      query: ({ taskId, ...body }) => ({ url: `/tasks/${taskId}/attachments`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Task', id: taskId }],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetMyTasksQuery,
  useGetOverdueTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useDeleteTaskMutation,
  useAddSubtaskMutation,
  useToggleSubtaskMutation,
  useWatchTaskMutation,
  useUnwatchTaskMutation,
  useAddAttachmentMutation,
} = tasksApi;
