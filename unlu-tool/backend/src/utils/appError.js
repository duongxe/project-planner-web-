export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function assertFound(value, message) {
  if (!value) {
    throw new AppError(404, message);
  }

  return value;
}
