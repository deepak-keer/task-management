// hooks/useAuth.ts
import { useAppSelector, useAppDispatch } from '../store/index';
import { logout } from '../store/slices/authSlice';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const auth = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return { ...auth, logout: handleLogout };
};
