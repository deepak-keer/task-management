import { baseApi } from './baseApi';
import { RolePermissions, User } from '../store/slices/authSlice';

interface LoginResponse {
  accessToken: string;
  user: User;
  permissions: Record<string, RolePermissions>;
}

interface RegisterResponse {
  message: string;
}

interface ValidateInviteResponse {
  valid: boolean;
  role?: string;
  invite?: {
    _id: string;
    role: string;
    createdBy: { name: string; email: string };
    expiresAt: string | null;
    maxUses: number;
    usedCount: number;
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<RegisterResponse, { name: string; email: string; password: string; token: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    getMe: builder.query<{ user: User; permissions: Record<string, RolePermissions> }, void>({
      query: () => '/auth/me',
      providesTags: [{ type: 'User', id: 'ME' }],
    }),
    validateInvite: builder.query<ValidateInviteResponse, string>({
      query: (token) => `/invites/validate/${token}`,
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetMeQuery, useValidateInviteQuery } = authApi;
