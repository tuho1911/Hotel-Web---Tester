import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RequirePermission from './RequirePermission';
import { useAppSelector } from '../hooks/useAppStore';
import { canAccessPath, getAuthorizedHomePath } from '../utils/authNavigation';

const MainLayout = lazy(() => import('../layouts/MainLayout'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const StaffLayout = lazy(() => import('../layouts/StaffLayout'));

const Home = lazy(() => import('../pages/public/Home'));
const Rooms = lazy(() => import('../pages/public/Rooms'));
const RoomDetail = lazy(() => import('../pages/public/RoomDetail'));
const Booking = lazy(() => import('../pages/public/Booking'));
const Services = lazy(() => import('../pages/public/Services'));
const About = lazy(() => import('../pages/public/About'));
const Contact = lazy(() => import('../pages/public/Contact'));
const Articles = lazy(() => import('../pages/public/Articles'));
const ArticleDetail = lazy(() => import('../pages/public/ArticleDetail'));
const Attractions = lazy(() => import('../pages/public/Attractions'));
const ProfilePage = lazy(() => import('../pages/admin/Profile'));

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const RoomsPage = lazy(() => import('../pages/admin/RoomsPage'));
const RoomTypeManagement = lazy(() => import('../pages/admin/RoomTypeManagement'));
const RoleManagement = lazy(() => import('../pages/admin/RoleManagement'));
const InventoryPage = lazy(() => import('../pages/admin/InventoryPage'));
const DamageLossPage = lazy(() => import('../pages/admin/DamageLossPage'));
const ReviewManagement = lazy(() => import('../pages/admin/ReviewManagement'));
const CleaningPage = lazy(() => import('../pages/admin/CleaningPage'));
const AttractionsPage = lazy(() => import('../pages/admin/AttractionsPage'));
const AmenitiesPage = lazy(() => import('../pages/admin/AmenitiesPage'));
const CMSPage = lazy(() => import('../pages/admin/CMS'));
const BookingManagementPage = lazy(() => import('../pages/admin/BookingManagement'));
const RoomMapPage = lazy(() => import('../pages/admin/RoomMapPage'));
const ServiceManagementPage = lazy(() => import('../pages/admin/ServiceManagement'));
const InvoiceManagementPage = lazy(() => import('../pages/staff/InvoiceManagement'));
const VoucherManagementPage = lazy(() => import('../pages/admin/VoucherManagement'));
const MembershipManagementPage = lazy(() => import('../pages/admin/MembershipManagement'));
const ServiceOrderManagementPage = lazy(() => import('../pages/staff/ServiceOrderManagement'));
const AuditLogsPage = lazy(() => import('../pages/admin/AuditLogsPage'));
const AnalyticsPage = lazy(() => import('../pages/admin/AnalyticsPage'));
const SystemSettingsPage = lazy(() => import('../pages/admin/SystemSettingsPage'));
const ContactManagementPage = lazy(() => import('../pages/admin/ContactManagement'));
const UnauthorizedPage = lazy(() => import('../pages/errors/UnauthorizedPage'));

const StaffBookingPage = lazy(() => import('../pages/admin/BookingManagement'));
const StaffInvoicePage = lazy(() => import('../pages/staff/InvoiceManagement'));
const StaffCleaningPage = lazy(() => import('../pages/admin/CleaningPage'));
const StaffDashboard = lazy(() => import('../pages/staff/StaffDashboard'));

const LoadingScreen = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-dark-base text-primary font-display text-2xl animate-pulse">
    Đang tải...
  </div>
);

const AppRoutes: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const homePath = getAuthorizedHomePath(user);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/news" element={<Articles />} />
          <Route path="/news/:slug" element={<ArticleDetail />} />
          <Route path="/attractions" element={<Attractions />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/:roomId"
            element={<Booking />}
          />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <Navigate to={isAuthenticated ? homePath : '/login'} replace />
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <RequirePermission allowedPermissions={['VIEW_DASHBOARD']}>
                <AdminDashboard />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission allowedPermissions={['VIEW_REPORTS']}>
                <AnalyticsPage />
              </RequirePermission>
            }
          />
          <Route 
            path="users" 
            element={
              <RequirePermission allowedPermissions={['MANAGE_USERS']}>
                <UserManagement />
              </RequirePermission>
            } 
          />
          <Route 
            path="rooms" 
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROOMS']}>
                <RoomsPage />
              </RequirePermission>
            } 
          />
          <Route
            path="room-types"
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROOMS']}>
                <RoomTypeManagement />
              </RequirePermission>
            }
          />
          <Route
            path="cleaning"
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROOMS']}>
                <CleaningPage />
              </RequirePermission>
            }
          />
          <Route
            path="inventory"
            element={
              <RequirePermission allowedPermissions={['MANAGE_INVENTORY']}>
                <InventoryPage />
              </RequirePermission>
            }
          />
          <Route
            path="inventory/damages"
            element={
              <RequirePermission allowedPermissions={['MANAGE_INVENTORY']}>
                <DamageLossPage />
              </RequirePermission>
            }
          />
          <Route
            path="attractions"
            element={
              <RequirePermission allowedPermissions={['MANAGE_CONTENT']}>
                <AttractionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="amenities"
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROOMS']}>
                <AmenitiesPage />
              </RequirePermission>
            }
          />
          <Route
            path="cms"
            element={
              <RequirePermission allowedPermissions={['MANAGE_CONTENT']}>
                <CMSPage />
              </RequirePermission>
            }
          />
          <Route
            path="reviews"
            element={
              <RequirePermission allowedPermissions={['MANAGE_CONTENT']}>
                <ReviewManagement />
              </RequirePermission>
            }
          />
          <Route
            path="contact"
            element={
              <RequirePermission allowedPermissions={['MANAGE_CONTENT']}>
                <ContactManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="bookings"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <BookingManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="bookings/manage"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <BookingManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="bookings/room-map"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <RoomMapPage />
              </RequirePermission>
            }
          />
          <Route
            path="bookings/arrivals"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <BookingManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="bookings/in-house"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <BookingManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="bookings/check-out"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <BookingManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="invoices"
            element={
              <RequirePermission allowedPermissions={['MANAGE_INVOICES']}>
                <InvoiceManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="vouchers"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <VoucherManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="memberships"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <MembershipManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders"
            element={
              <RequirePermission allowedPermissions={['MANAGE_SERVICES', 'MANAGE_ROOMS']}>
                <ServiceOrderManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="services"
            element={
              <RequirePermission allowedPermissions={['MANAGE_SERVICES']}>
                <ServiceManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="profile"
            element={
              <ProfilePage />
            }
          />
          <Route 
            path="roles" 
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROLES']}>
                <RoleManagement />
              </RequirePermission>
            } 
          />
          <Route
            path="audit-logs"
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROLES']}>
                <AuditLogsPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROLES']}>
                <SystemSettingsPage />
              </RequirePermission>
            }
          />
        </Route>

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<StaffDashboard />}
          />
          <Route
            path="cleaning"
            element={
              <RequirePermission allowedPermissions={['MANAGE_ROOMS']}>
                <StaffCleaningPage />
              </RequirePermission>
            }
          />
          <Route path="bookings">
            <Route index element={<Navigate to="manage" replace />} />
            <Route
              path="manage"
              element={
                <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                  <StaffBookingPage />
                </RequirePermission>
              }
            />
            <Route
              path="room-map"
              element={
                <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                  <RoomMapPage />
                </RequirePermission>
              }
            />
            <Route
              path="arrivals"
              element={
                <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                  <StaffBookingPage />
                </RequirePermission>
              }
            />
            <Route
              path="in-house"
              element={
                <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                  <StaffBookingPage />
                </RequirePermission>
              }
            />
            <Route
              path="check-out"
              element={
                <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                  <StaffBookingPage />
                </RequirePermission>
              }
            />
          </Route>
          <Route
            path="invoices"
            element={
              <RequirePermission allowedPermissions={['MANAGE_INVOICES']}>
                <StaffInvoicePage />
              </RequirePermission>
            }
          />
          <Route
            path="vouchers"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <VoucherManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="memberships"
            element={
              <RequirePermission allowedPermissions={['MANAGE_BOOKINGS']}>
                <MembershipManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders"
            element={
              <RequirePermission allowedPermissions={['MANAGE_SERVICES', 'MANAGE_ROOMS']}>
                <ServiceOrderManagementPage />
              </RequirePermission>
            }
          />
        </Route>

        {/* Error Pages */}
        <Route path="/401" element={<UnauthorizedPage />} />
        <Route path="/403" element={<Navigate to="/401" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
