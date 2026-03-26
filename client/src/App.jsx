import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import AdminPermissionGuard from './components/common/AdminPermissionGuard.jsx';
import AdminProtectedRoute from './components/common/AdminProtectedRoute.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import { adminPermissions } from './data/adminAccess.js';

const AdminAccountingPage = lazy(() => import('./pages/admin/AdminAccountingPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminEventsPage = lazy(() => import('./pages/admin/AdminEventsPage.jsx'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage.jsx'));
const AdminMatchesPage = lazy(() => import('./pages/admin/AdminMatchesPage.jsx'));
const AdminRegistrationsPage = lazy(() => import('./pages/admin/AdminRegistrationsPage.jsx'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage.jsx'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AboutPage = lazy(() => import('./pages/public/AboutPage.jsx'));
const ContactPage = lazy(() => import('./pages/public/ContactPage.jsx'));
const EventDetailPage = lazy(() => import('./pages/public/EventDetailPage.jsx'));
const EventPaymentPage = lazy(() => import('./pages/public/EventPaymentPage.jsx'));
const EventsPage = lazy(() => import('./pages/public/EventsPage.jsx'));
const HomePage = lazy(() => import('./pages/public/HomePage.jsx'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage.jsx'));
const SponsorshipPage = lazy(() => import('./pages/public/SponsorshipPage.jsx'));
const UserDashboardPage = lazy(() => import('./pages/user/UserDashboardPage.jsx'));

const renderLazyPage = (element, label) => (
  <Suspense fallback={<LoadingSpinner label={label} />}>{element}</Suspense>
);

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin-portal/login"
        element={renderLazyPage(<AdminLoginPage />, 'Loading admin login...')}
      />
      <Route element={<AdminProtectedRoute />}>
        <Route
          path="/admin-portal"
          element={
            <AdminPermissionGuard permissions={[adminPermissions.overview]}>
              {renderLazyPage(<AdminDashboardPage />, 'Loading dashboard...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/events"
          element={
            <AdminPermissionGuard permissions={[adminPermissions.events]}>
              {renderLazyPage(<AdminEventsPage />, 'Loading events admin...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/registrations"
          element={
            <AdminPermissionGuard permissions={[adminPermissions.registrations]}>
              {renderLazyPage(<AdminRegistrationsPage />, 'Loading registrations...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/matches"
          element={
            <AdminPermissionGuard permissions={[adminPermissions.matches]}>
              {renderLazyPage(<AdminMatchesPage />, 'Loading matches...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/accounting"
          element={
            <AdminPermissionGuard
              permissions={[adminPermissions.accountingTransactions]}
            >
              {renderLazyPage(<AdminAccountingPage />, 'Loading accounting...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/reports"
          element={
            <AdminPermissionGuard
              permissions={[adminPermissions.reports, adminPermissions.accountingReports]}
            >
              {renderLazyPage(<AdminReportsPage />, 'Loading reports...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/users"
          element={
            <AdminPermissionGuard permissions={[adminPermissions.users]}>
              {renderLazyPage(<AdminUsersPage />, 'Loading admin users...')}
            </AdminPermissionGuard>
          }
        />
        <Route
          path="/admin-portal/settings"
          element={
            <AdminPermissionGuard permissions={[adminPermissions.settings]}>
              {renderLazyPage(<AdminSettingsPage />, 'Loading settings...')}
            </AdminPermissionGuard>
          }
        />
      </Route>

      <Route element={<MainLayout />}>
        <Route index element={renderLazyPage(<HomePage />, 'Loading home page...')} />
        <Route path="/about" element={renderLazyPage(<AboutPage />, 'Loading about page...')} />
        <Route path="/events" element={renderLazyPage(<EventsPage />, 'Loading events page...')} />
        <Route
          path="/events/:eventId"
          element={renderLazyPage(<EventDetailPage />, 'Loading event details...')}
        />
        <Route
          path="/partner-access"
          element={renderLazyPage(<SponsorshipPage />, 'Loading sponsorship page...')}
        />
        <Route
          path="/contact"
          element={renderLazyPage(<ContactPage />, 'Loading contact page...')}
        />

        <Route element={<ProtectedRoute role="user" />}>
          <Route
            path="/dashboard"
            element={renderLazyPage(<UserDashboardPage />, 'Loading dashboard...')}
          />
          <Route
            path="/events/:eventId/payment"
            element={renderLazyPage(<EventPaymentPage />, 'Loading payment page...')}
          />
        </Route>
      </Route>

      <Route path="*" element={renderLazyPage(<NotFoundPage />, 'Loading page...')} />
    </Routes>
  );
}
