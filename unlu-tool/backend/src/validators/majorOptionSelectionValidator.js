import { AppError } from "../utils/appError.js";
import { parseId, parseOptionalInteger } from "./commonValidators.js";

export function validateMajorOptionSelectionPayload(body) {
  const selectedCourseId = parseOptionalInteger(body.selectedCourseId, "selectedCourseId");

  if (selectedCourseId !== null && selectedCourseId <= 0) {
    throw new AppError(400, "selectedCourseId must be a positive integer when provided.");
  }

  return {
    slotCourseId: parseId(body.slotCourseId, "slotCourseId"),
    selectedCourseId
  };
}
