// Central error handler
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const payload = { success: false, message };
  if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;
  res.status(status).json(payload);
}

module.exports = errorHandler;
