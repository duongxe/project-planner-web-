import { AppError } from "../utils/appError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      ok: false,
      error: error.message,
      details: error.details ?? undefined
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    ok: false,
    error: "An unexpected server error occurred."
  });
}
