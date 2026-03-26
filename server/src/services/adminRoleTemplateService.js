import { AppSetting } from '../models/AppSetting.js';
import {
  adminPermissions,
  adminPortalRoles,
  adminRoles,
  builtInAdminRolePermissions,
  sanitizeAdminPermissions
} from '../constants/adminAccess.js';
import { ApiError } from '../utils/ApiError.js';

export const ADMIN_ROLE_TEMPLATES_KEY = 'admin-role-templates';

const RESERVED_ROLE_KEYS = new Set(['user', ...adminPortalRoles]);

const normalizeText = (value) => String(value || '').trim();

const defaultRoleTemplateDefinitions = [
  {
    key: adminRoles.operationsAdmin,
    name: 'Operations Admin',
    description: 'Manage overview, events, registrations, matches, and the reports workspace.'
  },
  {
    key: adminRoles.registrationsAdmin,
    name: 'Registrations Admin',
    description: 'Handle participant registrations, payment review, and registration reporting.'
  },
  {
    key: adminRoles.accountingAdmin,
    name: 'Accounting Admin',
    description: 'Record transactions and open finance reporting views.'
  },
  {
    key: adminRoles.reportsAdmin,
    name: 'Reports Admin',
    description: 'Review performance, finance, activity, and reporting workspaces.'
  },
  {
    key: adminRoles.settingsAdmin,
    name: 'Settings Admin',
    description: 'Manage configuration, backups, banners, payments, and security settings.'
  }
];

const slugifyRoleKey = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const serializeTemplate = (template = {}) => ({
  key: normalizeText(template.key),
  name: normalizeText(template.name),
  description: normalizeText(template.description),
  permissions: sanitizeAdminPermissions(template.permissions),
  isActive: template.isActive !== false,
  isDeleted: template.isDeleted === true,
  isDefaultRole: template.isDefaultRole === true,
  createdAt: template.createdAt || null,
  updatedAt: template.updatedAt || null
});

const normalizeTemplateList = (templates = []) =>
  (Array.isArray(templates) ? templates : [])
    .map(serializeTemplate)
    .filter(
      (template) =>
        template.key && template.name && (template.permissions.length || template.isDeleted)
    );

const defaultRoleTemplates = defaultRoleTemplateDefinitions.map((template) =>
  serializeTemplate({
    ...template,
    permissions:
      builtInAdminRolePermissions[template.key] ||
      (template.key === adminRoles.settingsAdmin ? [adminPermissions.settings] : []),
    isActive: true,
    isDeleted: false,
    isDefaultRole: true,
    createdAt: null,
    updatedAt: null
  })
);

const mergeRoleTemplates = (storedTemplates = []) => {
  const merged = new Map(defaultRoleTemplates.map((template) => [template.key, template]));

  storedTemplates.forEach((template) => {
    if (template.isDeleted) {
      merged.delete(template.key);
      return;
    }

    const existing = merged.get(template.key);
    merged.set(
      template.key,
      serializeTemplate({
        ...(existing || {}),
        ...template,
        isDefaultRole: existing?.isDefaultRole === true
      })
    );
  });

  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name, 'en'));
};

const getStoredTemplateDocument = async () =>
  AppSetting.findOne({ key: ADMIN_ROLE_TEMPLATES_KEY });

const getStoredRoleTemplateOverrides = async () => {
  const document = await getStoredTemplateDocument();
  return normalizeTemplateList(document?.value?.templates || []);
};

