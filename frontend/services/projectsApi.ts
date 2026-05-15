import { baseApi } from './baseApi';

export interface Project {
  _id: string;
  name: string;
  description: string;
  owner: { _id: string; name: string; email: string; avatar: string };
  members: Array<{ _id: string; name: string; email: string; avatar: string; role: string; onlineStatus: string }>;
  columns: Array<{ id: string; name: string; order: number; color: string }>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<Project, { name: string; description?: string }>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<Project, { id: string; data: Partial<Project> }>({
      query: ({ id, data }) => ({ url: `/projects/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Project', id }],
    }),
    archiveProject: builder.mutation<Project, string>({
      query: (id) => ({ url: `/projects/${id}/archive`, method: 'PATCH' }),
      invalidatesTags: ['Project'],
    }),
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),
    addProjectMember: builder.mutation<Project, { projectId: string; userId: string }>({
      query: ({ projectId, userId }) => ({
        url: `/projects/${projectId}/members`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: 'Project', id: projectId }],
    }),
    removeProjectMember: builder.mutation<Project, { projectId: string; userId: string }>({
      query: ({ projectId, userId }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: 'Project', id: projectId }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
} = projectsApi;
