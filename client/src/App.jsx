import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import AdminPermissionGuard from './components/common/AdminPermissionGuard.jsx';
import AdminProtectedRoute from './components/common/AdminProtectedRoute.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import ScrollToTopButton from './components/common/ScrollToTopButton.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
import ContactPage from './pages/public/ContactPage.jsx';
import CorporateEventsPage from './pages/public/CorporateEventsPage.jsx';
import EventDetailPage from './pages/public/EventDetailPage.jsx';
import EventsPage from './pages/public/EventsPage.jsx';
import HomePage from './pages/public/HomePage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';
import SponsorshipPage from './pages/public/SponsorshipPage.jsx';
import { adminPermissions } from './data/adminAccess.js';

const AdminAccountingPage = lazy(() => import('./pages/admin/AdminAccountingPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminEventsPage = lazy(() => import('./pages/admin/AdminEventsPage.jsx'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage.jsx'));
const AdminMatchesPage = lazy(() => import('./pages/admin/AdminMatchesPage.jsx'));
const AdminRegistrationsPage = lazy(() => import('./pages/admin/AdminRegistrationsPage.jsx'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage.jsx'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx'));
const AdminUserManualPage = lazy(() => import('./pages/admin/AdminUserManualPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const EventPaymentPage = lazy(() => import('./pages/public/EventPaymentPage.jsx'));
const UserDashboardPage = lazy(() => import('./pages/user/UserDashboardPage.jsx'));

const renderLazyPage = (element, label) => (
  <Suspense fallback={<LoadingSpinner label={label} />}>{element}</Suspense>
);

export default function App() {
  return (
    <>
      <div id="app-top-anchor" tabIndex={-1} />
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
          <Route
            path="/admin-portal/user-manual"
            element={renderLazyPage(<AdminUserManualPage />, 'Loading user manual...')}
          />
        </Route>

        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/corporate-events" element={<CorporateEventsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/partner-access" element={<SponsorshipPage />} />
          <Route path="/contact" element={<ContactPage />} />

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

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ScrollToTopButton />
    </>
  );
}
