import { useEffect, useMemo, useState } from 'react';

import {
  changeAdminPassword,
  deleteAdminRoleTemplate,
  createAdminRoleTemplate,
  createAdminUser,
  getAdminRoleTemplates,
  getAdminUsers,
  updateAdminRoleTemplateStatus,
  updateAdminRoleTemplate,
  updateAdminUserAccess
} from '../../api/authApi.js';
import AppIcon from '../../components/common/AppIcon.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import {
  adminPermissionDescriptions,
  adminPermissionLabels,
  adminPermissions,
  adminRoles,
  fixedAdminRoleOptions,
  getAdminRoleLabel,
  getEffectiveAdminPermissions,
  getRolePermissions,
  isBuiltInAdminRole
} from '../../data/adminAccess.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDate } from '../../utils/formatters.js';

const createInitialUserForm = () => ({
  name: '',
  username: '',
  email: '',
  role: fixedAdminRoleOptions[0].value,
  password: '',
  permissions: []
});

const createInitialRoleForm = () => ({
  name: '',
  key: '',
  description: '',
  permissions: []
});

const createInitialRoleEditForm = () => ({
  name: '',
  description: '',
  permissions: []
});

const passwordInitialForm = {
  currentPassword: '',
  newPassword: ''
};

const permissionOptions = Object.values(adminPermissions);

const userTabs = [
  { key: 'accounts', label: 'Admin Accounts', icon: 'users' },
  { key: 'create', label: 'Create Admin User', icon: 'userPlus' },
  { key: 'roles', label: 'Create Roles', icon: 'role' },
  { key: 'access', label: 'Modify Role Access', icon: 'security' },
  { key: 'password', label: 'Change Password', icon: 'key' }
];

const togglePermission = (permissions, permission) =>
  permissions.includes(permission)
    ? permissions.filter((item) => item !== permission)
    : [...permissions, permission];

const buildAccessForm = (user) => ({
  role: user?.role || adminRoles.customAdmin,
  permissions: Array.isArray(user?.permissions) ? user.permissions : []
});

const buildRoleOptions = (roleTemplates, includedKeys = []) => ({
  builtIn: fixedAdminRoleOptions,
  custom: roleTemplates
    .filter((template) => template.isActive || includedKeys.includes(template.key))
    .map((template) => ({
      value: template.key,
      label: template.isActive ? template.name : `${template.name} (Inactive)`,
      description: template.description,
      isActive: template.isActive !== false
    }))
});

const buildRoleOptionSelectGroups = (roleOptionGroups) => [
  {
    label: 'System Roles',
    options: roleOptionGroups.builtIn
  },
  ...(roleOptionGroups.custom.length
    ? [
        {
          label: 'Managed Roles',
          options: roleOptionGroups.custom.map((role) => ({
            ...role,
            disabled: !role.isActive
          }))
        }
      ]
    : [])
];

const resolveRolePermissions = (role, fallbackPermissions, roleTemplates) => {
  if (!role) {
    return [];
  }

  const matchingTemplate = roleTemplates.find((template) => template.key === role);

  if (matchingTemplate) {
    return matchingTemplate.permissions || [];
  }

  if (role === adminRoles.customAdmin) {
    return Array.isArray(fallbackPermissions) ? fallbackPermissions : [];
  }

  if (isBuiltInAdminRole(role)) {
    return getRolePermissions(role);
  }

  return [];
};

