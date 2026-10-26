import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

/** Typed dispatch hook */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/** Typed selector hook */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Hook kiểm tra permission.
 * Ví dụ: const canManageUsers = usePermission('ManageUsers');
 */
export const usePermission = (permission: string): boolean => {
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? []);
  return permissions.includes(permission);
};

/** Kiểm tra có ít nhất một permission trong danh sách */
export const useAnyPermission = (requiredPermissions: string[]): boolean => {
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? []);
  return requiredPermissions.some((permission) => permissions.includes(permission));
};

/**
 * Hook kiểm tra role.
 * Ví dụ: const isAdmin = useRole('Admin');
 */
export const useRole = (role: string): boolean => {
  const userRole = useAppSelector((s) => s.auth.user?.role ?? '');
  return userRole === role;
};

/** Kiểm tra nhiều permission cùng lúc (AND logic) */
export const usePermissions = (requiredPermissions: string[]): boolean => {
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? []);
  return requiredPermissions.every((p) => permissions.includes(p));
};
