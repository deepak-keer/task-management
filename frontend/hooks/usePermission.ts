// hooks/usePermission.ts
import { useAppSelector } from '../store/index';

export const usePermission = (feature: string): boolean => {
  const { user, permissions } = useAppSelector((s) => s.auth);
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const rolePermissions = permissions?.[user.role] as unknown;
  if (!rolePermissions || typeof rolePermissions !== 'object') return false;

  const maybeNested = rolePermissions as { features?: Record<string, boolean> };
  const features =
    maybeNested.features && typeof maybeNested.features === 'object'
      ? maybeNested.features
      : (rolePermissions as Record<string, boolean>);

  return !!features?.[feature];
};
