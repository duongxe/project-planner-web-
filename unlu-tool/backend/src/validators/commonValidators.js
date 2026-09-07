import { AppError } from "../utils/appError.js";

export function parseId(value, label = "id") {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${label} must be a positive integer.`);
  }

  return parsed;
}

export function parseOptionalInteger(value, label) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(400, `${label} must be an integer.`);
  }

  return parsed;
}

export function parseOptionalTermCode(value, label = "term") {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  if (!["S1", "S2", "SUMMER"].includes(normalized)) {
    throw new AppError(400, `${label} must be S1, S2, or SUMMER.`);
  }

  return normalized;
}

export function parseStudyPlanValidationScope(value, label = "scope") {
  if (value === undefined || value === null || value === "") {
    return "save";
  }

  const normalized = String(value).trim().toLowerCase();
  if (!["save", "drag"].includes(normalized)) {
    throw new AppError(400, `${label} must be save or drag.`);
  }

  return normalized;
}

export function parseStudyPlanQuery(query) {
  const startYear = parseOptionalInteger(query.startYear, "startYear") ?? new Date().getFullYear();
  const maxCoursesPerTerm = parseOptionalInteger(query.maxCoursesPerTerm, "maxCoursesPerTerm") ?? 4;
  const startTerm = parseOptionalTermCode(query.startTerm ?? "S1", "startTerm") ?? "S1";

  if (!["S1", "S2"].includes(startTerm)) {
    throw new AppError(400, "startTerm must be S1 or S2.");
  }

  if (maxCoursesPerTerm < 1 || maxCoursesPerTerm > 6) {
    throw new AppError(400, "maxCoursesPerTerm must be between 1 and 6.");
  }

  return {
    startYear,
    startTerm,
    maxCoursesPerTerm
  };
}
