import { Middleware } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import React from 'react';
import toast from 'react-hot-toast';
import { setCredentials, logout, setPermissions } from '../slices/authSlice';
import { addTask, updateTask, removeTask } from '../slices/boardSlice';
import { addNotification } from '../slices/notificationSlice';
import { connectSocket, setConnected, setUserOnline, setUserOffline, updateUserStatus, setTyping } from '../slices/socketSlice';
import { baseApi } from '../../services/baseApi';

let socket: Socket | null = null;

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

export const socketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState() as SocketState;

  if (setCredentials.match(action) || connectSocket.match(action)) {
    const token = setCredentials.match(action) ? action.payload.accessToken : state.auth.token;
    if (!token) return result;
    if (socket) socket.disconnect();

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
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
      store.dispatch(baseApi.util.invalidateTags(['Task', 'Project']));
    });

    socket.on('task-updated', (task) => {
      if (isVisibleTaskForUser(task, store.getState() as SocketState)) {
        store.dispatch(updateTask(task));
      } else {
        store.dispatch(removeTask(task._id));
      }
      store.dispatch(baseApi.util.invalidateTags(['Task', 'Project', { type: 'Task', id: task._id }]));
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
      store.dispatch(baseApi.util.invalidateTags(['Task']));
    });

    socket.on('notification', (notification) => {
      store.dispatch(addNotification(notification));
      store.dispatch(baseApi.util.invalidateTags(['Notification']));
      showNotificationToast(notification);
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

    socket.on('user-approved', () => {
      window.location.href = '/dashboard';
    });

    socket.on('user-rejected', () => {
      window.location.href = '/rejected';
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
