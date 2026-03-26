import jwt from 'jsonwebtoken';

import {
  getMongoAvailabilityMessage,
  isMongoConnectivityError,
  recoverDbConnection
} from '../config/db.js';
import { env } from '../config/env.js';
import { hasAnyAdminPermission } from '../constants/adminAccess.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getTokenFromRequest = (req) => {
  const [scheme, token] = req.headers.authorization?.split(' ') || [];
  return scheme === 'Bearer' ? token : null;
};

const loadUserWithRecovery = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (error) {
    if (!isMongoConnectivityError(error)) {
      throw error;
    }

    try {
      await recoverDbConnection({ forceReconnect: true });
      return await User.findById(userId);
    } catch (retryError) {
      if (isMongoConnectivityError(retryError)) {
        throw new ApiError(503, getMongoAvailabilityMessage());
      }

      throw retryError;
    }
  }
};

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, 'Authentication required.');
  }

  const decoded = jwt.verify(token, env.jwtSecret);
  const user = await loadUserWithRecovery(decoded.sub);

  if (!user) {
    throw new ApiError(401, 'User session is no longer valid.');
  }

  req.user = user;
  next();
});

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = await loadUserWithRecovery(decoded.sub);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 503) {
      req.user = null;
      return next();
    }

    req.user = null;
  }

  next();
});

export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }

    next();
  };

export const authorizePermissions =
  (...permissions) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!hasAnyAdminPermission(req.user, permissions)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }

    next();
  };
