export const adminRoles = {
  admin: 'admin',
  superAdmin: 'super_admin',
  customAdmin: 'custom_admin',
  operationsAdmin: 'operations_admin',
  registrationsAdmin: 'registrations_admin',
  accountingAdmin: 'accounting_admin',
  reportsAdmin: 'reports_admin',
  settingsAdmin: 'settings_admin'
};

export const adminPermissions = {
  overview: 'overview',
  events: 'events',
  registrations: 'registrations',
  matches: 'matches',
  accountingTransactions: 'accounting_transactions',
  accountingReports: 'accounting_reports',
  reports: 'reports',
  users: 'users',
  settings: 'settings'
};

const fullAccessPermissions = Object.values(adminPermissions);

export const builtInAdminRolePermissions = {
  [adminRoles.admin]: fullAccessPermissions,
  [adminRoles.superAdmin]: fullAccessPermissions,
  [adminRoles.customAdmin]: [],
  [adminRoles.operationsAdmin]: [
    adminPermissions.overview,
    adminPermissions.events,
    adminPermissions.registrations,
    adminPermissions.matches,
    adminPermissions.reports
  ],
  [adminRoles.registrationsAdmin]: [
    adminPermissions.overview,
    adminPermissions.registrations,
    adminPermissions.reports
  ],
  [adminRoles.accountingAdmin]: [
    adminPermissions.overview,
    adminPermissions.accountingTransactions,
    adminPermissions.accountingReports,
    adminPermissions.reports
  ],
  [adminRoles.reportsAdmin]: [
    adminPermissions.overview,
    adminPermissions.accountingReports,
    adminPermissions.reports
  ],
  [adminRoles.settingsAdmin]: [
    adminPermissions.overview,
    adminPermissions.settings
  ]
};

export const adminRolePermissions = builtInAdminRolePermissions;
export const adminPortalRoles = Object.keys(builtInAdminRolePermissions);
export const protectedAdminRoles = [adminRoles.superAdmin, adminRoles.admin, adminRoles.customAdmin];
export const fullAccessAdminRoles = [adminRoles.admin, adminRoles.superAdmin];
export const isBuiltInAdminRole = (role) =>
  adminPortalRoles.includes(String(role || '').trim());

export const sanitizeAdminPermissions = (permissions = []) =>
  [...new Set((Array.isArray(permissions) ? permissions : []).map((permission) => String(permission || '').trim()))]
    .filter((permission) => fullAccessPermissions.includes(permission));

export const getRolePermissions = (role) =>
  builtInAdminRolePermissions[String(role || '').trim()] || [];

export const getEffectiveAdminPermissions = (userOrRole, permissions) => {
  const role = typeof userOrRole === 'object' ? userOrRole?.role : userOrRole;
  const normalizedRole = String(role || '').trim();
  const customPermissions = sanitizeAdminPermissions(
    permissions ?? (typeof userOrRole === 'object' ? userOrRole?.permissions : [])
  );

  if (normalizedRole === adminRoles.customAdmin) {
    return customPermissions;
  }

  if (isFullAccessAdminRole(normalizedRole)) {
    return getRolePermissions(normalizedRole);
  }

  if (customPermissions.length) {
    return customPermissions;
  }

  if (isBuiltInAdminRole(normalizedRole)) {
    return getRolePermissions(normalizedRole);
  }

  return customPermissions;
};

export const hasAdminPortalAccess = (userOrRole, permissions) => {
  const role = typeof userOrRole === 'object' ? userOrRole?.role : userOrRole;
  const normalizedRole = String(role || '').trim();

  if (isBuiltInAdminRole(normalizedRole)) {
    return true;
  }

  if (normalizedRole === 'user' || !normalizedRole) {
    return false;
  }

  return getEffectiveAdminPermissions(userOrRole, permissions).length > 0;
};

export const hasAdminPermission = (userOrRole, permission, permissions) =>
  getEffectiveAdminPermissions(userOrRole, permissions).includes(permission);

export const hasAnyAdminPermission = (userOrRole, permissions = [], customPermissions) =>
  permissions.some((permission) => hasAdminPermission(userOrRole, permission, customPermissions));

export const isFullAccessAdminRole = (role) =>
  fullAccessAdminRoles.includes(String(role || '').trim());
