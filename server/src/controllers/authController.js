import { User } from '../models/User.js';
import {
  getMongoAvailabilityMessage,
  isMongoConnectivityError,
  recoverDbConnection
} from '../config/db.js';
import {
  adminPermissions,
  adminPortalRoles,
  getEffectiveAdminPermissions,
  hasAdminPermission,
  hasAdminPortalAccess,
  isFullAccessAdminRole,
  isBuiltInAdminRole,
  sanitizeAdminPermissions
} from '../constants/adminAccess.js';
import {
  createAdminRoleTemplate as createStoredAdminRoleTemplate,
  deleteAdminRoleTemplate as deleteStoredAdminRoleTemplate,
  findAdminRoleTemplateByKey,
  getAdminRoleTemplates as getStoredAdminRoleTemplates,
  setAdminRoleTemplateActiveState as setStoredAdminRoleTemplateActiveState,
  updateAdminRoleTemplate as updateStoredAdminRoleTemplate
} from '../services/adminRoleTemplateService.js';
import {
  hashPassword,
  signToken,
  verifyGoogleCredential,
  verifyPassword
} from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const serializeAdminUser = (user) => {
  const plainUser = typeof user?.toJSON === 'function' ? user.toJSON() : user;
  const effectivePermissions = getEffectiveAdminPermissions(plainUser);

  return {
    ...plainUser,
    roleName: plainUser?.roleName || '',
    permissions: sanitizeAdminPermissions(plainUser?.permissions),
    effectivePermissions
  };
};

const adminUserQuery = {
  authProvider: 'local',
  $or: [
    { role: { $in: adminPortalRoles } },
    { 'permissions.0': { $exists: true } }
  ]
};

const resolveAdminAssignment = async ({ role, permissions }) => {
  const normalizedRole = String(role || '').trim();

  if (!normalizedRole || normalizedRole === 'user') {
    throw new ApiError(400, 'Choose a valid admin role.');
  }

  if (normalizedRole === 'custom_admin') {
    const nextPermissions = sanitizeAdminPermissions(permissions);

    if (!nextPermissions.length) {
      throw new ApiError(400, 'Choose at least one page permission for custom access admins.');
    }

    return {
      role: normalizedRole,
      roleName: '',
      permissions: nextPermissions
    };
  }

  if (isFullAccessAdminRole(normalizedRole)) {
    return {
      role: normalizedRole,
      roleName: '',
      permissions: []
    };
  }

  const roleTemplate = await findAdminRoleTemplateByKey(normalizedRole);

  if (roleTemplate) {
    return {
      role: roleTemplate.key,
      roleName: roleTemplate.name,
      permissions: sanitizeAdminPermissions(roleTemplate.permissions)
    };
  }

  if (isBuiltInAdminRole(normalizedRole)) {
    return {
      role: normalizedRole,
      roleName: '',
      permissions: []
    };
  }

  throw new ApiError(400, 'Selected role template does not exist.');
};

const retryOnMongoConnectivityError = async (operation, unavailableMessage) => {
  try {
    return await operation();
  } catch (error) {
    if (!isMongoConnectivityError(error)) {
      throw error;
    }

    try {
      await recoverDbConnection({ forceReconnect: true });
      return await operation();
    } catch (retryError) {
      if (isMongoConnectivityError(retryError)) {
        throw new ApiError(503, unavailableMessage);
      }

      throw retryError;
    }
  }
};

const syncUsersForRoleTemplate = async (roleTemplate) => {
  await User.updateMany(
    { authProvider: 'local', role: roleTemplate.key },
    {
      $set: {
        roleName: roleTemplate.name,
        permissions: roleTemplate.permissions
      }
    }
  );
};

