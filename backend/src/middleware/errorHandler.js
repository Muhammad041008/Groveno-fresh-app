// Central error handler
function errorHandler(err, req, res, next) {
  // Normalize known Mongoose errors to 400
  let status = err.status || err.statusCode;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {}).map((e) => e.message).join('; ') || message;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  status = status || 500;
  if (status >= 500) console.error('[Error]', err);

  const payload = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && status >= 500) payload.stack = err.stack;
  res.status(status).json(payload);
}

module.exports = errorHandler;
