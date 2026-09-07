import { AppError, assertFound } from "../utils/appError.js";

export class MajorOptionService {
  constructor({ studentRepository, catalogService, studyPlanRepository }) {
    this.studentRepository = studentRepository;
    this.catalogService = catalogService;
    this.studyPlanRepository = studyPlanRepository;
  }

  updateStudentMajorOptionSelection(studentId, { slotCourseId, selectedCourseId }) {
    const student = assertFound(this.studentRepository.getStudentProfileById(studentId), "Student not found.");
    const requirements = this.catalogService.getProgramRequirements(
      student.selected_program_id,
      student.selected_major_id
    );
    const optionBlock = (requirements.majorOptionBlocks || []).find((block) =>
      (block.slotCourses || []).some((course) => course.id === slotCourseId)
    );

    if (!optionBlock) {
      throw new AppError(404, "Major option slot not found for the current student.");
    }

    const slotCourse = optionBlock.slotCourses.find((course) => course.id === slotCourseId);
    const currentSelections = this.studentRepository.listMajorOptionSelectionsByStudentId(studentId);
    const existingSelection = currentSelections.find((selection) => selection.slotCourseId === slotCourseId) ?? null;

    if (selectedCourseId !== null) {
      const selectedCourse = optionBlock.optionCourses.find((course) => course.id === selectedCourseId);
      if (!selectedCourse) {
        throw new AppError(400, `The selected course is not approved for ${slotCourse?.name || "this option slot"}.`);
      }

      const duplicateSelection = currentSelections.find(
        (selection) => selection.slotCourseId !== slotCourseId && selection.selectedCourseId === selectedCourseId
      );
      if (duplicateSelection) {
        throw new AppError(409, `${selectedCourse.code} is already selected in another AI major option slot.`);
      }
    }

    if (existingSelection?.selectedCourseId === selectedCourseId) {
      return this.studentRepository.listMajorOptionSelectionsByStudentId(studentId);
    }

    if (selectedCourseId === null) {
      this.studentRepository.deleteMajorOptionSelection(studentId, slotCourseId);
    } else {
      this.studentRepository.upsertMajorOptionSelection(studentId, slotCourseId, selectedCourseId);
    }

    const updatedSelections = this.studentRepository.listMajorOptionSelectionsByStudentId(studentId);
    const staticRequiredCourseIds = new Set(requirements.distinctCourses.map((course) => course.id));
    const stillSelectedCourseIds = new Set(updatedSelections.map((selection) => selection.selectedCourseId));

    if (
      existingSelection?.selectedCourseId &&
      !staticRequiredCourseIds.has(existingSelection.selectedCourseId) &&
      !stillSelectedCourseIds.has(existingSelection.selectedCourseId)
    ) {
      this.studentRepository.deleteCourseRecordByCourseId(studentId, existingSelection.selectedCourseId);
    }

    this.studyPlanRepository.deleteSavedStudyPlan(studentId);
    return updatedSelections;
  }
}