const getRoleTemplateUsageMap = async (roleKeys = []) => {
  if (!roleKeys.length) {
    return new Map();
  }

  const usage = await User.aggregate([
    {
      $match: {
        authProvider: 'local',
        role: { $in: roleKeys }
      }
    },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  return new Map(usage.map((item) => [item._id, item.count]));
};

export const googleAuth = asyncHandler(async (req, res) => {
  const payload = await verifyGoogleCredential(req.body.credential);

  const user = await User.findOneAndUpdate(
    { email: payload.email.toLowerCase() },
    {
      $set: {
        authProvider: 'google',
        googleId: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture || '',
        lastLoginAt: new Date()
      },
      $setOnInsert: {
        role: 'user'
      }
    },
    {
      new: true,
      upsert: true
    }
  );

  const token = signToken(user);

  res.json({
    success: true,
    data: {
      token,
      user
    }
  });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const username = req.body.username.trim().toLowerCase();

  const user = await retryOnMongoConnectivityError(
    () =>
      User.findOne({
        ...adminUserQuery,
        username
      }).select('+passwordHash'),
    getMongoAvailabilityMessage()
  );

  if (!user) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  const passwordMatches = await verifyPassword(req.body.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  user.lastLoginAt = new Date();
  await retryOnMongoConnectivityError(
    () => user.save(),
    getMongoAvailabilityMessage()
  );

  const token = signToken(user);

  res.json({
    success: true,
    data: {
      token,
      user: serializeAdminUser(user)
    }
  });
});

export const getAdminUsers = asyncHandler(async (_req, res) => {
  const users = await User.find(adminUserQuery)
    .select('name username email role roleName permissions createdAt lastLoginAt')
    .sort({ createdAt: 1 });

  res.json({
    success: true,
    data: users.map((user) => serializeAdminUser(user))
  });
});

export const createAdminUser = asyncHandler(async (req, res) => {
  const username = req.body.username.trim().toLowerCase();
  const email = req.body.email.trim().toLowerCase();

  const existingUser = await User.findOne({
    authProvider: 'local',
    username
  });

  if (existingUser) {
    throw new ApiError(409, 'An admin user with this username already exists.');
  }

  const existingEmail = await User.findOne({ email });

  if (existingEmail) {
    throw new ApiError(409, 'A user with this email address already exists.');
  }

  const passwordHash = await hashPassword(req.body.password);
  const assignment = await resolveAdminAssignment({
    role: req.body.role,
    permissions: req.body.permissions
  });

  const user = await User.create({
    authProvider: 'local',
    username,
    name: req.body.name.trim(),
    email,
    role: assignment.role,
    roleName: assignment.roleName,
    permissions: assignment.permissions,
    passwordHash
  });

  res.status(201).json({
    success: true,
    data: serializeAdminUser(user)
  });
});

export const updateAdminUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    ...adminUserQuery,
    _id: req.params.id
  });

  if (!user) {
    throw new ApiError(404, 'Admin user not found.');
  }

  const username = req.body.username.trim().toLowerCase();
  const email = req.body.email.trim().toLowerCase();

  const conflictingUsername = await User.findOne({
    authProvider: 'local',
    username,
    _id: { $ne: user._id }
  });

  if (conflictingUsername) {
    throw new ApiError(409, 'An admin user with this username already exists.');
  }

  const conflictingEmail = await User.findOne({
    email,
    _id: { $ne: user._id }
  });

  if (conflictingEmail) {
    throw new ApiError(409, 'A user with this email address already exists.');
  }

  user.name = req.body.name.trim();
  user.username = username;
  user.email = email;

  await user.save();

  res.json({
    success: true,
    data: serializeAdminUser(user)
  });
});

export const updateAdminUserAccess = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    ...adminUserQuery,
    _id: req.params.id
  });

  if (!user) {
    throw new ApiError(404, 'Admin user not found.');
  }

  const assignment = await resolveAdminAssignment({
    role: req.body.role,
    permissions: req.body.permissions
  });

  user.role = assignment.role;
  user.roleName = assignment.roleName;
  user.permissions = assignment.permissions;

  await user.save();

  res.json({
    success: true,
    data: serializeAdminUser(user)
  });
});

