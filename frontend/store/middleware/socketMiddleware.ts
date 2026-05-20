import { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import React from 'react';
import toast from 'react-hot-toast';
import { setCredentials, logout, setPermissions } from '../slices/authSlice';
import { addTask, updateTask, removeTask } from '../slices/boardSlice';
import { addNotification } from '../slices/notificationSlice';
import { connectSocket, setConnected, setUserOnline, setUserOffline, updateUserStatus, setTyping } from '../slices/socketSlice';
import { baseApi } from '../../services/baseApi';

let socket: Socket | null = null;
let banChannel: BroadcastChannel | null = null;
let banStorageListenerBound = false;

const taskListTags = [
  { type: 'Task' as const, id: 'LIST' },
  { type: 'Task' as const, id: 'MY' },
  { type: 'Task' as const, id: 'OVERDUE' },
];

type SocketState = {
  auth: {
    token: string | null;
    user: { _id: string; role: string } | null;
    permissions: Record<string, unknown>;
  };
};

const isVisibleTaskForUser = (task: { assignee?: { _id?: string } | string | null }, state: SocketState) => {
  const user = state.auth.user;
  if (!user || user.role !== 'member') return true;
  const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee?._id;
  return assigneeId === user._id;
};

const showNotificationToast = (notification: { message: string; link?: string }) => {
  toast.custom(
    (t) =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => {
          toast.dismiss(t.id);
          if (notification.link) window.location.href = notification.link;
          },
          className: `pointer-events-auto w-80 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left text-slate-100 shadow-lg transition-all ${
            t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`,
        },
        React.createElement(
          'span',
          { className: 'block text-xs font-semibold uppercase tracking-wide text-blue-300' },
          'New notification',
        ),
        React.createElement(
          'span',
          { className: 'mt-1 block text-sm leading-snug' },
          notification.message,
        ),
        notification.link
          ? React.createElement(
              'span',
              { className: 'mt-2 block text-xs font-medium text-blue-300' },
              'Open',
            )
          : null,
      ),
    { duration: 5000 },
  );
};

const logoutBannedUser = (store: MiddlewareAPI) => {
  toast.error('Your account has been suspended.');
  socket?.disconnect();
  socket = null;
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(logout());
  window.location.replace('/login');
};

const notifyOtherTabsAboutBan = (userId: string) => {
  if (typeof window === 'undefined') return;

  banChannel?.postMessage({ userId });
  localStorage.setItem('banned-user-logout', JSON.stringify({ userId, at: Date.now() }));
};

const ensureBanChannel = (store: MiddlewareAPI) => {
  if (typeof window === 'undefined') return;

  if (!banChannel && 'BroadcastChannel' in window) {
    banChannel = new BroadcastChannel('auth-ban');
    banChannel.onmessage = (event) => {
      const userId = event.data?.userId;
      const state = store.getState() as SocketState;
      if (userId && state.auth.user?._id === userId) {
        logoutBannedUser(store);
      }
    };
  }

  if (!banStorageListenerBound) {
    banStorageListenerBound = true;
    window.addEventListener('storage', (event) => {
      if (event.key !== 'banned-user-logout' || !event.newValue) return;

      try {
        const { userId } = JSON.parse(event.newValue) as { userId?: string };
        const state = store.getState() as SocketState;
        if (userId && state.auth.user?._id === userId) {
          logoutBannedUser(store);
        }
      } catch {
        // Ignore malformed cross-tab messages.
      }
    });
  }
};

