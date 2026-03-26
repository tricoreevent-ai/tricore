const shouldMaskServerMessage = (message) =>
  /SSL routines|tlsv1 alert|server selection|Could not connect to any servers|topology/i.test(
    String(message || '')
  );

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 && shouldMaskServerMessage(err.message)
      ? 'A backend service is temporarily unavailable. Check the server logs and connectivity settings.'
      : err.message || 'Internal server error.';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || null
  });
};