export const resetAdminUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    ...adminUserQuery,
    _id: req.params.id
  }).select('+passwordHash');

  if (!user) {
    throw new ApiError(404, 'Admin user not found.');
  }

  user.passwordHash = await hashPassword(req.body.newPassword);
  await user.save();

  res.json({
    success: true,
    message: `Password updated successfully for ${user.name}.`,
    data: serializeAdminUser(user)
  });
});

export const deleteAdminUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    ...adminUserQuery,
    _id: req.params.id
  });

  if (!user) {
    throw new ApiError(404, 'Admin user not found.');
  }

  if (String(user._id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot delete the admin account that is currently signed in.');
  }

  await user.deleteOne();

  res.json({
    success: true,
    data: {
      _id: req.params.id,
      username: user.username
    }
  });
});

export const changeAdminPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');

  if (!user || user.authProvider !== 'local' || !hasAdminPortalAccess(user)) {
    throw new ApiError(403, 'Admin account required.');
  }

  const passwordMatches = await verifyPassword(req.body.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.passwordHash = await hashPassword(req.body.newPassword);
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully.'
  });
});

export const getCurrentAdminPermissions = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      permissions: Object.values(adminPermissions).filter((permission) =>
        hasAdminPermission(req.user, permission)
      )
    }
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: hasAdminPortalAccess(req.user) ? serializeAdminUser(req.user) : req.user
  });
});

export const getAdminRoleTemplates = asyncHandler(async (_req, res) => {
  const templates = await getStoredAdminRoleTemplates();
  const usageMap = await getRoleTemplateUsageMap(templates.map((template) => template.key));

  res.json({
    success: true,
    data: templates.map((template) => ({
      ...template,
      assignedUserCount: usageMap.get(template.key) || 0
    }))
  });
});

export const createAdminRoleTemplate = asyncHandler(async (req, res) => {
  const template = await createStoredAdminRoleTemplate({
    payload: req.body,
    userId: req.user._id
  });

  res.status(201).json({
    success: true,
    data: template
  });
});

export const updateAdminRoleTemplate = asyncHandler(async (req, res) => {
  const template = await updateStoredAdminRoleTemplate({
    key: req.params.key,
    payload: req.body,
    userId: req.user._id
  });

  await syncUsersForRoleTemplate(template);

  res.json({
    success: true,
    data: template
  });
});

export const updateAdminRoleTemplateStatus = asyncHandler(async (req, res) => {
  const template = await setStoredAdminRoleTemplateActiveState({
    key: req.params.key,
    isActive: req.body.isActive,
    userId: req.user._id
  });

  res.json({
    success: true,
    data: template
  });
});

export const deleteAdminRoleTemplate = asyncHandler(async (req, res) => {
  const template = await deleteStoredAdminRoleTemplate({
    key: req.params.key,
    userId: req.user._id
  });

  const reassignedUsers = await User.updateMany(
    {
      authProvider: 'local',
      role: template.key
    },
    {
      $set: {
        role: 'custom_admin',
        roleName: ''
      }
    }
  );

  res.json({
    success: true,
    message: 'Role deleted successfully.',
    data: {
      key: template.key,
      reassignedUsers: reassignedUsers.modifiedCount || 0
    }
  });
});

export const updateCurrentUserPayoutDetails = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        payoutDetails: {
          upiId: String(req.body.upiId || '').trim(),
          accountHolderName: String(req.body.accountHolderName || '').trim(),
          accountNumber: String(req.body.accountNumber || '').trim(),
          bankName: String(req.body.bankName || '').trim(),
          ifscCode: String(req.body.ifscCode || '').trim(),
          branchName: String(req.body.branchName || '').trim(),
          notes: String(req.body.notes || '').trim()
        }
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    data: user
  });
});