export const socketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState() as SocketState;
  ensureBanChannel(store);

  if (setCredentials.match(action) || connectSocket.match(action)) {
    const token = setCredentials.match(action) ? action.payload.accessToken : state.auth.token;
    if (!token) return result;
    if (socket) socket.disconnect();

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'https://task-management-k9q8.onrender.com', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      store.dispatch(setConnected(true));
    });

    socket.on('disconnect', () => {
      store.dispatch(setConnected(false));
    });

    socket.on('connect_error', () => {
      store.dispatch(setConnected(false));
    });

    socket.on('task-created', (task) => {
      if (isVisibleTaskForUser(task, store.getState() as SocketState)) {
        store.dispatch(addTask(task));
      }
      store.dispatch(baseApi.util.invalidateTags([...taskListTags, 'Project']));
    });

    socket.on('task-updated', (task) => {
      if (isVisibleTaskForUser(task, store.getState() as SocketState)) {
        store.dispatch(updateTask(task));
      } else {
        store.dispatch(removeTask(task._id));
      }
      store.dispatch(baseApi.util.invalidateTags([...taskListTags, 'Project', { type: 'Task', id: task._id }]));
    });

    socket.on('task-moved', ({ task }) => {
      if (isVisibleTaskForUser(task, store.getState() as SocketState)) {
        store.dispatch(updateTask(task));
      } else {
        store.dispatch(removeTask(task._id));
      }
    });

    socket.on('task-deleted', ({ taskId }) => {
      store.dispatch(removeTask(taskId));
      store.dispatch(baseApi.util.invalidateTags(taskListTags));
    });

    socket.on('comment-added', ({ taskId }) => {
      store.dispatch(baseApi.util.invalidateTags(['Comment', { type: 'Task', id: taskId }]));
    });

    socket.on('project-updated', (project) => {
      store.dispatch(baseApi.util.invalidateTags([{ type: 'Project', id: project._id }, 'Project']));
    });

    socket.on('notification', (notification) => {
      store.dispatch(addNotification(notification));
      store.dispatch(baseApi.util.invalidateTags(['Notification']));
      showNotificationToast(notification);
    });

    socket.on('announcement-created', (announcement) => {
      store.dispatch(baseApi.util.invalidateTags(['Announcement']));
      if (announcement?.title) {
        toast.success(`Announcement: ${announcement.title}`);
      }
    });

    socket.on('announcement-updated', () => {
      store.dispatch(baseApi.util.invalidateTags(['Announcement']));
    });

    socket.on('announcement-deleted', () => {
      store.dispatch(baseApi.util.invalidateTags(['Announcement']));
    });

    socket.on('user-joined-board', ({ userId }) => {
      store.dispatch(setUserOnline({ userId, status: 'online' }));
    });

    socket.on('user-left-board', ({ userId }) => {
      store.dispatch(setUserOffline(userId));
    });

    socket.on('online-status-changed', ({ userId, status }) => {
      store.dispatch(updateUserStatus({ userId, status }));
    });

    socket.on('typing-comment', ({ userId, taskId, isTyping }) => {
      store.dispatch(setTyping({ userId, taskId, isTyping }));
    });

    socket.on('permissions-updated', (data) => {
      const { auth } = store.getState() as SocketState;
      const updatedPermissions = {
        ...(auth.permissions || {}),
        [data.role]: data.features,
      };
      store.dispatch(setPermissions(updatedPermissions as Parameters<typeof setPermissions>[0]));
      store.dispatch(baseApi.util.invalidateTags(['Permission']));
    });

    socket.on('notification-preferences-updated', () => {
      store.dispatch(baseApi.util.invalidateTags([{ type: 'User', id: 'NOTIFICATION_PREFERENCES' }]));
    });

    socket.on('user-approved', () => {
      window.location.href = '/dashboard';
    });

    socket.on('user-rejected', () => {
      window.location.href = '/rejected';
    });

    socket.on('user-banned', ({ userId } = {}) => {
      const currentUserId = (store.getState() as SocketState).auth.user?._id;
      if (!userId || userId === currentUserId) {
        if (currentUserId) notifyOtherTabsAboutBan(currentUserId);
        logoutBannedUser(store);
      }
    });

    socket.on('account-status-changed', ({ userId, status } = {}) => {
      const currentUserId = (store.getState() as SocketState).auth.user?._id;
      if (status === 'banned' && userId === currentUserId) {
        notifyOtherTabsAboutBan(userId);
        logoutBannedUser(store);
      }
    });
  }

  if (logout.match(action)) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  return result;
};

export const getSocket = () => socket;
