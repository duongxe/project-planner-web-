import { AppError } from "../utils/appError.js";
import { parseOptionalInteger, parseOptionalTermCode } from "./commonValidators.js";

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new AppError(400, `${label} must be an array.`);
  }

  return value;
}

function parseCourseId(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${label} must be a positive integer.`);
  }

  return parsed;
}

export function validateSaveStudyPlanPayload(payload) {
  const startYear = parseOptionalInteger(payload.startYear, "startYear");
  const maxCoursesPerTerm = parseOptionalInteger(payload.maxCoursesPerTerm, "maxCoursesPerTerm");
  const startTerm = parseOptionalTermCode(payload.startTerm, "startTerm");
  const rawTerms = ensureArray(payload.terms, "terms");

  if (!startYear || startYear < 2000) {
    throw new AppError(400, "startYear must be a valid year.");
  }

  if (!startTerm || !["S1", "S2"].includes(startTerm)) {
    throw new AppError(400, "startTerm must be S1 or S2.");
  }

  if (!maxCoursesPerTerm || maxCoursesPerTerm < 1 || maxCoursesPerTerm > 6) {
    throw new AppError(400, "maxCoursesPerTerm must be between 1 and 6.");
  }

  const terms = rawTerms.map((term, index) => {
    const termCode = parseOptionalTermCode(term.termCode, `terms[${index}].termCode`);
    const year = parseOptionalInteger(term.year, `terms[${index}].year`);
    const courseIds = ensureArray(term.courseIds, `terms[${index}].courseIds`).map((courseId, courseIndex) =>
      parseCourseId(courseId, `terms[${index}].courseIds[${courseIndex}]`)
    );

    if (!termCode || !["S1", "S2"].includes(termCode)) {
      throw new AppError(400, `terms[${index}].termCode must be S1 or S2.`);
    }

    if (!year || year < 2000) {
      throw new AppError(400, `terms[${index}].year must be a valid year.`);
    }

    return {
      termCode,
      year,
      courseIds
    };
  });

  return {
    startTerm,
    startYear,
    maxCoursesPerTerm,
    terms
  };
}
