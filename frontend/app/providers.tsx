'use client';

import { Provider } from 'react-redux';
import { store } from '../store/index';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useGetMeQuery } from '../services/authApi';
import { useGetUnreadCountQuery } from '../services/allApis';
import { setPermissions } from '../store/slices/authSlice';
import { setUnreadCount } from '../store/slices/notificationSlice';
import { connectSocket } from '../store/slices/socketSlice';
import { useAppDispatch, useAppSelector } from '../store/index';

function ThemeApplier({ children }: { children: React.ReactNode }) {
  const theme = useAppSelector((s) => s.auth.user?.theme ?? s.ui.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  return <>{children}</>;
}

function PermissionsHydrator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (data?.permissions) {
      dispatch(setPermissions(data.permissions));
    }
  }, [data?.permissions, dispatch]);

  return null;
}

function SocketBootstrap() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(connectSocket());
    }
  }, [dispatch, isAuthenticated, token]);

  return null;
}

function NotificationHydrator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: unreadCount } = useGetUnreadCountQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (typeof unreadCount === 'number') {
      dispatch(setUnreadCount(unreadCount));
    }
  }, [dispatch, unreadCount]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeApplier>
        <PermissionsHydrator />
        <SocketBootstrap />
        <NotificationHydrator />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
          }}
        />
      </ThemeApplier>
    </Provider>
  );
}
