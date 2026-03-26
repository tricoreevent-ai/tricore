import { ApiError } from '../utils/ApiError.js';

export const notFound = (_req, _res, next) => {
  next(new ApiError(404, 'Route not found.'));
};

