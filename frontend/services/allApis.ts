import { baseApi } from './baseApi';

// ── Comments ──────────────────────────────────────────────────────────────────

export interface Comment {
  _id: string;
  text: string;
  task: string;
  author: { _id: string; name: string; avatar: string };
  mentions: Array<{ _id: string; name: string; avatar: string }>;
  reactions: Array<{ emoji: string; users: string[] }>;
  createdAt: string;
  updatedAt: string;
}

export const commentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<Comment[], string>({
      query: (taskId) => `/comments?taskId=${taskId}`,
      providesTags: ['Comment'],
    }),
    createComment: builder.mutation<Comment, { text: string; taskId: string; mentionIds?: string[] }>({
      query: (body) => ({ url: '/comments', method: 'POST', body }),
      invalidatesTags: ['Comment'],
    }),
    updateComment: builder.mutation<Comment, { id: string; text: string }>({
      query: ({ id, text }) => ({ url: `/comments/${id}`, method: 'PATCH', body: { text } }),
      invalidatesTags: ['Comment'],
    }),
    deleteComment: builder.mutation<void, string>({
      query: (id) => ({ url: `/comments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Comment'],
    }),
    toggleReaction: builder.mutation<Comment, { id: string; emoji: string }>({
      query: ({ id, emoji }) => ({ url: `/comments/${id}/reactions`, method: 'POST', body: { emoji } }),
      invalidatesTags: ['Comment'],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useToggleReactionMutation,
} = commentsApi;

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string;
  onlineStatus: string;
  theme: string;
  notificationPrefs: Record<string, boolean>;
  createdAt: string;
  invitedBy?: { _id: string; name: string; email: string };
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<AppUser[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUser: builder.query<AppUser, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'User', id }],
    }),
    updateUser: builder.mutation<AppUser, { id: string; data: Partial<AppUser> }>({
      query: ({ id, data }) => ({ url: `/users/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'User', id }, { type: 'User', id: 'ME' }],
    }),
    changePassword: builder.mutation<void, { id: string; oldPassword: string; newPassword: string }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}/password`, method: 'PATCH', body }),
    }),
    getRecentlyViewed: builder.query<unknown[], void>({
      query: () => '/users/me/recently-viewed',
    }),
    getMyStats: builder.query<unknown, void>({
      query: () => '/users/me/stats',
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
  useGetRecentlyViewedQuery,
  useGetMyStatsQuery,
} = usersApi;

// ── Invites ───────────────────────────────────────────────────────────────────

export interface InviteLink {
  _id: string;
  token: string;
  role: string;
  createdBy: { name: string; email: string };
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  status: string;
  createdAt: string;
}

export const invitesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvites: builder.query<InviteLink[], void>({
      query: () => '/invites',
      providesTags: ['Invite'],
    }),
    createInvite: builder.mutation<InviteLink, { role: string; projectId?: string; expiresIn?: number | null; maxUses?: number }>({
      query: (body) => ({ url: '/invites', method: 'POST', body }),
      invalidatesTags: ['Invite'],
    }),
    revokeInvite: builder.mutation<void, string>({
      query: (id) => ({ url: `/invites/${id}/revoke`, method: 'PATCH' }),
      invalidatesTags: ['Invite'],
    }),
    deleteInvite: builder.mutation<void, string>({
      query: (id) => ({ url: `/invites/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Invite'],
    }),
  }),
});

export const { useGetInvitesQuery, useCreateInviteMutation, useRevokeInviteMutation, useDeleteInviteMutation } = invitesApi;

// ── Permissions ───────────────────────────────────────────────────────────────

export const permissionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<Record<string, Record<string, boolean>>, void>({
      query: () => '/permissions',
      providesTags: ['Permission'],
    }),
    updatePermissions: builder.mutation<unknown, { role: string; features: Record<string, boolean> }>({
      query: ({ role, features }) => ({ url: `/permissions/${role}`, method: 'PATCH', body: features }),
      invalidatesTags: ['Permission'],
    }),
    getAuditLog: builder.query<unknown[], void>({
      query: () => '/permissions/audit-log',
    }),
  }),
});

export const { useGetPermissionsQuery, useUpdatePermissionsMutation, useGetAuditLogQuery } = permissionsApi;

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<{ notifications: unknown[]; total: number }, { page?: number }>({
      query: (params) => ({ url: '/notifications', params }),
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<number, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi;

// ── Super Admin ───────────────────────────────────────────────────────────────

export const superAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSuperAdminUsers: builder.query<{ users: AppUser[]; total: number }, { search?: string; role?: string; status?: string; page?: number }>({
      query: (params) => ({ url: '/super-admin/users', params }),
      providesTags: ['User'],
    }),
    getPendingApprovals: builder.query<AppUser[], void>({
      query: () => '/super-admin/pending-approvals',
      providesTags: ['User'],
    }),
    getAdminStats: builder.query<unknown, void>({
      query: () => '/super-admin/stats',
    }),
    getAllWorkspaces: builder.query<unknown[], void>({
      query: () => '/super-admin/workspaces',
      providesTags: ['Project'],
    }),
    approveUser: builder.mutation<AppUser, string>({
      query: (id) => ({ url: `/super-admin/users/${id}/approve`, method: 'PATCH' }),
      invalidatesTags: ['User'],
    }),
    rejectUser: builder.mutation<AppUser, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/super-admin/users/${id}/reject`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    banUser: builder.mutation<AppUser, string>({
      query: (id) => ({ url: `/super-admin/users/${id}/ban`, method: 'PATCH' }),
      invalidatesTags: ['User'],
    }),
    unbanUser: builder.mutation<AppUser, string>({
      query: (id) => ({ url: `/super-admin/users/${id}/unban`, method: 'PATCH' }),
      invalidatesTags: ['User'],
    }),
    deleteAdminUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/super-admin/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    archiveWorkspace: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/super-admin/workspaces/${id}/archive`, method: 'PATCH' }),
      invalidatesTags: ['Project'],
    }),
    deleteWorkspace: builder.mutation<void, string>({
      query: (id) => ({ url: `/super-admin/workspaces/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),
  }),
});

export const {
  useGetSuperAdminUsersQuery,
  useGetPendingApprovalsQuery,
  useGetAdminStatsQuery,
  useGetAllWorkspacesQuery,
  useApproveUserMutation,
  useRejectUserMutation,
  useBanUserMutation,
  useUnbanUserMutation,
  useDeleteAdminUserMutation,
  useArchiveWorkspaceMutation,
  useDeleteWorkspaceMutation,
} = superAdminApi;
