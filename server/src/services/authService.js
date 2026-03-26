import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const googleClient = new OAuth2Client();
const DEFAULT_ADMIN_USERNAME = 'tricore';
const DEFAULT_ADMIN_PASSWORD = 'tricore';
const DEFAULT_ADMIN_EMAIL = 'admin@tricoreevents.online';

export const verifyGoogleCredential = async (credential) => {
  if (!env.googleClientIds.length) {
    throw new ApiError(500, 'Google OAuth is not configured on the server.');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.googleClientIds
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(401, 'Unable to verify Google account.');
  }

  return payload;
};

export const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      authProvider: user.authProvider
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

export const hashPassword = async (password) => bcrypt.hash(password, 10);

export const verifyPassword = async (password, passwordHash) => bcrypt.compare(password, passwordHash);

export const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({
    authProvider: 'local',
    username: DEFAULT_ADMIN_USERNAME
  }).select('+passwordHash');

  if (existingAdmin) {
    if (!existingAdmin.email) {
      existingAdmin.email = DEFAULT_ADMIN_EMAIL;
      await existingAdmin.save();
    }
    return existingAdmin;
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  return User.create({
    authProvider: 'local',
    username: DEFAULT_ADMIN_USERNAME,
    name: 'TriCore Admin',
    email: DEFAULT_ADMIN_EMAIL,
    role: 'admin',
    passwordHash
  });
};

const buildPartialTextUniqueIndex = (field) => ({
  name: `${field}_1`,
  unique: true,
  partialFilterExpression: {
    [field]: { $gt: '' }
  }
});

const hasMatchingPartialIndex = (index, expected) => {
  if (!index || index.unique !== true) return false;
  if (index.name !== expected.name) return false;
  const partial = index.partialFilterExpression || {};
  return JSON.stringify(partial) === JSON.stringify(expected.partialFilterExpression);
};

const isMissingNamespaceError = (error) =>
  error?.code === 26 || error?.codeName === 'NamespaceNotFound';

const ensurePartialUniqueIndex = async (collection, field) => {
  const expected = buildPartialTextUniqueIndex(field);
  let indexes = [];

  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (!isMissingNamespaceError(error)) {
      throw error;
    }
  }

  const existing = indexes.find((row) => row.name === expected.name);

  if (hasMatchingPartialIndex(existing, expected)) {
    return;
  }

  if (existing) {
    await collection.dropIndex(expected.name);
  }

  await collection.createIndex(
    { [field]: 1 },
    expected
  );
};

export const ensureUserUniqueIndexes = async () => {
  try {
    // Prevent duplicate-key issues when documents have missing/null email/username values.
    // This uses a partial filter to only enforce uniqueness for non-empty strings.
    await ensurePartialUniqueIndex(User.collection, 'email');
    await ensurePartialUniqueIndex(User.collection, 'username');
  } catch (error) {
    console.warn('User index migration warning:', error);
  }
};