function PermissionChecklist({ selectedPermissions, onToggle }) {
  return (
    <div className="grid gap-3">
      {permissionOptions.map((permission) => (
        <label
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
          key={permission}
        >
          <input
            checked={selectedPermissions.includes(permission)}
            onChange={() => onToggle(permission)}
            type="checkbox"
          />
          <span>
            <span className="block font-semibold text-slate-900">
              {adminPermissionLabels[permission] || permission}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {adminPermissionDescriptions[permission] || 'Page access permission'}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function PermissionBadgeCloud({ permissions }) {
  if (!permissions.length) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
        No page permissions are selected yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {permissions.map((permission) => (
        <span className="badge bg-white text-slate-700" key={permission}>
          {adminPermissionLabels[permission] || permission}
        </span>
      ))}
    </div>
  );
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-brand-mist'
      }`}
      onClick={onClick}
      type="button"
    >
      <AppIcon className="h-4 w-4" name={icon} />
      {label}
    </button>
  );
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState('accounts');
  const [users, setUsers] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [createForm, setCreateForm] = useState(createInitialUserForm);
  const [createRoleForm, setCreateRoleForm] = useState(createInitialRoleForm);
  const [passwordForm, setPasswordForm] = useState(passwordInitialForm);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [accessForm, setAccessForm] = useState(buildAccessForm(null));
  const [editRoleForm, setEditRoleForm] = useState(createInitialRoleEditForm);
  const [createMessage, setCreateMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [roleTemplatesLoading, setRoleTemplatesLoading] = useState(true);
  const [roleTemplatesError, setRoleTemplatesError] = useState('');
  const [roleTemplatesMessage, setRoleTemplatesMessage] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [accessError, setAccessError] = useState('');
  const [accessSaving, setAccessSaving] = useState(false);
  const [roleTemplateSaving, setRoleTemplateSaving] = useState(false);
  const [roleStatusSavingKey, setRoleStatusSavingKey] = useState('');
  const [deletingRoleKey, setDeletingRoleKey] = useState('');

  const loadUsers = async () => {
    setListLoading(true);
    try {
      const response = await getAdminUsers();
      setUsers(response);
      setListError('');
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to load admin users.'));
    } finally {
      setListLoading(false);
    }
  };

  const loadRoleTemplates = async () => {
    setRoleTemplatesLoading(true);
    try {
      const response = await getAdminRoleTemplates();
      setRoleTemplates(response);
      setRoleTemplatesError('');
    } catch (error) {
      setRoleTemplatesError(getApiErrorMessage(error, 'Unable to load saved role templates.'));
    } finally {
      setRoleTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoleTemplates();
  }, []);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId('');
      return;
    }

    if (!users.some((user) => user._id === selectedUserId)) {
      setSelectedUserId(users[0]._id);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!roleTemplates.length) {
      setSelectedRoleKey('');
      setEditRoleForm(createInitialRoleEditForm());
      return;
    }

    if (!roleTemplates.some((template) => template.key === selectedRoleKey)) {
      setSelectedRoleKey(roleTemplates[0].key);
    }
  }, [roleTemplates, selectedRoleKey]);

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const selectedRoleTemplate = useMemo(
    () => roleTemplates.find((template) => template.key === selectedRoleKey) || null,
    [roleTemplates, selectedRoleKey]
  );

  const createRoleOptionGroups = useMemo(() => buildRoleOptions(roleTemplates), [roleTemplates]);
  const accessRoleOptionGroups = useMemo(
    () => buildRoleOptions(roleTemplates, accessForm.role ? [accessForm.role] : []),
    [accessForm.role, roleTemplates]
  );
  const createRoleSelectGroups = useMemo(
    () => buildRoleOptionSelectGroups(createRoleOptionGroups),
    [createRoleOptionGroups]
  );
  const accessRoleSelectGroups = useMemo(
    () => buildRoleOptionSelectGroups(accessRoleOptionGroups),
    [accessRoleOptionGroups]
  );
  const adminUserOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user._id,
        label: `${user.name} (${user.username})`
      })),
    [users]
  );
  const roleTemplateSelectOptions = useMemo(
    () =>
      roleTemplates.map((template) => ({
        value: template.key,
        label: `${template.name}${template.isActive ? '' : ' (Inactive)'}`,
        disabled: false
      })),
    [roleTemplates]
  );

  const accountStats = useMemo(() => {
    const customAccessCount = users.filter((user) => user.role === adminRoles.customAdmin).length;
    const fullAccessCount = users.filter((user) =>
      [adminRoles.admin, adminRoles.superAdmin].includes(user.role)
    ).length;

    return {
      totalUsers: users.length,
      customAccessCount,
      fullAccessCount,
      roleTemplateCount: roleTemplates.length
    };
  }, [roleTemplates.length, users]);

  const createRolePreviewPermissions = useMemo(
    () => resolveRolePermissions(createForm.role, createForm.permissions, roleTemplates),
    [createForm.permissions, createForm.role, roleTemplates]
  );

  const accessPreviewPermissions = useMemo(
    () => resolveRolePermissions(accessForm.role, accessForm.permissions, roleTemplates),
    [accessForm.permissions, accessForm.role, roleTemplates]
  );

  useEffect(() => {
    setAccessForm(buildAccessForm(selectedUser));
    setAccessError('');
    setAccessMessage('');
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedRoleTemplate) {
      setEditRoleForm(createInitialRoleEditForm());
      return;
    }

    setEditRoleForm({
      name: selectedRoleTemplate.name || '',
      description: selectedRoleTemplate.description || '',
      permissions: Array.isArray(selectedRoleTemplate.permissions)
        ? selectedRoleTemplate.permissions
        : []
    });
    setRoleTemplatesError('');
    setRoleTemplatesMessage('');
  }, [selectedRoleTemplate]);

  const userColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (user) => user.name || '',
        cell: (user) => <span className="font-semibold text-slate-900">{user.name}</span>
      },
      {
        key: 'username',
        header: 'Username',
        accessor: (user) => user.username || '',
        cell: (user) => <span className="text-slate-600">{user.username}</span>
      },
      {
        key: 'email',
        header: 'Email',
        accessor: (user) => user.email || '',
        cell: (user) => <span className="text-slate-600">{user.email || '-'}</span>
      },
      {
        key: 'role',
        header: 'Role',
        accessor: (user) => getAdminRoleLabel(user),
        cell: (user) => (
          <div>
            <p className="font-semibold text-slate-900">{getAdminRoleLabel(user)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {roleTemplates.some((template) => template.key === user.role)
                ? 'Managed role'
                : isBuiltInAdminRole(user.role)
                  ? 'Protected system role'
                  : 'Saved role'}
            </p>
          </div>
        )
      },
      {
        key: 'pageAccess',
        header: 'Page Access',
        accessor: (user) => getEffectiveAdminPermissions(user).length,
        exportValue: (user) =>
          getEffectiveAdminPermissions(user)
            .map((permission) => adminPermissionLabels[permission] || permission)
            .join(', '),
        cell: (user) => (
          <div>
            <p className="font-semibold text-slate-900">
              {getEffectiveAdminPermissions(user).length} pages
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {user.role === adminRoles.customAdmin ? 'Manual page access' : 'Role-based access'}
            </p>
          </div>
        )
      },
      {
        key: 'createdAt',
        header: 'Created',
        accessor: (user) => user.createdAt,
        sortValue: (user) => new Date(user.createdAt).getTime(),
        exportValue: (user) => formatDate(user.createdAt),
        cell: (user) => <span className="text-slate-600">{formatDate(user.createdAt)}</span>
      },
      {
        key: 'lastLoginAt',
        header: 'Last Login',
        accessor: (user) => user.lastLoginAt || '',
        sortValue: (user) => (user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0),
        exportValue: (user) => (user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'),
        cell: (user) => (
          <span className="text-slate-600">
            {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
          </span>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: () => '',
        exportable: false,
        sortable: false,
        cell: (user) => (
          <button
            className="btn-secondary gap-2 px-4 py-2"
            onClick={() => {
              setSelectedUserId(user._id);
              setActiveTab('access');
            }}
            type="button"
          >
            <AppIcon className="h-4 w-4" name="security" />
            Manage Access
          </button>
        )
      }
    ],
    [roleTemplates]
  );

  const roleTemplateColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Role',
        accessor: (template) => template.name || '',
        exportValue: (template) => `${template.name} (${template.key})`,
        cell: (template) => (
          <div>
            <p className="font-semibold text-slate-900">{template.name}</p>
            <p className="mt-1 text-xs text-slate-500">{template.key}</p>
            <p className="mt-1 text-xs text-slate-400">
              {isBuiltInAdminRole(template.key) ? 'Basic role' : 'Custom role'}
            </p>
          </div>
        )
      },
      {
        key: 'description',
        header: 'Description',
        accessor: (template) => template.description || '',
        cell: (template) => (
          <span className="text-slate-600">{template.description || 'No description added.'}</span>
        )
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (template) => (template.isActive ? 'Active' : 'Inactive'),
        cell: (template) => (
          <span
            className={`badge ${
              template.isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
        )
      },
      {
        key: 'assignedUserCount',
        header: 'Assigned Users',
        accessor: (template) => template.assignedUserCount || 0,
        cell: (template) => (
          <span className="font-semibold text-slate-900">{template.assignedUserCount || 0}</span>
        )
      },
      {
        key: 'permissions',
        header: 'Page Access',
        accessor: (template) => template.permissions.length,
        exportValue: (template) =>
          template.permissions
            .map((permission) => adminPermissionLabels[permission] || permission)
            .join(', '),
        cell: (template) => (
          <div>
            <p className="font-semibold text-slate-900">{template.permissions.length} pages</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.permissions.slice(0, 3).map((permission) => (
                <span className="badge bg-white text-slate-700" key={permission}>
                  {adminPermissionLabels[permission] || permission}
                </span>
              ))}
              {template.permissions.length > 3 ? (
                <span className="badge bg-slate-100 text-slate-600">
                  +{template.permissions.length - 3} more
                </span>
              ) : null}
            </div>
          </div>
        )
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        accessor: (template) => template.updatedAt || template.createdAt,
        sortValue: (template) =>
          new Date(template.updatedAt || template.createdAt || 0).getTime(),
        exportValue: (template) => formatDate(template.updatedAt || template.createdAt),
        cell: (template) => (
          <span className="text-slate-600">
            {formatDate(template.updatedAt || template.createdAt)}
          </span>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: () => '',
        exportable: false,
        sortable: false,
        cell: (template) => (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary gap-2 px-4 py-2"
              onClick={() => {
                setSelectedRoleKey(template.key);
                setActiveTab('access');
              }}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="role" />
              Edit
            </button>
            <button
              className="btn-secondary gap-2 px-4 py-2"
              disabled={roleStatusSavingKey === template.key}
              onClick={async () => {
                setRoleStatusSavingKey(template.key);
                setRoleTemplatesError('');
                setRoleTemplatesMessage('');
                try {
                  await updateAdminRoleTemplateStatus(template.key, {
                    isActive: !template.isActive
                  });
                  await Promise.all([loadRoleTemplates(), loadUsers()]);
                  setRoleTemplatesMessage(
                    `${template.name} ${template.isActive ? 'deactivated' : 'activated'} successfully.`
                  );
                } catch (requestError) {
                  setRoleTemplatesError(
                    getApiErrorMessage(requestError, 'Unable to update role status.')
                  );
                } finally {
                  setRoleStatusSavingKey('');
                }
              }}
              type="button"
            >
              <AppIcon className="h-4 w-4" name={template.isActive ? 'warning' : 'check'} />
              {roleStatusSavingKey === template.key
                ? 'Saving...'
                : template.isActive
                  ? 'Deactivate'
                  : 'Activate'}
            </button>
          </div>
        )
      }
    ],
    [deletingRoleKey, roleStatusSavingKey]
  );

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (!createForm.name.trim()) {
      setCreateError('Full name is required.');
      return;
    }

    if (createForm.username.trim().length < 3) {
      setCreateError('Username must be at least 3 characters.');
      return;
    }

    if (!createForm.email.trim()) {
      setCreateError('Email address is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      setCreateError('Enter a valid email address.');
      return;
    }

    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }

    if (createForm.role === adminRoles.customAdmin && !createForm.permissions.length) {
      setCreateError('Choose at least one accessible page for a custom access admin.');
      return;
    }

    try {
      setCreateError('');
      setCreateMessage('');
      await createAdminUser({
        ...createForm,
        email: createForm.email.trim().toLowerCase(),
        permissions: createForm.role === adminRoles.customAdmin ? createForm.permissions : []
      });
      setCreateMessage('Admin user created successfully.');
      setCreateForm(createInitialUserForm());
      await loadUsers();
      setActiveTab('accounts');
    } catch (requestError) {
      setCreateError(getApiErrorMessage(requestError, 'Unable to create admin user.'));
    }
  };

  const handleCreateRoleTemplate = async (event) => {
    event.preventDefault();

    if (!createRoleForm.name.trim()) {
      setRoleTemplatesError('Role name is required.');
      return;
    }

    if (!createRoleForm.permissions.length) {
      setRoleTemplatesError('Choose at least one page permission for the role.');
      return;
    }

    setRoleTemplateSaving(true);
    setRoleTemplatesError('');
    setRoleTemplatesMessage('');

    try {
      const template = await createAdminRoleTemplate({
        name: createRoleForm.name.trim(),
        key: createRoleForm.key.trim(),
        description: createRoleForm.description.trim(),
        permissions: createRoleForm.permissions
      });
      await loadRoleTemplates();
      setSelectedRoleKey(template.key);
      setCreateRoleForm(createInitialRoleForm());
      setRoleTemplatesMessage(`Role template "${template.name}" created successfully.`);
      setActiveTab('access');
    } catch (requestError) {
      setRoleTemplatesError(getApiErrorMessage(requestError, 'Unable to create role template.'));
    } finally {
      setRoleTemplateSaving(false);
    }
  };

  const handleUpdateRoleTemplate = async (event) => {
    event.preventDefault();

    if (!selectedRoleTemplate?.key) {
      setRoleTemplatesError('Select a saved role template first.');
      return;
    }

    if (!editRoleForm.name.trim()) {
      setRoleTemplatesError('Role name is required.');
      return;
    }

    if (!editRoleForm.permissions.length) {
      setRoleTemplatesError('Choose at least one page permission for the role.');
      return;
    }

    setRoleTemplateSaving(true);
    setRoleTemplatesError('');
    setRoleTemplatesMessage('');

    try {
      const updatedTemplate = await updateAdminRoleTemplate(selectedRoleTemplate.key, {
        name: editRoleForm.name.trim(),
        description: editRoleForm.description.trim(),
        permissions: editRoleForm.permissions
      });
      await Promise.all([loadRoleTemplates(), loadUsers()]);
      setRoleTemplatesMessage(`Role template "${updatedTemplate.name}" updated successfully.`);
    } catch (requestError) {
      setRoleTemplatesError(getApiErrorMessage(requestError, 'Unable to update role template.'));
    } finally {
      setRoleTemplateSaving(false);
    }
  };

  const handleDeleteRoleTemplate = async () => {
    if (!selectedRoleTemplate?.key) {
      setRoleTemplatesError('Select a role first.');
      return;
    }

    if (
      !window.confirm(
        `Delete the role "${selectedRoleTemplate.name}"? Assigned users will be converted to Custom Access Admin with their current permissions kept.`
      )
    ) {
      return;
    }

    setDeletingRoleKey(selectedRoleTemplate.key);
    setRoleTemplatesError('');
    setRoleTemplatesMessage('');

    try {
      const response = await deleteAdminRoleTemplate(selectedRoleTemplate.key);
      await Promise.all([loadRoleTemplates(), loadUsers()]);
      setRoleTemplatesMessage(
        `"${selectedRoleTemplate.name}" deleted successfully.${response?.reassignedUsers ? ` ${response.reassignedUsers} user(s) were moved to Custom Access Admin.` : ''}`
      );
      setSelectedRoleKey('');
    } catch (requestError) {
      setRoleTemplatesError(getApiErrorMessage(requestError, 'Unable to delete this role.'));
    } finally {
      setDeletingRoleKey('');
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (passwordForm.currentPassword.length < 6) {
      setPasswordError('Current password is required.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    try {
      setPasswordError('');
      setPasswordMessage('');
      await changeAdminPassword(passwordForm);
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ ...passwordInitialForm });
    } catch (requestError) {
      setPasswordError(getApiErrorMessage(requestError, 'Unable to update password.'));
    }
  };

  const handleSaveAccess = async (event) => {
    event.preventDefault();

    if (!selectedUser?._id) {
      setAccessError('Select an admin user first.');
      return;
    }

    if (accessForm.role === adminRoles.customAdmin && !accessForm.permissions.length) {
      setAccessError('Choose at least one accessible page for a custom access admin.');
      return;
    }

    setAccessSaving(true);
    setAccessError('');
    setAccessMessage('');

    try {
      const response = await updateAdminUserAccess(selectedUser._id, {
        role: accessForm.role,
        permissions: accessForm.role === adminRoles.customAdmin ? accessForm.permissions : []
      });

      setUsers((current) => current.map((user) => (user._id === response._id ? response : user)));
      setAccessMessage(`Access updated for ${response.name}.`);
    } catch (requestError) {
      setAccessError(getApiErrorMessage(requestError, 'Unable to update admin access.'));
    } finally {
      setAccessSaving(false);
    }
  };

  const updateCreatePermission = (permission) => {
    setCreateForm((current) => ({
      ...current,
      permissions: togglePermission(current.permissions, permission)
    }));
    setCreateError('');
  };

  const updateCreateRolePermission = (permission) => {
    setCreateRoleForm((current) => ({
      ...current,
      permissions: togglePermission(current.permissions, permission)
    }));
    setRoleTemplatesError('');
  };

  const updateAccessPermission = (permission) => {
    setAccessForm((current) => ({
      ...current,
      permissions: togglePermission(current.permissions, permission)
    }));
    setAccessError('');
    setAccessMessage('');
  };

  const updateEditRolePermission = (permission) => {
    setEditRoleForm((current) => ({
      ...current,
      permissions: togglePermission(current.permissions, permission)
    }));
    setRoleTemplatesError('');
    setRoleTemplatesMessage('');
  };

  if (listLoading && roleTemplatesLoading && !users.length && !roleTemplates.length) {
    return <LoadingSpinner label="Loading admin account controls..." />;
  }

  return (
    <AdminPageShell
      description="Create admin accounts, define reusable role templates, and manage page-level accessibility without mixing user setup and access editing into one long form."
      title="Admin Users"
    >
      <div className="mb-8 inline-flex w-full flex-wrap rounded-[1.75rem] bg-white p-2 shadow-soft lg:w-auto">
        {userTabs.map((tab) => (
          <TabButton
            active={activeTab === tab.key}
            icon={tab.icon}
            key={tab.key}
            label={tab.label}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {activeTab === 'accounts' ? (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              helper="Total"
              icon="users"
              subtitle="All local admin accounts with portal access."
              title="Admin Accounts"
              tone="blue"
              value={accountStats.totalUsers}
            />
            <StatCard
              helper="Reusable"
              icon="role"
              subtitle="Saved role templates available for assignment."
              title="Role Templates"
              tone="orange"
              value={accountStats.roleTemplateCount}
            />
            <StatCard
              helper="Manual"
              icon="security"
              subtitle="Admins with page access defined user-by-user."
              title="Custom Access Admins"
              tone="emerald"
              value={accountStats.customAccessCount}
            />
            <StatCard
              helper="Full"
              icon="sparkle"
              subtitle="Admins with complete control across the portal."
              title="Full Access Admins"
              tone="slate"
              value={accountStats.fullAccessCount}
            />
          </div>

          <section className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Admin Accounts Directory</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review admin users, role assignments, page accessibility, and last login
                  activity from one searchable directory.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-secondary gap-2"
                  onClick={() => setActiveTab('roles')}
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="role" />
                  Create Role
                </button>
                <button
                  className="btn-primary gap-2"
                  onClick={() => setActiveTab('create')}
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="userPlus" />
                  Create Admin User
                </button>
              </div>
            </div>

            <div className="mt-4">
              <FormAlert message={listError} />
            </div>

            <div className="mt-6">
              {listLoading ? (
                <LoadingSpinner compact label="Loading admin accounts..." />
              ) : (
                <DataTable
                  columns={userColumns}
                  emptyMessage="No admin accounts have been created yet."
                  exportFileName="admin-users.csv"
                  rowKey="_id"
                  rows={users}
                  searchPlaceholder="Search admin users"
                  tableClassName="min-w-[1120px]"
                />
              )}
            </div>
          </section>

          <section className="panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Saved Role Templates</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Templates let you define access once and reuse it for new admin accounts.
                </p>
              </div>
              <button
                className="btn-secondary gap-2"
                onClick={() => setActiveTab('access')}
                type="button"
              >
                <AppIcon className="h-4 w-4" name="security" />
                Modify Access
              </button>
            </div>

            <div className="mt-4">
              <FormAlert message={roleTemplatesError} />
              <FormAlert message={roleTemplatesMessage} type="success" />
            </div>

            <div className="mt-6">
              {roleTemplatesLoading ? (
                <LoadingSpinner compact label="Loading role templates..." />
              ) : (
                <DataTable
                  columns={roleTemplateColumns}
                  emptyMessage="No saved role templates exist yet."
                  exportFileName="admin-role-templates.csv"
                  initialPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                  rowKey="key"
                  rows={roleTemplates}
                  searchPlaceholder="Search role templates"
                />
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'create' ? (
        <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <form className="panel space-y-5 p-6" onSubmit={handleCreateUser}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Create Admin User</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Add a new admin account and assign either a system role, a saved role
                  template, or custom page-level access.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="userPlus" />
              </div>
            </div>

            <FormAlert message={createError} />
            <FormAlert message={createMessage} type="success" />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="admin-name">
                  Full Name
                </label>
                <input
                  className="input"
                  id="admin-name"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  value={createForm.name}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-new-username">
                  Username
                </label>
                <input
                  className="input"
                  id="admin-new-username"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                  value={createForm.username}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-new-email">
                  Email
                </label>
                <input
                  className="input"
                  id="admin-new-email"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                  type="email"
                  value={createForm.email}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-new-password">
                  Password
                </label>
                <input
                  className="input"
                  id="admin-new-password"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                  type="password"
                  value={createForm.password}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="admin-role">
                Role Assignment
              </label>
              <TypeaheadSelect
                id="admin-role"
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value,
                    permissions:
                      event.target.value === adminRoles.customAdmin ? current.permissions : []
                  }))
                }
                groups={createRoleSelectGroups}
                placeholder="Choose a role"
                searchPlaceholder="Search roles"
                value={createForm.role}
              />
            </div>

            {createForm.role === adminRoles.customAdmin ? (
              <div className="space-y-3">
                <p className="label">Accessible Pages</p>
                <PermissionChecklist
                  onToggle={updateCreatePermission}
                  selectedPermissions={createForm.permissions}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary gap-2" type="submit">
                <AppIcon className="h-4 w-4" name="userPlus" />
                Create User
              </button>
              <button
                className="btn-secondary"
                onClick={() => setCreateForm(createInitialUserForm())}
                type="button"
              >
                Reset Form
              </button>
            </div>
          </form>

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Access Preview</h2>
                <p className="mt-2 text-sm text-slate-500">
                  The selected role controls which admin pages will be visible after login.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="security" />
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Assigned Role
              </p>
              <p className="mt-3 text-xl font-bold text-slate-950">
                {getAdminRoleLabel({
                  role: createForm.role,
                  roleName:
                    roleTemplates.find((template) => template.key === createForm.role)?.name || ''
                })}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {createForm.role === adminRoles.customAdmin
                  ? 'Manual page accessibility for this user.'
                  : roleTemplates.find((template) => template.key === createForm.role)?.description ||
                    'Protected full-access system role.'}
              </p>
            </div>

            <div className="mt-6">
              <p className="label">Visible Pages</p>
              <div className="mt-3">
                <PermissionBadgeCloud permissions={createRolePreviewPermissions} />
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'roles' ? (
        <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr]">
          <form className="panel space-y-5 p-6" onSubmit={handleCreateRoleTemplate}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Create Roles</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Five basic roles are already available here. You can edit them and also add
                  more reusable roles with page-level permissions.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="role" />
              </div>
            </div>

            <FormAlert message={roleTemplatesError} />
            <FormAlert message={roleTemplatesMessage} type="success" />

            <div>
              <label className="label" htmlFor="role-name">
                Role Name
              </label>
              <input
                className="input"
                id="role-name"
                onChange={(event) =>
                  setCreateRoleForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                value={createRoleForm.name}
              />
            </div>

            <div>
              <label className="label" htmlFor="role-key">
                Role Key
              </label>
              <input
                className="input"
                id="role-key"
                onChange={(event) =>
                  setCreateRoleForm((current) => ({ ...current, key: event.target.value }))
                }
                placeholder="Optional. Example: finance_team"
                value={createRoleForm.key}
              />
              <p className="mt-2 text-xs text-slate-500">
                Leave blank to auto-generate from the role name.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="role-description">
                Description
              </label>
              <textarea
                className="input min-h-28"
                id="role-description"
                onChange={(event) =>
                  setCreateRoleForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Explain when this role should be assigned."
                value={createRoleForm.description}
              />
            </div>

            <div className="space-y-3">
              <p className="label">Page Permissions</p>
              <PermissionChecklist
                onToggle={updateCreateRolePermission}
                selectedPermissions={createRoleForm.permissions}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary gap-2" disabled={roleTemplateSaving} type="submit">
                <AppIcon className="h-4 w-4" name="role" />
                {roleTemplateSaving ? 'Saving Role...' : 'Create Role'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setCreateRoleForm(createInitialRoleForm())}
                type="button"
              >
                Reset Form
              </button>
            </div>
          </form>

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Available Roles</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review the editable basic roles and any custom roles available for assignment.
                </p>
              </div>
              <button
                className="btn-secondary gap-2"
                onClick={() => setActiveTab('access')}
                type="button"
              >
                <AppIcon className="h-4 w-4" name="security" />
                Modify Existing Roles
              </button>
            </div>

            <div className="mt-6">
              {roleTemplatesLoading ? (
                <LoadingSpinner compact label="Loading role templates..." />
              ) : (
                <DataTable
                  columns={roleTemplateColumns}
                  emptyMessage="No roles are available yet."
                  exportFileName="role-templates.csv"
                  initialPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                  rowKey="key"
                  rows={roleTemplates}
                  searchPlaceholder="Search current templates"
                />
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'access' ? (
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <form className="panel space-y-5 p-6" onSubmit={handleSaveAccess}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">User Access Assignment</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Select an admin user and assign either a protected system role, an editable
                  managed role, or manual page-level access.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="security" />
              </div>
            </div>

            <FormAlert message={accessError} />
            <FormAlert message={accessMessage} type="success" />

            <div>
              <label className="label" htmlFor="access-user">
                Select Admin User
              </label>
              <TypeaheadSelect
                disabled={!users.length}
                id="access-user"
                onChange={(event) => setSelectedUserId(event.target.value)}
                noOptionsMessage="No admin users available."
                options={adminUserOptions}
                placeholder="Select admin user"
                searchPlaceholder="Search admin users"
                value={selectedUserId}
              />
            </div>

            {selectedUser ? (
              <>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Selected User
                  </p>
                  <p className="mt-3 text-xl font-bold text-slate-950">{selectedUser.name}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedUser.email || selectedUser.username}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Current role: {getAdminRoleLabel(selectedUser)}
                  </p>
                </div>

                <div>
                  <label className="label" htmlFor="access-role">
                    Role Assignment
                  </label>
                  <TypeaheadSelect
                    id="access-role"
                    onChange={(event) =>
                      setAccessForm((current) => ({
                        ...current,
                        role: event.target.value,
                        permissions:
                          event.target.value === adminRoles.customAdmin ? current.permissions : []
                      }))
                    }
                    groups={accessRoleSelectGroups}
                    placeholder="Choose a role"
                    searchPlaceholder="Search roles"
                    value={accessForm.role}
                  />
                </div>

                {accessForm.role === adminRoles.customAdmin ? (
                  <div className="space-y-3">
                    <p className="label">Accessible Pages</p>
                    <PermissionChecklist
                      onToggle={updateAccessPermission}
                      selectedPermissions={accessForm.permissions}
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                      Effective Page Access
                    </p>
                    <div className="mt-4">
                      <PermissionBadgeCloud permissions={accessPreviewPermissions} />
                    </div>
                  </div>
                )}

                <button className="btn-primary gap-2" disabled={accessSaving} type="submit">
                  <AppIcon className="h-4 w-4" name="check" />
                  {accessSaving ? 'Saving Access...' : 'Save Access'}
                </button>
              </>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Create an admin account first, then configure accessible pages here.
              </p>
            )}
          </form>

          <form className="panel space-y-5 p-6" onSubmit={handleUpdateRoleTemplate}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Role Editor</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Update any basic or custom managed role and assigned users will inherit the new
                  page permissions automatically.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="role" />
              </div>
            </div>

            <FormAlert message={roleTemplatesError} />
            <FormAlert message={roleTemplatesMessage} type="success" />

            <div>
              <label className="label" htmlFor="edit-role-template">
                Select Role
              </label>
              <TypeaheadSelect
                disabled={!roleTemplates.length}
                id="edit-role-template"
                noOptionsMessage="No managed roles"
                onChange={(event) => setSelectedRoleKey(event.target.value)}
                options={roleTemplateSelectOptions}
                placeholder="Select role"
                searchPlaceholder="Search roles"
                value={selectedRoleKey}
              />
            </div>

            {selectedRoleTemplate ? (
              <>
                <div>
                  <label className="label" htmlFor="edit-role-name">
                    Role Name
                  </label>
                  <input
                    className="input"
                    id="edit-role-name"
                    onChange={(event) =>
                      setEditRoleForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    value={editRoleForm.name}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="edit-role-description">
                    Description
                  </label>
                  <textarea
                    className="input min-h-28"
                    id="edit-role-description"
                    onChange={(event) =>
                      setEditRoleForm((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    value={editRoleForm.description}
                  />
                </div>

                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Role Key
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {selectedRoleTemplate.key}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`badge ${
                        selectedRoleTemplate.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selectedRoleTemplate.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="badge bg-white text-slate-700">
                      {selectedRoleTemplate.assignedUserCount || 0} assigned user(s)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn-secondary gap-2"
                    disabled={roleStatusSavingKey === selectedRoleTemplate.key}
                    onClick={async () => {
                      setRoleStatusSavingKey(selectedRoleTemplate.key);
                      setRoleTemplatesError('');
                      setRoleTemplatesMessage('');
                      try {
                        await updateAdminRoleTemplateStatus(selectedRoleTemplate.key, {
                          isActive: !selectedRoleTemplate.isActive
                        });
                        await Promise.all([loadRoleTemplates(), loadUsers()]);
                        setRoleTemplatesMessage(
                          `${selectedRoleTemplate.name} ${selectedRoleTemplate.isActive ? 'deactivated' : 'activated'} successfully.`
                        );
                      } catch (requestError) {
                        setRoleTemplatesError(
                          getApiErrorMessage(requestError, 'Unable to update role status.')
                        );
                      } finally {
                        setRoleStatusSavingKey('');
                      }
                    }}
                    type="button"
                  >
                    <AppIcon
                      className="h-4 w-4"
                      name={selectedRoleTemplate.isActive ? 'warning' : 'check'}
                    />
                    {roleStatusSavingKey === selectedRoleTemplate.key
                      ? 'Saving...'
                      : selectedRoleTemplate.isActive
                        ? 'Deactivate Role'
                        : 'Activate Role'}
                  </button>
                  <button
                    className="btn-secondary gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                    disabled={deletingRoleKey === selectedRoleTemplate.key}
                    onClick={handleDeleteRoleTemplate}
                    type="button"
                  >
                    <AppIcon className="h-4 w-4" name="warning" />
                    {deletingRoleKey === selectedRoleTemplate.key ? 'Deleting...' : 'Delete Role'}
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="label">Page Permissions</p>
                  <PermissionChecklist
                    onToggle={updateEditRolePermission}
                    selectedPermissions={editRoleForm.permissions}
                  />
                </div>

                <button
                  className="btn-primary gap-2"
                  disabled={roleTemplateSaving}
                  type="submit"
                >
                  <AppIcon className="h-4 w-4" name="check" />
                  {roleTemplateSaving ? 'Saving Role...' : 'Update Role'}
                </button>
              </>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Create or load a managed role first, then edit it here.
              </p>
            )}
          </form>
        </div>
      ) : null}

      {activeTab === 'password' ? (
        <form className="panel max-w-3xl space-y-5 p-6" onSubmit={handleChangePassword}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Change Your Password</h2>
              <p className="mt-2 text-sm text-slate-500">
                Update the current admin password used to access the admin portal.
              </p>
            </div>
            <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
              <AppIcon className="h-5 w-5" name="key" />
            </div>
          </div>

          <FormAlert message={passwordError} />
          <FormAlert message={passwordMessage} type="success" />

          <div>
            <label className="label" htmlFor="current-password">
              Current Password
            </label>
            <input
              className="input"
              id="current-password"
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: event.target.value
                }))
              }
              required
              type="password"
              value={passwordForm.currentPassword}
            />
          </div>

          <div>
            <label className="label" htmlFor="new-password">
              New Password
            </label>
            <input
              className="input"
              id="new-password"
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
              required
              type="password"
              value={passwordForm.newPassword}
            />
          </div>

          <button className="btn-primary gap-2" type="submit">
            <AppIcon className="h-4 w-4" name="key" />
            Update Password
          </button>
        </form>
      ) : null}
    </AdminPageShell>
  );
}
