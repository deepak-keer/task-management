import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'member';
  avatar: string;
  theme: 'light' | 'dark';
  onlineStatus: 'online' | 'away' | 'dnd';
  notificationPrefs: {
    taskAssigned: boolean;
    commentAdded: boolean;
    mentioned: boolean;
    dueDateReminder: boolean;
  };
  status: string;
}

export interface RolePermissions {
  invite_members: boolean;
  remove_members: boolean;
  create_projects: boolean;
  delete_projects: boolean;
  archive_projects: boolean;
  assign_roles: boolean;
  view_analytics: boolean;
  manage_columns: boolean;
  create_tasks: boolean;
  delete_own_tasks: boolean;
  delete_any_task: boolean;
  move_tasks: boolean;
  assign_tasks: boolean;
  comment_on_tasks: boolean;
  view_all_projects: boolean;
  export_tasks: boolean;
  watch_tasks: boolean;
  upload_attachments: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: Record<string, RolePermissions> | null;
}

type PermissionsPayload = Record<string, RolePermissions | { features?: RolePermissions }>;

const normalizePermissions = (
  permissions: PermissionsPayload | null | undefined,
): Record<string, RolePermissions> | null => {
  if (!permissions) return null;

  return Object.fromEntries(
    Object.entries(permissions).map(([role, value]) => [
      role,
      'features' in value && value.features ? value.features : (value as RolePermissions),
    ]),
  );
};

const getInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const permsStr = localStorage.getItem('permissions');
    if (token && userStr) {
      try {
        return {
          token,
          user: JSON.parse(userStr),
          isAuthenticated: true,
          permissions: normalizePermissions(permsStr ? JSON.parse(permsStr) : null),
        };
      } catch {
        return { user: null, token: null, isAuthenticated: false, permissions: null };
      }
    }
  }
  return { user: null, token: null, isAuthenticated: false, permissions: null };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        permissions?: PermissionsPayload;
      }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.permissions = normalizePermissions(action.payload.permissions) ?? state.permissions;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', action.payload.accessToken);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        if (state.permissions) {
          localStorage.setItem('permissions', JSON.stringify(state.permissions));
        }
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.permissions = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
      }
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      }
    },
    setPermissions(state, action: PayloadAction<PermissionsPayload>) {
      state.permissions = normalizePermissions(action.payload);
      if (typeof window !== 'undefined') {
        localStorage.setItem('permissions', JSON.stringify(state.permissions));
      }
    },
  },
});

export const { setCredentials, logout, updateUser, setPermissions } = authSlice.actions;
export default authSlice.reducer;
