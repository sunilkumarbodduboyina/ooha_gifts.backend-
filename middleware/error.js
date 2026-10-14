
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// Express error-handling middleware
function errorHandler(err, req, res, next) {
  console.error('API error:', err.message);

  // If the response has already started, let Express handle the error.
  if (res.headersSent) {
    return next(err);
  }

  // Duplicate record (MySQL or MongoDB)
  if (
    err.code === 'ER_DUP_ENTRY' ||
    err.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message: 'That record already exists.',
    });
  }

  // Invalid uploaded file
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  // Invalid MongoDB document ID
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid record ID.',
    });
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  const status = Number(err.status || err.statusCode) || 500;
  const safeStatus = status >= 400 && status <= 599 ? status : 500;

  res.status(safeStatus).json({
    success: false,
    message:
      err.expose && safeStatus < 500
        ? err.message
        : safeStatus >= 500
          ? 'Something went wrong. Please try again later.'
          : err.message || 'Request failed.',
  });
}

// Forward async controller errors to Express
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Create an HTTP error safe to display to the client
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  httpError,
};
