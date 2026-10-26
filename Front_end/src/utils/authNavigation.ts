import type { User } from '../store/slices/authSlice';

const permissionLandingOrder: Array<{ permission: string; path: string }> = [
  { permission: 'MANAGE_USERS', path: '/admin/users' },
  { permission: 'MANAGE_BOOKINGS', path: '/admin/bookings/manage' },
  { permission: 'MANAGE_BOOKINGS', path: '/admin/vouchers' },
  { permission: 'MANAGE_INVOICES', path: '/admin/invoices' },
  { permission: 'MANAGE_SERVICES', path: '/admin/orders' },
  { permission: 'MANAGE_ROOMS', path: '/admin/rooms' },
  { permission: 'MANAGE_INVENTORY', path: '/admin/inventory' },
  { permission: 'MANAGE_CONTENT', path: '/admin/cms' },
  { permission: 'MANAGE_ROLES', path: '/admin/roles' },
  { permission: 'VIEW_DASHBOARD', path: '/admin' },
];

export const getAuthorizedHomePath = (user: User | null | undefined): string => {
  if (!user) {
    return '/login';
  }

  const role = (user.role || '').toLowerCase();

  if (role === 'user' || role === 'guest' || role === 'customer') {
    return '/';
  }

  if (role === 'admin') {
    return '/admin';
  }

  // All other internal staff roles should land on the Modular Dashboard
  return '/staff';
};

export const canAccessPath = (user: User | null | undefined, path: string | null | undefined): boolean => {
  if (!user || !path) {
    return false;
  }

  const role = (user.role || '').toLowerCase();
  
  // Admin bypasses all front-end permission checks to ensure they can manage everything
  if (role === 'admin') {
    return true;
  }

  if (path === '/' || path.startsWith('/rooms') || path.startsWith('/services') || path.startsWith('/about') || path.startsWith('/contact')) {
    return true;
  }

  if (path.startsWith('/profile') || path.startsWith('/booking/') || path === '/staff') {
    return true;
  }

  const permissions = user.permissions ?? [];

  if (path === '/admin') {
    return permissions.includes('VIEW_DASHBOARD');
  }

  if (path.startsWith('/admin/analytics')) {
    return permissions.includes('VIEW_REPORTS');
  }

  if (path.startsWith('/admin/audit-logs')) {
    return permissions.includes('MANAGE_ROLES');
  }

  if (path.startsWith('/admin/users')) {
    return permissions.includes('MANAGE_USERS');
  }

  if (
    path.startsWith('/admin/rooms') ||
    path.startsWith('/admin/room-types') ||
    path.startsWith('/admin/cleaning') ||
    path.startsWith('/admin/amenities') ||
    path.startsWith('/staff/cleaning')
  ) {
    return permissions.includes('MANAGE_ROOMS');
  }

  if (
    path.startsWith('/admin/bookings') ||
    path.startsWith('/admin/vouchers') ||
    path.startsWith('/admin/memberships') ||
    path.startsWith('/staff/bookings') ||
    path.startsWith('/staff/vouchers') ||
    path.startsWith('/staff/memberships')
  ) {
    return permissions.includes('MANAGE_BOOKINGS');
  }

  if (path.startsWith('/admin/invoices') || path.startsWith('/staff/invoices')) {
    return permissions.includes('MANAGE_INVOICES');
  }

  if (
    path.startsWith('/admin/orders') ||
    path.startsWith('/admin/services') ||
    path.startsWith('/staff/orders')
  ) {
    return permissions.includes('MANAGE_SERVICES');
  }

  if (path.startsWith('/admin/inventory')) {
    return permissions.includes('MANAGE_INVENTORY');
  }

  if (path.startsWith('/admin/roles') || path.startsWith('/admin/settings')) {
    return permissions.includes('MANAGE_ROLES');
  }

  if (
    path.startsWith('/admin/cms') ||
    path.startsWith('/admin/attractions') ||
    path.startsWith('/admin/reviews') ||
    path.startsWith('/admin/contact')
  ) {
    return permissions.includes('MANAGE_CONTENT');
  }

  return false;
};
