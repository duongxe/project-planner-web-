import { AppError } from "../utils/appError.js";
import { parseId, parseOptionalInteger } from "./commonValidators.js";

const VALID_STATUSES = new Set(["passed", "failed", "in_progress", "planned"]);
const VALID_TERMS = new Set(["S1", "S2", "SUMMER"]);

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value) {
  const status = String(value || "").trim();
  if (!VALID_STATUSES.has(status)) {
    throw new AppError(400, "status must be one of passed, failed, in_progress, or planned.");
  }

  return status;
}

function normalizeTerm(value) {
  const term = normalizeOptionalString(value);
  if (term === null) {
    return null;
  }

  const normalized = term.toUpperCase();
  if (!VALID_TERMS.has(normalized)) {
    throw new AppError(400, "term must be S1, S2, or SUMMER.");
  }

  return normalized;
}

function normalizeGrade(value) {
  return normalizeOptionalString(value);
}

export function validateCreateCourseRecord(body) {
  return {
    courseId: parseId(body.courseId, "courseId"),
    status: normalizeStatus(body.status),
    year: parseOptionalInteger(body.year, "year"),
    term: normalizeTerm(body.term),
    grade: normalizeGrade(body.grade)
  };
}

export function validateUpdateCourseRecord(body) {
  return {
    status: normalizeStatus(body.status),
    year: parseOptionalInteger(body.year, "year"),
    term: normalizeTerm(body.term),
    grade: normalizeGrade(body.grade)
  };
}
