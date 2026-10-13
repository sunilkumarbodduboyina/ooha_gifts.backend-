function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('API error:', err.message);
  /* Response already on the wire (e.g. client aborted a gzip stream) —
     never attempt a second res.json(), just hand it back to Express. */
  if (res.headersSent) return next(err);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'That record already exists.' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ success: false, message: 'Record is in use and cannot be changed.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.expose ? err.message : err.message || 'Something went wrong',
  });
}

/** Wrap async controllers so rejections reach the error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Create an error with an HTTP status that is safe to show to clients. */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

module.exports = { notFound, errorHandler, asyncHandler, httpError };
