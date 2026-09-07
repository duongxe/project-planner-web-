import { Router } from "express";
import {
  parseId,
  parseOptionalTermCode,
  parseStudyPlanQuery,
  parseStudyPlanValidationScope
} from "../validators/commonValidators.js";
import {
  validateCreateCourseRecord,
  validateUpdateCourseRecord
} from "../validators/studentCourseRecordValidator.js";
import { validateSaveStudyPlanPayload } from "../validators/studyPlanValidator.js";
import { validateMajorOptionSelectionPayload } from "../validators/majorOptionSelectionValidator.js";

export function createStudentRoutes({
  progressService,
  studyPlanService,
  studentRepository,
  majorOptionService
}) {
  const router = Router();

  router.get("/students/:id/progress", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    res.json({ ok: true, data: progressService.getStudentProgress(studentId) });
  });

  router.get("/students/:id/eligible-courses", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const term = parseOptionalTermCode(req.query.term, "term");
    res.json({ ok: true, data: studyPlanService.generateEligibleCourses(studentId, term) });
  });

  router.get("/students/:id/study-plan", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const options = parseStudyPlanQuery(req.query);
    res.json({ ok: true, data: studyPlanService.generateStudyPlan(studentId, options) });
  });

  router.get("/students/:id/saved-study-plans", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    res.json({ ok: true, data: studyPlanService.getSavedStudyPlanVersions(studentId) });
  });

  router.get("/students/:id/saved-study-plan", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    res.json({ ok: true, data: studyPlanService.getSavedStudyPlan(studentId) });
  });

  router.post("/students/:id/saved-study-plan/validate", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const payload = validateSaveStudyPlanPayload(req.body || {});
    const scope = parseStudyPlanValidationScope(req.query.scope, "scope");
    res.json({ ok: true, data: studyPlanService.validateStudyPlan(studentId, payload, { scope }) });
  });

  router.put("/students/:id/saved-study-plan", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const payload = validateSaveStudyPlanPayload(req.body || {});
    res.json({ ok: true, data: studyPlanService.saveStudyPlan(studentId, payload) });
  });

  router.delete("/students/:id/saved-study-plan/:planId", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const planId = parseId(req.params.planId, "planId");
    res.json({ ok: true, data: studyPlanService.deleteSavedStudyPlanVersion(studentId, planId) });
  });

  router.put("/students/:id/major-option-selections/:slotCourseId", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const slotCourseId = parseId(req.params.slotCourseId, "slotCourseId");
    const payload = validateMajorOptionSelectionPayload({
      ...req.body,
      slotCourseId
    });
    res.json({ ok: true, data: majorOptionService.updateStudentMajorOptionSelection(studentId, payload) });
  });

  router.post("/students/:id/course-records", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const payload = validateCreateCourseRecord(req.body || {});
    const record = studentRepository.createCourseRecord(studentId, payload);
    res.status(201).json({ ok: true, data: record });
  });

  router.put("/students/:id/course-records/:recordId", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const recordId = parseId(req.params.recordId, "recordId");
    const payload = validateUpdateCourseRecord(req.body || {});
    const record = studentRepository.updateCourseRecord(studentId, recordId, payload);
    res.json({ ok: true, data: record });
  });

  router.delete("/students/:id/course-records/:recordId", (req, res) => {
    const studentId = parseId(req.params.id, "studentId");
    const recordId = parseId(req.params.recordId, "recordId");
    const record = studentRepository.deleteCourseRecord(studentId, recordId);
    res.json({ ok: true, data: record });
  });

  return router;
}