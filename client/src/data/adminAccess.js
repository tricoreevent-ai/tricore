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

export const adminPermissionLabels = {
  [adminPermissions.overview]: 'Overview Dashboard',
  [adminPermissions.events]: 'Events',
  [adminPermissions.registrations]: 'Registrations',
  [adminPermissions.matches]: 'Matches',
  [adminPermissions.accountingTransactions]: 'Accounting Transactions',
  [adminPermissions.accountingReports]: 'Accounting Reports',
  [adminPermissions.reports]: 'Reports',
  [adminPermissions.users]: 'Users',
  [adminPermissions.settings]: 'Settings'
};

export const adminPermissionDescriptions = {
  [adminPermissions.overview]: 'Admin landing dashboard and summary cards.',
  [adminPermissions.events]: 'Create, edit, publish, and manage events.',
  [adminPermissions.registrations]: 'Review registrations and confirm payment records.',
  [adminPermissions.matches]: 'Manage fixtures, brackets, and match scheduling.',
  [adminPermissions.accountingTransactions]: 'Record, edit, print, and manage transactions.',
  [adminPermissions.accountingReports]: 'Access finance reports, payment status review, and profitability analysis.',
  [adminPermissions.reports]: 'Open the main reports workspace, security alerts, and operational activity history.',
  [adminPermissions.users]: 'Manage admin users and access rules.',
  [adminPermissions.settings]: 'Open application settings, payments, backups, banners, and security.'
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

export const adminRoleOptions = [
  { value: adminRoles.superAdmin, label: 'Super Admin' },
  { value: adminRoles.admin, label: 'Admin' },
  { value: adminRoles.customAdmin, label: 'Custom Access Admin' },
  { value: adminRoles.operationsAdmin, label: 'Operations Admin' },
  { value: adminRoles.registrationsAdmin, label: 'Registrations Admin' },
  { value: adminRoles.accountingAdmin, label: 'Accounting Admin' },
  { value: adminRoles.reportsAdmin, label: 'Reports Admin' },
  { value: adminRoles.settingsAdmin, label: 'Settings Admin' }
];

export const fixedAdminRoleOptions = adminRoleOptions.filter((role) =>
  protectedAdminRoles.includes(role.value)
);

export const adminRoleLabels = Object.fromEntries(
  adminRoleOptions.map((role) => [role.value, role.label])
);

export const getAdminRoleLabel = (userOrRole) => {
  if (typeof userOrRole === 'object' && userOrRole?.roleName) {
    return userOrRole.roleName;
  }

  const normalizedRole = String(
    typeof userOrRole === 'object' ? userOrRole?.role : userOrRole || ''
  ).trim();

  return adminRoleLabels[normalizedRole] || normalizedRole;
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

export const getDefaultAdminRoute = (userOrRole, permissions) => {
  if (hasAdminPermission(userOrRole, adminPermissions.overview, permissions)) {
    return '/admin-portal';
  }

  if (hasAdminPermission(userOrRole, adminPermissions.events, permissions)) {
    return '/admin-portal/events';
  }

  if (hasAdminPermission(userOrRole, adminPermissions.registrations, permissions)) {
    return '/admin-portal/registrations';
  }

  if (hasAdminPermission(userOrRole, adminPermissions.matches, permissions)) {
    return '/admin-portal/matches';
  }

  if (hasAdminPermission(userOrRole, adminPermissions.accountingTransactions, permissions)) {
    return '/admin-portal/accounting';
  }

  if (
    hasAnyAdminPermission(
      userOrRole,
      [adminPermissions.reports, adminPermissions.accountingReports],
      permissions
    )
  ) {
    return '/admin-portal/reports';
  }

  if (hasAdminPermission(userOrRole, adminPermissions.users, permissions)) {
    return '/admin-portal/users';
  }

  if (hasAdminPermission(userOrRole, adminPermissions.settings, permissions)) {
    return '/admin-portal/settings';
  }

  return '/admin-portal/login';
};
