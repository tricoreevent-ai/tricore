import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.slice(1).join('.') || 'request'}: ${issue.message}`)
      .join(', ');

    return next(new ApiError(400, message, parsed.error.issues));
  }

  if (parsed.data.body) {
    req.body = parsed.data.body;
  }

  if (parsed.data.params) {
    req.params = parsed.data.params;
  }

  if (parsed.data.query) {
    req.query = parsed.data.query;
  }

  next();
};