const saveTemplateList = async (templates, userId) =>
  AppSetting.findOneAndUpdate(
    { key: ADMIN_ROLE_TEMPLATES_KEY },
    {
      key: ADMIN_ROLE_TEMPLATES_KEY,
      value: {
        templates
      },
      updatedBy: userId
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

export const isReservedAdminRoleKey = (key) =>
  RESERVED_ROLE_KEYS.has(normalizeText(key).toLowerCase());

export const getAdminRoleTemplates = async () => {
  const storedTemplates = await getStoredRoleTemplateOverrides();
  return mergeRoleTemplates(storedTemplates);
};

export const findAdminRoleTemplateByKey = async (key) => {
  const normalizedKey = normalizeText(key).toLowerCase();

  if (!normalizedKey) {
    return null;
  }

  const templates = await getAdminRoleTemplates();
  return templates.find((template) => template.key === normalizedKey) || null;
};

export const createAdminRoleTemplate = async ({ payload, userId }) => {
  const templates = await getAdminRoleTemplates();
  const name = normalizeText(payload.name);
  const description = normalizeText(payload.description);
  const permissions = sanitizeAdminPermissions(payload.permissions);
  const key = slugifyRoleKey(payload.key || payload.name);

  if (!name) {
    throw new ApiError(400, 'Role name is required.');
  }

  if (!key) {
    throw new ApiError(400, 'Role key could not be generated from the provided name.');
  }

  if (isReservedAdminRoleKey(key)) {
    throw new ApiError(400, 'This role key is reserved for a system role.');
  }

  if (!permissions.length) {
    throw new ApiError(400, 'Choose at least one page permission for the role template.');
  }

  if (templates.some((template) => template.key === key)) {
    throw new ApiError(409, 'A role template with this name already exists.');
  }

  const timestamp = new Date();
  const nextTemplate = {
    key,
    name,
    description,
    permissions,
    isActive: true,
    isDeleted: false,
    isDefaultRole: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await saveTemplateList([...templates, nextTemplate], userId);

  return nextTemplate;
};

export const updateAdminRoleTemplate = async ({ key, payload, userId }) => {
  const normalizedKey = normalizeText(key).toLowerCase();
  const templates = await getAdminRoleTemplates();
  const storedTemplates = await getStoredRoleTemplateOverrides();
  const existing = templates.find((template) => template.key === normalizedKey);

  if (!existing) {
    throw new ApiError(404, 'Role template not found.');
  }

  const name = normalizeText(payload.name || existing.name);
  const description = normalizeText(
    payload.description !== undefined ? payload.description : existing.description
  );
  const permissions = sanitizeAdminPermissions(payload.permissions ?? existing.permissions);

  if (!name) {
    throw new ApiError(400, 'Role name is required.');
  }

  if (!permissions.length) {
    throw new ApiError(400, 'Choose at least one page permission for the role template.');
  }

  const updatedTemplate = {
    ...existing,
    name,
    description,
    permissions,
    isActive: payload.isActive ?? existing.isActive,
    isDeleted: false,
    updatedAt: new Date()
  };

  await saveTemplateList(
    storedTemplates.some((template) => template.key === normalizedKey)
      ? storedTemplates.map((template) => (template.key === normalizedKey ? updatedTemplate : template))
      : [...storedTemplates, updatedTemplate],
    userId
  );

  return updatedTemplate;
};

export const setAdminRoleTemplateActiveState = async ({ key, isActive, userId }) => {
  const normalizedKey = normalizeText(key).toLowerCase();
  const templates = await getAdminRoleTemplates();
  const storedTemplates = await getStoredRoleTemplateOverrides();
  const existing = templates.find((template) => template.key === normalizedKey);

  if (!existing) {
    throw new ApiError(404, 'Role template not found.');
  }

  const updatedTemplate = {
    ...existing,
    isActive: Boolean(isActive),
    isDeleted: false,
    updatedAt: new Date()
  };

  await saveTemplateList(
    storedTemplates.some((template) => template.key === normalizedKey)
      ? storedTemplates.map((template) =>
          template.key === normalizedKey ? updatedTemplate : template
        )
      : [...storedTemplates, updatedTemplate],
    userId
  );

  return updatedTemplate;
};

export const deleteAdminRoleTemplate = async ({ key, userId }) => {
  const normalizedKey = normalizeText(key).toLowerCase();
  const templates = await getAdminRoleTemplates();
  const storedTemplates = await getStoredRoleTemplateOverrides();
  const existing = templates.find((template) => template.key === normalizedKey);

  if (!existing) {
    throw new ApiError(404, 'Role template not found.');
  }

  if (existing.isDefaultRole) {
    const deletedTemplate = {
      ...existing,
      isActive: false,
      isDeleted: true,
      updatedAt: new Date()
    };

    await saveTemplateList(
      storedTemplates.some((template) => template.key === normalizedKey)
        ? storedTemplates.map((template) =>
            template.key === normalizedKey ? deletedTemplate : template
          )
        : [...storedTemplates, deletedTemplate],
      userId
    );
  } else {
    await saveTemplateList(
      storedTemplates.filter((template) => template.key !== normalizedKey),
      userId
    );
  }

  return existing;
};
