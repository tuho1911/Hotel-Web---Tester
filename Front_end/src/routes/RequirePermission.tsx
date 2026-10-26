import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Role } from '../store/slices/authSlice';

interface RequirePermissionProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  allowedPermissions?: string[];
}

const RequirePermission: React.FC<RequirePermissionProps> = ({ children, allowedRoles, allowedPermissions }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  const hasRole = allowedRoles ? allowedRoles.map(r => r.toUpperCase()).includes(user?.role.toUpperCase() || '') : true;
  const hasPermission = allowedPermissions ? allowedPermissions.some(p => user?.permissions?.includes(p)) : true;

  if (!user || !hasRole || !hasPermission) {
    return <Navigate to="/401" replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
