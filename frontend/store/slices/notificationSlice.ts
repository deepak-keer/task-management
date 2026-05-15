import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppNotification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  link: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
  } as NotificationState,
  reducers: {
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    setNotifications(state, action: PayloadAction<AppNotification[]>) {
      state.notifications = action.payload;
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find((n) => n._id === action.payload);
      if (n && !n.read) {
        n.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead(state) {
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    },
    removeNotification(state, action: PayloadAction<string>) {
      const n = state.notifications.find((n) => n._id === action.payload);
      if (n && !n.read) state.unreadCount = Math.max(0, state.unreadCount - 1);
      state.notifications = state.notifications.filter((n) => n._id !== action.payload);
    },
  },
});

export const {
  addNotification,
  setNotifications,
  setUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
} = notificationSlice.actions;
export default notificationSlice.reducer;
