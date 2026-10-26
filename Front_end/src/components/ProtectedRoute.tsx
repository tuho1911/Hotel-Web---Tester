import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Nếu cung cấp → kiểm tra role. Ví dụ: requiredRole="Admin" */
  requiredRole?: string;
  /** Nếu cung cấp → kiểm tra ít nhất một trong các permission (OR logic) */
  requiredPermissions?: string[];
  /** Nếu true → tất cả permission phải có (AND logic) */
  requireAllPermissions?: boolean;
  /** URL redirect khi không đủ quyền. Mặc định: /401 */
  forbiddenRedirect?: string;
}

/**
 * Bao bọc các route cần bảo vệ.
 *
 * Luồng:
 * 1. Chưa đăng nhập → redirect /login (lưu returnUrl)
 * 2. Đã đăng nhập nhưng sai role/permission → redirect /401
 * 3. Đủ điều kiện → render children
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions = [],
  requireAllPermissions = false,
  forbiddenRedirect = '/401',
}) => {
  const location = useLocation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const user = useAppSelector((s) => s.auth.user);

  // 1. Chưa đăng nhập → về login, lưu returnUrl
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Kiểm tra role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={forbiddenRedirect} replace />;
  }

  // 3. Kiểm tra permissions
  if (requiredPermissions.length > 0) {
    const userPerms = user.permissions ?? [];
    const hasAccess = requireAllPermissions
      ? requiredPermissions.every((p) => userPerms.includes(p))
      : requiredPermissions.some((p) => userPerms.includes(p));

    if (!hasAccess) {
      return <Navigate to={forbiddenRedirect} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
