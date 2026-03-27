import { useEffect, useMemo, useState } from 'react';

import {
  changeAdminPassword,
  deleteAdminUser,
  deleteAdminRoleTemplate,
  createAdminRoleTemplate,
  createAdminUser,
  getAdminRoleTemplates,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
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
import AudienceUsersWorkspace from '../../components/users/AudienceUsersWorkspace.jsx';
import CampaignManagementPanel from '../../components/users/CampaignManagementPanel.jsx';
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
import useAdminAuth from '../../hooks/useAdminAuth.js';
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

const createInitialEditUserForm = () => ({
  name: '',
  username: '',
  email: ''
});

const passwordInitialForm = {
  currentPassword: '',
  newPassword: ''
};

const adminPasswordResetInitialForm = {
  userId: '',
  newPassword: ''
};

const permissionOptions = Object.values(adminPermissions);
const managedCoreUsernames = ['tricore', 'kenny', 'vinod'];

const userTabs = [
  { key: 'audience', label: 'Audience Users', icon: 'users' },
  { key: 'campaigns', label: 'Campaigns', icon: 'mail' },
  { key: 'accounts', label: 'Admin Accounts', icon: 'users' },
  { key: 'create', label: 'Create Admin User', icon: 'userPlus' },
  { key: 'edit', label: 'Edit Admin User', icon: 'edit' },
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

function TabButton({ active, fullWidth = false, icon, label, onClick }) {
  return (
    <button
      className={`flex items-center gap-2 text-sm font-semibold transition ${
        fullWidth
          ? `w-full justify-start rounded-2xl px-4 py-3 text-left ${
              active ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-brand-mist'
            }`
          : `rounded-full px-4 py-2.5 ${
              active ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-brand-mist'
            }`
      }`}
      onClick={onClick}
      type="button"
    >
      <AppIcon className="h-4 w-4" name={icon} />
      {label}
    </button>
  );
}

function CompactActionButton({
  disabled = false,
  icon,
  label,
  onClick,
  tone = 'default'
}) {
  const toneClassName =
    tone === 'danger'
      ? 'border-rose-200 text-rose-600 hover:bg-rose-50 disabled:border-rose-100 disabled:text-rose-300'
      : 'border-brand-blue/15 text-brand-blue hover:bg-brand-mist disabled:border-slate-200 disabled:text-slate-300';

  return (
    <button
      aria-label={label}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-white px-3 py-2 text-xs font-semibold transition ${toneClassName}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <AppIcon className="h-3.5 w-3.5" name={icon} />
      <span>{label}</span>
    </button>
  );
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('audience');
  const [mobileTabMenuOpen, setMobileTabMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [createForm, setCreateForm] = useState(createInitialUserForm);
  const [createRoleForm, setCreateRoleForm] = useState(createInitialRoleForm);
  const [editUserForm, setEditUserForm] = useState(createInitialEditUserForm);
  const [passwordForm, setPasswordForm] = useState(passwordInitialForm);
  const [adminPasswordResetForm, setAdminPasswordResetForm] = useState(adminPasswordResetInitialForm);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEditableUserId, setSelectedEditableUserId] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [accessForm, setAccessForm] = useState(buildAccessForm(null));
  const [editRoleForm, setEditRoleForm] = useState(createInitialRoleEditForm);
  const [createMessage, setCreateMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [editUserMessage, setEditUserMessage] = useState('');
  const [editUserError, setEditUserError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [adminPasswordResetMessage, setAdminPasswordResetMessage] = useState('');
  const [adminPasswordResetError, setAdminPasswordResetError] = useState('');
  const [listError, setListError] = useState('');
  const [listMessage, setListMessage] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [roleTemplatesLoading, setRoleTemplatesLoading] = useState(true);
  const [roleTemplatesError, setRoleTemplatesError] = useState('');
  const [roleTemplatesMessage, setRoleTemplatesMessage] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [accessError, setAccessError] = useState('');
  const [accessSaving, setAccessSaving] = useState(false);
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [roleTemplateSaving, setRoleTemplateSaving] = useState(false);
  const [roleStatusSavingKey, setRoleStatusSavingKey] = useState('');
  const [deletingRoleKey, setDeletingRoleKey] = useState('');
  const [adminPasswordResetSaving, setAdminPasswordResetSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState('');
  const [adminWorkspaceInitialized, setAdminWorkspaceInitialized] = useState(false);

  const adminWorkspaceActive = !['audience', 'campaigns'].includes(activeTab);

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
    if (!adminWorkspaceActive || adminWorkspaceInitialized) {
      return;
    }

    setAdminWorkspaceInitialized(true);
    void Promise.all([loadUsers(), loadRoleTemplates()]);
  }, [adminWorkspaceActive, adminWorkspaceInitialized]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId('');
      setSelectedEditableUserId('');
      return;
    }

    if (!users.some((user) => user._id === selectedUserId)) {
      setSelectedUserId(users[0]._id);
    }

    if (!users.some((user) => user._id === selectedEditableUserId)) {
      setSelectedEditableUserId(users[0]._id);
    }
  }, [selectedEditableUserId, selectedUserId, users]);

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

  const selectedEditableUser = useMemo(
    () => users.find((user) => user._id === selectedEditableUserId) || null,
    [selectedEditableUserId, users]
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
  const activeTabMeta = useMemo(
    () => userTabs.find((tab) => tab.key === activeTab) || userTabs[0],
    [activeTab]
  );
  const pageMeta = useMemo(() => {
    if (activeTab === 'audience') {
      return {
        title: 'Users',
        description:
          'Review registered users, past participants, and interested contacts with paginated loading, export controls, and reminder tools.'
      };
    }

    if (activeTab === 'campaigns') {
      return {
        title: 'Campaigns',
        description:
          'Build targeted audience campaigns, manage delivery preferences, and review bulk email history without mixing promotion work into admin-account setup.'
      };
    }

    return {
      title: 'Admin Users',
      description:
        'Create admin accounts, define reusable role templates, and manage page-level accessibility without mixing user setup and access editing into one long form.'
    };
  }, [activeTab]);
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
    if (!selectedEditableUser) {
      setEditUserForm(createInitialEditUserForm());
      setAdminPasswordResetForm(adminPasswordResetInitialForm);
      return;
    }

    setEditUserForm({
      name: selectedEditableUser.name || '',
      username: selectedEditableUser.username || '',
      email: selectedEditableUser.email || ''
    });
    setAdminPasswordResetForm((current) => ({
      ...current,
      userId: selectedEditableUser._id
    }));
    setEditUserError('');
    setEditUserMessage('');
    setAdminPasswordResetError('');
    setAdminPasswordResetMessage('');
  }, [selectedEditableUser]);

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

  useEffect(() => {
    setMobileTabMenuOpen(false);
  }, [activeTab]);

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
        cell: (user) => {
          const isCurrentAccount = String(user._id) === String(currentAdmin?._id);
          const isManagedCoreUser = managedCoreUsernames.includes(String(user.username || '').toLowerCase());

          return (
            <div className="flex flex-wrap gap-2">
              <CompactActionButton
                icon="edit"
                label="Edit"
                onClick={() => {
                  setSelectedEditableUserId(user._id);
                  setActiveTab('edit');
                }}
              />
              <CompactActionButton
                icon="security"
                label="Access"
                onClick={() => {
                  setSelectedUserId(user._id);
                  setActiveTab('access');
                }}
              />
              <CompactActionButton
                icon="key"
                label="Reset"
                onClick={() => {
                  setSelectedEditableUserId(user._id);
                  setActiveTab('password');
                }}
              />
              <CompactActionButton
                disabled={isCurrentAccount || isManagedCoreUser || deletingUserId === user._id}
                icon="trash"
                label={deletingUserId === user._id ? 'Deleting' : 'Delete'}
                onClick={() => handleDeleteUser(user)}
                tone="danger"
              />
            </div>
          );
        }
      }
    ],
    [currentAdmin?._id, deletingUserId, roleTemplates]
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
            <CompactActionButton
              icon="edit"
              label="Edit"
              onClick={() => {
                setSelectedRoleKey(template.key);
                setActiveTab('access');
              }}
            />
            <CompactActionButton
              disabled={roleStatusSavingKey === template.key}
              icon={template.isActive ? 'warning' : 'check'}
              label={
                roleStatusSavingKey === template.key
                  ? 'Saving'
                  : template.isActive
                    ? 'Disable'
                    : 'Enable'
              }
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
            />
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

  const handleEditUser = async (event) => {
    event.preventDefault();

    if (!selectedEditableUser?._id) {
      setEditUserError('Select an admin user first.');
      return;
    }

    if (!editUserForm.name.trim()) {
      setEditUserError('Full name is required.');
      return;
    }

    if (editUserForm.username.trim().length < 3) {
      setEditUserError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserForm.email.trim())) {
      setEditUserError('Enter a valid email address.');
      return;
    }

    setEditUserSaving(true);
    setEditUserError('');
    setEditUserMessage('');
    setListError('');
    setListMessage('');

    try {
      const response = await updateAdminUser(selectedEditableUser._id, {
        name: editUserForm.name.trim(),
        username: editUserForm.username.trim().toLowerCase(),
        email: editUserForm.email.trim().toLowerCase()
      });

      setUsers((current) => current.map((user) => (user._id === response._id ? response : user)));
      setEditUserMessage(`User details updated for ${response.name}.`);
      setListMessage(`User details updated for ${response.name}.`);
    } catch (requestError) {
      setEditUserError(getApiErrorMessage(requestError, 'Unable to update admin user details.'));
    } finally {
      setEditUserSaving(false);
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

  const handleResetAdminUserPassword = async (event) => {
    event.preventDefault();

    if (!selectedEditableUser?._id) {
      setAdminPasswordResetError('Select an admin user first.');
      return;
    }

    if (adminPasswordResetForm.newPassword.length < 6) {
      setAdminPasswordResetError('New password must be at least 6 characters.');
      return;
    }

    setAdminPasswordResetSaving(true);
    setAdminPasswordResetError('');
    setAdminPasswordResetMessage('');
    setListError('');
    setListMessage('');

    try {
      await resetAdminUserPassword(selectedEditableUser._id, {
        newPassword: adminPasswordResetForm.newPassword
      });
      setAdminPasswordResetMessage(`Password updated for ${selectedEditableUser.name}.`);
      setListMessage(`Password updated for ${selectedEditableUser.name}.`);
      setAdminPasswordResetForm((current) => ({
        ...current,
        newPassword: ''
      }));
    } catch (requestError) {
      setAdminPasswordResetError(
        getApiErrorMessage(requestError, 'Unable to update this admin password.')
      );
    } finally {
      setAdminPasswordResetSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?._id) {
      return;
    }

    if (
      !window.confirm(
        `Delete the admin user "${user.name}" (${user.username})? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingUserId(user._id);
    setListError('');
    setListMessage('');

    try {
      await deleteAdminUser(user._id);
      setUsers((current) => current.filter((currentUser) => currentUser._id !== user._id));
      setListMessage(`Deleted admin user ${user.username}.`);
    } catch (requestError) {
      setListError(getApiErrorMessage(requestError, 'Unable to delete the admin user.'));
    } finally {
      setDeletingUserId('');
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

  if (
    adminWorkspaceActive &&
    listLoading &&
    roleTemplatesLoading &&
    !users.length &&
    !roleTemplates.length
  ) {
    return <LoadingSpinner label="Loading admin account controls..." />;
  }

  return (
    <AdminPageShell
      description={pageMeta.description}
      title={pageMeta.title}
    >
      <div className="mb-6 md:hidden">
        <button
          aria-expanded={mobileTabMenuOpen}
          className="flex w-full items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-soft"
          onClick={() => setMobileTabMenuOpen(true)}
          type="button"
        >
          <div className="flex min-w-0 items-center gap-3 text-left">
            <span className="rounded-2xl bg-brand-mist p-2 text-brand-blue">
              <AppIcon className="h-4 w-4" name={activeTabMeta.icon} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Admin Sections
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                {activeTabMeta.label}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-brand-blue/15 p-2 text-brand-blue">
            <AppIcon className="h-4 w-4" name="menu" />
          </span>
        </button>
      </div>

      {mobileTabMenuOpen ? (
        <div className="fixed inset-0 z-[120] md:hidden">
          <button
            aria-label="Close admin user sections"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileTabMenuOpen(false)}
            type="button"
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(84vw,320px)] flex-col border-l border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Admin Sections
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">User Management</p>
              </div>
              <button
                aria-label="Close admin user sections"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-brand-mist hover:text-brand-blue"
                onClick={() => setMobileTabMenuOpen(false)}
                type="button"
              >
                <AppIcon className="h-4 w-4" name="close" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {userTabs.map((tab) => (
                <TabButton
                  active={activeTab === tab.key}
                  fullWidth
                  icon={tab.icon}
                  key={tab.key}
                  label={tab.label}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mb-8 hidden w-full flex-wrap rounded-[1.75rem] bg-white p-2 shadow-soft md:inline-flex lg:w-auto">
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

      {activeTab === 'audience' ? <AudienceUsersWorkspace /> : null}

      {activeTab === 'campaigns' ? <CampaignManagementPanel /> : null}

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
              <FormAlert message={listMessage} type="success" />
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

      {activeTab === 'edit' ? (
        <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <form className="panel space-y-5 p-6" onSubmit={handleEditUser}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Edit Admin User</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Update the basic identity details for the selected admin account. Page access is
                  still managed from the Modify Role Access tab.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="settings" />
              </div>
            </div>

            <FormAlert message={editUserError} />
            <FormAlert message={editUserMessage} type="success" />

            <div>
              <label className="label" htmlFor="edit-admin-user">
                Select Admin User
              </label>
              <TypeaheadSelect
                disabled={!users.length}
                id="edit-admin-user"
                noOptionsMessage="No admin users available."
                onChange={(event) => setSelectedEditableUserId(event.target.value)}
                options={adminUserOptions}
                placeholder="Select admin user"
                searchPlaceholder="Search admin users"
                value={selectedEditableUserId}
              />
            </div>

            {selectedEditableUser ? (
              <>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Current Account
                  </p>
                  <p className="mt-3 text-xl font-bold text-slate-950">{selectedEditableUser.name}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedEditableUser.email || selectedEditableUser.username}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Role: {getAdminRoleLabel(selectedEditableUser)}
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="edit-admin-name">
                      Full Name
                    </label>
                    <input
                      className="input"
                      id="edit-admin-name"
                      onChange={(event) =>
                        setEditUserForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                      value={editUserForm.name}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-admin-username">
                      Username
                    </label>
                    <input
                      className="input"
                      id="edit-admin-username"
                      onChange={(event) =>
                        setEditUserForm((current) => ({ ...current, username: event.target.value }))
                      }
                      required
                      value={editUserForm.username}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor="edit-admin-email">
                      Email
                    </label>
                    <input
                      className="input"
                      id="edit-admin-email"
                      onChange={(event) =>
                        setEditUserForm((current) => ({ ...current, email: event.target.value }))
                      }
                      required
                      type="email"
                      value={editUserForm.email}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary gap-2" disabled={editUserSaving} type="submit">
                    <AppIcon className="h-4 w-4" name="check" />
                    {editUserSaving ? 'Saving...' : 'Save User Details'}
                  </button>
                  <button
                    className="btn-secondary gap-2"
                    onClick={() => {
                      setSelectedUserId(selectedEditableUser._id);
                      setActiveTab('access');
                    }}
                    type="button"
                  >
                    <AppIcon className="h-4 w-4" name="security" />
                    Open Access Settings
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No admin user is available to edit.
              </p>
            )}
          </form>

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Managed Core Accounts</h2>
                <p className="mt-2 text-sm text-slate-500">
                  The requested working set is limited to tricore, kenny, and vinod. Other admin
                  users can be deleted from the directory.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="users" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {managedCoreUsernames.map((username) => {
                const matchingUser = users.find(
                  (user) => String(user.username || '').toLowerCase() === username
                );

                return (
                  <div className="rounded-3xl bg-slate-50 p-4" key={username}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{matchingUser?.name || username}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {matchingUser?.email || 'Account not found'}
                        </p>
                      </div>
                      <span
                        className={`badge ${
                          matchingUser ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {matchingUser ? 'Present' : 'Missing'}
                      </span>
                    </div>
                  </div>
                );
              })}
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
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <form className="panel space-y-5 p-6" onSubmit={handleChangePassword}>
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

          <form className="panel space-y-5 p-6" onSubmit={handleResetAdminUserPassword}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Reset Admin Password</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Select an admin user and set a new portal password securely without editing
                  other account details.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                <AppIcon className="h-5 w-5" name="security" />
              </div>
            </div>

            <FormAlert message={adminPasswordResetError} />
            <FormAlert message={adminPasswordResetMessage} type="success" />

            <div>
              <label className="label" htmlFor="admin-password-user">
                Select Admin User
              </label>
              <TypeaheadSelect
                disabled={!users.length}
                id="admin-password-user"
                noOptionsMessage="No admin users available."
                onChange={(event) => setSelectedEditableUserId(event.target.value)}
                options={adminUserOptions}
                placeholder="Select admin user"
                searchPlaceholder="Search admin users"
                value={selectedEditableUserId}
              />
            </div>

            {selectedEditableUser ? (
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Selected Account
                </p>
                <p className="mt-3 text-xl font-bold text-slate-950">{selectedEditableUser.name}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedEditableUser.username} • {selectedEditableUser.email}
                </p>
              </div>
            ) : null}

            <div>
              <label className="label" htmlFor="admin-reset-password">
                New Password
              </label>
              <input
                className="input"
                id="admin-reset-password"
                onChange={(event) =>
                  setAdminPasswordResetForm((current) => ({
                    ...current,
                    newPassword: event.target.value
                  }))
                }
                required
                type="password"
                value={adminPasswordResetForm.newPassword}
              />
            </div>

            <button className="btn-primary gap-2" disabled={adminPasswordResetSaving} type="submit">
              <AppIcon className="h-4 w-4" name="key" />
              {adminPasswordResetSaving ? 'Updating...' : 'Reset Selected Password'}
            </button>
          </form>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
