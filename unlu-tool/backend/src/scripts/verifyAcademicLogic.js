import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createDatabase } from "../db/connection.js";
import { bootstrapDatabase } from "../db/bootstrap.js";
import { ProgramRepository } from "../repositories/programRepository.js";
import { RequirementRepository } from "../repositories/requirementRepository.js";
import { CourseRepository } from "../repositories/courseRepository.js";
import { RuleRepository } from "../repositories/ruleRepository.js";
import { StudentRepository } from "../repositories/studentRepository.js";
import { StudyPlanRepository } from "../repositories/studyPlanRepository.js";
import { CatalogService } from "../services/catalogService.js";
import { RuleEngineService } from "../services/ruleEngineService.js";
import { ProgressService } from "../services/progressService.js";
import { StudyPlanService } from "../services/studyPlanService.js";
import { MajorOptionService } from "../services/majorOptionService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");

const tempDbPath = path.join(os.tmpdir(), "academic_advising_verify.db");
if (fs.existsSync(tempDbPath)) {
  fs.unlinkSync(tempDbPath);
}

const db = createDatabase(tempDbPath);
bootstrapDatabase(db, {
  migrationsDir: path.join(backendRoot, "db", "migrations"),
  seedsDir: path.join(backendRoot, "db", "seeds")
});

const catalogService = new CatalogService({
  programRepository: new ProgramRepository(db),
  requirementRepository: new RequirementRepository(db),
  courseRepository: new CourseRepository(db),
  ruleRepository: new RuleRepository(db)
});

const ruleEngineService = new RuleEngineService({
  studentRepository: new StudentRepository(db),
  catalogService,
  ruleRepository: new RuleRepository(db)
});

const progressService = new ProgressService({
  ruleEngineService,
  courseRepository: new CourseRepository(db)
});
const studyPlanRepository = new StudyPlanRepository(db);
const studyPlanService = new StudyPlanService({
  ruleEngineService,
  progressService,
  studyPlanRepository
});
const majorOptionService = new MajorOptionService({
  studentRepository: new StudentRepository(db),
  catalogService,
  studyPlanRepository
});
const studentRepository = new StudentRepository(db);
const courseRepository = new CourseRepository(db);

const midProgramStudent = studentRepository.getStudentByStudentNumber("c3415519");
const exclusionStudent = studentRepository.getStudentByStudentNumber("c0000001");
const sharedStudent = studentRepository.getStudentByStudentNumber("c0000002");
const bcsAiStudent = studentRepository.getStudentByStudentNumber("c0000003");

assert(midProgramStudent, "Seeded mid-program student is missing.");
assert(exclusionStudent, "Seeded exclusion-case student is missing.");
assert(sharedStudent, "Seeded shared-course student is missing.");
assert(bcsAiStudent, "Seeded Bachelor of Computer Science AI student is missing.");

const midProgress = progressService.getStudentProgress(midProgramStudent.id);
assert(midProgress.summary.earnedUnits === 30, "Default student should have 30 earned units.");
assert(midProgress.electiveSlots.length === 4, "Exactly four elective slots should be exposed in progress.");
assert(midProgress.summary.electivesCompletedUnits === 0, "Fresh students should start with zero completed elective slots.");

const sharedProgress = progressService.getStudentProgress(sharedStudent.id);
assert(sharedProgress.summary.earnedUnits === 160, "Shared-course student should have 160 earned units.");
assert(
  sharedProgress.summary.requiredDistinctUnitsCompleted === 160,
  "Shared-course student should count shared courses once toward earned units."
);

const bcsAiProgress = progressService.getStudentProgress(bcsAiStudent.id);
assert(bcsAiProgress.student.program.code === "BCS", "BCS AI student should be attached to the BCS program.");
assert(bcsAiProgress.student.major.code === "AI", "BCS AI student should be attached to the AI major.");
assert(bcsAiProgress.summary.earnedUnits === 0, "Fresh BCS AI student should start with zero earned units.");
assert(bcsAiProgress.electiveSlots.length === 2, "BCS program should expose exactly two elective slots.");
assert(
  bcsAiProgress.majorBlocks.some((block) => block.code === "COMPULSORY" && block.requiredUnits === 60),
  "BCS AI major should include a 60-unit compulsory block."
);
assert(
  bcsAiProgress.majorBlocks.some((block) => block.code === "OPTIONS" && block.requiredUnits === 20),
  "BCS AI major should include a 20-unit option block."
);
assert(
  bcsAiProgress.requiredCourses.some((course) => course.code === "AIOPT-01"),
  "BCS AI major should expose the first option placeholder slot as a required course."
);
assert(
  bcsAiProgress.requiredCourses.filter((course) => course.majorOptionSlot).length === 2,
  "BCS AI progress should expose exactly two selectable approved option slots."
);
assert(
  bcsAiProgress.requiredCourses.filter((course) => course.majorOptionSlot).every((course) => (course.optionChoices || []).length === 7),
  "Each BCS AI option slot should expose the full approved option list before any selection is made."
);

const aiOptionPool = db.prepare(`
  SELECT course.code
  FROM major_block_option_courses option_course
  JOIN major_requirement_blocks block ON block.id = option_course.major_block_id
  JOIN majors major ON major.id = block.major_id
  JOIN programs program ON program.id = major.program_id
  JOIN courses course ON course.id = option_course.course_id
  WHERE program.code = ? AND major.code = ? AND block.code = ?
  ORDER BY course.code
`).all("BCS", "AI", "OPTIONS");
assert(aiOptionPool.length === 7, "BCS AI option pool should store seven approved option courses.");
assert(
  aiOptionPool.some((course) => course.code === "COMP3340") && aiOptionPool.some((course) => course.code === "INFT3060"),
  "BCS AI option pool should include COMP3340 and INFT3060."
);
const bcsAiOptionOfferings = db.prepare(`
  SELECT c.code, o.term_code
  FROM program_course_offerings o
  JOIN programs p ON p.id = o.program_id
  JOIN courses c ON c.id = o.course_id
  WHERE p.code = 'BCS'
    AND c.code IN ('INFT2060', 'MATH2340', 'MECH2360', 'STAT2020', 'COMP3340', 'COMP3350', 'INFT3060')
  ORDER BY c.code, o.term_code
`).all();
assert(bcsAiOptionOfferings.length === 7, "BCS AI option courses should each have one seeded semester availability.");
assert(
  bcsAiOptionOfferings.some((row) => row.code === 'MATH2340' && row.term_code === 'S1') &&
  bcsAiOptionOfferings.some((row) => row.code === 'MECH2360' && row.term_code === 'S1') &&
  bcsAiOptionOfferings.some((row) => row.code === 'STAT2020' && row.term_code === 'S2') &&
  bcsAiOptionOfferings.some((row) => row.code === 'COMP3340' && row.term_code === 'S2') &&
  bcsAiOptionOfferings.some((row) => row.code === 'COMP3350' && row.term_code === 'S1') &&
  bcsAiOptionOfferings.some((row) => row.code === 'INFT2060' && row.term_code === 'S2') &&
  bcsAiOptionOfferings.some((row) => row.code === 'INFT3060' && row.term_code === 'S2'),
  "BCS AI option course semester availability should match the handbook document."
);
const aiOptionSlot1 = courseRepository.getCourseByCode("AIOPT-01");
const aiOptionSlot2 = courseRepository.getCourseByCode("AIOPT-02");
const comp3340 = courseRepository.getCourseByCode("COMP3340");
assert(aiOptionSlot1 && aiOptionSlot2 && comp3340, "BCS AI option slot courses and COMP3340 must exist.");

majorOptionService.updateStudentMajorOptionSelection(bcsAiStudent.id, {
  slotCourseId: aiOptionSlot1.id,
  selectedCourseId: comp3340.id
});

const bcsAiProgressAfterOptionSelection = progressService.getStudentProgress(bcsAiStudent.id);
assert(
  bcsAiProgressAfterOptionSelection.requiredCourses.some(
    (course) => course.code === "COMP3340" && course.majorOptionSlot && course.optionSlotCode === "AIOPT-01"
  ),
  "Selecting COMP3340 for AIOPT-01 should replace the placeholder with COMP3340 in progress."
);
const remainingAiOptionSlot = bcsAiProgressAfterOptionSelection.requiredCourses.find(
  (course) => course.majorOptionSlot && course.optionSlotCode === "AIOPT-02"
);
assert(
  remainingAiOptionSlot && !(remainingAiOptionSlot.optionChoices || []).some((course) => course.code === "COMP3340"),
  "Once COMP3340 is selected in the first AI option slot, it must be removed from the second slot's dropdown choices."
);

const bcsAiSelectedOptionPlan = studyPlanService.generateStudyPlan(bcsAiStudent.id, {
  startTerm: "S1",
  startYear: 2026,
  maxCoursesPerTerm: 4
});
assert(
  bcsAiSelectedOptionPlan.terms.some((term) => term.recommendedCourses.some((item) => item.course.code === "COMP3340")),
  "The generated BCS AI study plan should use the selected approved option course instead of the placeholder slot."
);
assert(
  !bcsAiSelectedOptionPlan.terms.some((term) => term.recommendedCourses.some((item) => item.course.code === "AIOPT-01")),
  "The generated BCS AI study plan should no longer contain the AIOPT-01 placeholder after a real option course is selected."
);

const globalSeng2130AssumedKnowledgeCourses = db.prepare(`
  SELECT required_course.code
  FROM course_rule_groups group_row
  JOIN courses target ON target.id = group_row.course_id
  JOIN course_rule_items item ON item.group_id = group_row.id
  JOIN courses required_course ON required_course.id = item.required_course_id
  WHERE target.code = ?
    AND group_row.program_id IS NULL
    AND group_row.rule_category = 'assumed_knowledge'
  ORDER BY required_course.code
`).all("SENG2130");
assert(globalSeng2130AssumedKnowledgeCourses.length === 2, "Global SENG2130 logic should still expose exactly two structured assumed-knowledge options.");
assert(
  globalSeng2130AssumedKnowledgeCourses.every((course) => ["INFT1004", "SENG1110"].includes(course.code)),
  "Global SENG2130 logic should only depend on INFT1004 or SENG1110."
);

const bitSeng2130AssumedKnowledgeCourses = db.prepare(`
  SELECT group_row.group_order, required_course.code
  FROM course_rule_groups group_row
  JOIN programs program ON program.id = group_row.program_id
  JOIN courses target ON target.id = group_row.course_id
  JOIN course_rule_items item ON item.group_id = group_row.id
  JOIN courses required_course ON required_course.id = item.required_course_id
  WHERE target.code = ?
    AND program.code = 'BIT'
    AND group_row.rule_category = 'assumed_knowledge'
  ORDER BY group_row.group_order, required_course.code
`).all("SENG2130");
assert(bitSeng2130AssumedKnowledgeCourses.length === 3, "BIT-specific SENG2130 logic should include SENG1050 plus two programming options.");
assert(
  bitSeng2130AssumedKnowledgeCourses.some((course) => course.group_order === 1 && course.code === "SENG1050"),
  "BIT-specific SENG2130 logic should require SENG1050 in the first group."
);
assert(
  bitSeng2130AssumedKnowledgeCourses.filter((course) => course.group_order === 2).every((course) => ["INFT1004", "SENG1110"].includes(course.code)),
  "BIT-specific SENG2130 second group should allow INFT1004 or SENG1110."
);

const globalSeng1120AssumedKnowledgeCourses = db.prepare(`
  SELECT required_course.code
  FROM course_rule_groups group_row
  JOIN courses target ON target.id = group_row.course_id
  JOIN course_rule_items item ON item.group_id = group_row.id
  JOIN courses required_course ON required_course.id = item.required_course_id
  WHERE target.code = ?
    AND group_row.program_id IS NULL
    AND group_row.rule_category = 'assumed_knowledge'
  ORDER BY required_course.code
`).all("SENG1120");
assert(globalSeng1120AssumedKnowledgeCourses.length === 2, "SENG1120 should have two global structured assumed-knowledge options.");
assert(
  globalSeng1120AssumedKnowledgeCourses.every((course) => ["INFT1004", "SENG1110"].includes(course.code)),
  "SENG1120 should depend on INFT1004 or SENG1110."
);

const comp3330RuleGroups = db.prepare(`
  SELECT logic_type, group_order
  FROM course_rule_groups group_row
  JOIN courses target ON target.id = group_row.course_id
  WHERE target.code = ?
    AND group_row.program_id IS NULL
    AND group_row.rule_category = 'assumed_knowledge'
  ORDER BY group_order
`).all("COMP3330");
assert(comp3330RuleGroups.length === 2, "COMP3330 should have two assumed-knowledge groups.");
assert(
  comp3330RuleGroups[0].logic_type === "all_of" && comp3330RuleGroups[0].group_order === 1,
  "COMP3330 first assumed-knowledge group should require MATH1110."
);
assert(
  comp3330RuleGroups[1].logic_type === "any_of" && comp3330RuleGroups[1].group_order === 2,
  "COMP3330 second assumed-knowledge group should allow INFT1004 or SENG1110."
);

const bitComp1010Offerings = db.prepare(`
  SELECT term_code
  FROM program_course_offerings offering
  JOIN programs program ON program.id = offering.program_id
  JOIN courses course ON course.id = offering.course_id
  WHERE program.code = 'BIT' AND course.code = 'COMP1010'
  ORDER BY term_code
`).all();
assert(bitComp1010Offerings.length === 2, "BIT COMP1010 should be offered in both Semester 1 and Semester 2.");

const bcsComp1010Offerings = db.prepare(`
  SELECT term_code
  FROM program_course_offerings offering
  JOIN programs program ON program.id = offering.program_id
  JOIN courses course ON course.id = offering.course_id
  WHERE program.code = 'BCS' AND course.code = 'COMP1010'
  ORDER BY term_code
`).all();
assert(bcsComp1010Offerings.length === 1 && bcsComp1010Offerings[0].term_code === "S1", "BCS COMP1010 should only be offered in Semester 1.");

const bcsEligibleCourses = studyPlanService.generateEligibleCourses(bcsAiStudent.id);
assert(
  bcsEligibleCourses.blockedCourses.some((item) => item.course.code === "COMP2230"),
  "COMP2230 should be blocked in planning until SENG1120 and MATH1510 are complete."
);
assert(
  bcsEligibleCourses.blockedCourses.some((item) => item.course.code === "COMP2240"),
  "COMP2240 should be blocked in planning until SENG1120 is complete."
);
assert(
  bcsEligibleCourses.blockedCourses.some((item) => item.course.code === "COMP2270"),
  "COMP2270 should be blocked in planning until MATH1510 and SENG1120 are complete."
);
assert(
  bcsEligibleCourses.blockedCourses.some((item) => item.course.code === "COMP3330"),
  "COMP3330 should be blocked in planning until MATH1110 and a programming course are complete."
);
assert(
  bcsEligibleCourses.blockedCourses.some((item) => item.course.code === "SENG4500"),
  "SENG4500 should be blocked in planning until COMP2240 or COMP6240 is complete."
);
assert(
  bcsEligibleCourses.blockedCourses.some((item) => item.course.code === "SENG1120"),
  "SENG1120 should be blocked in planning until a programming course is complete."
);

const bcsEligibleCoursesSemester2 = studyPlanService.generateEligibleCourses(bcsAiStudent.id, "S2");
assert(
  bcsEligibleCoursesSemester2.blockedCourses.some(
    (item) => item.course.code === "COMP1010" && item.blockingReasons.some((reason) => reason.includes("Semester 2"))
  ),
  "BCS COMP1010 should be blocked in Semester 2 because it is only offered in Semester 1."
);

const bitEligibleCoursesSemester2 = studyPlanService.generateEligibleCourses(midProgramStudent.id, "S2");
assert(
  bitEligibleCoursesSemester2.blockedCourses.some(
    (item) => item.course.code === "INFT1060" && item.blockingReasons.some((reason) => reason.includes("Semester 2"))
  ),
  "BIT INFT1060 should be blocked in Semester 2 because it is only offered in Semester 1."
);

const exclusionProgress = progressService.getStudentProgress(exclusionStudent.id);
assert(
  exclusionProgress.summary.electivesCompletedUnits === 0,
  "External reference courses must not count toward the four elective slots."
);

const comp1010 = courseRepository.getCourseByCode("COMP1010");
const comp3851a = courseRepository.getCourseByCode("COMP3851A");

const exclusionEligibility = ruleEngineService.evaluateCourseEligibility(exclusionStudent.id, comp1010.id);
assert(!exclusionEligibility.eligible, "COMP1010 should be blocked for the exclusion-case student.");
assert(
  exclusionEligibility.hardBlocks.some((block) => block.category === "exclusion"),
  "COMP1010 should report an exclusion block."
);

const workIntegratedLearningEligibility = ruleEngineService.evaluateCourseEligibility(
  midProgramStudent.id,
  comp3851a.id
);
assert(
  !workIntegratedLearningEligibility.eligible,
  "COMP3851A should be blocked until 140 passed units are reached."
);
assert(
  workIntegratedLearningEligibility.hardBlocks.some((block) => block.message.includes("140 units")),
  "COMP3851A should report the 140-unit prerequisite as a hard block."
);

const eligibleCourses = studyPlanService.generateEligibleCourses(midProgramStudent.id);
assert(eligibleCourses.eligibleCourses.length > 0, "Mid-program student should have eligible required courses.");
assert(
  eligibleCourses.blockedCourses.some((item) => item.course.code === "INFT2060"),
  "INFT2060 should stay blocked in planning until INFT1004 or SENG1110 is complete."
);
assert(
  eligibleCourses.blockedCourses.some((item) => item.course.code === "SENG2130"),
  "SENG2130 should stay blocked in planning until its assumed-knowledge courses are complete."
);

const studyPlan = studyPlanService.generateStudyPlan(midProgramStudent.id, {
  startTerm: "S1",
  startYear: 2026,
  maxCoursesPerTerm: 4
});
assert(studyPlan.terms.length > 0, "Study plan should generate at least one term.");
assert(
  studyPlan.terms[0].recommendedCourses.some((item) => item.course.code === "SENG1110"),
  "SENG1110 should appear in the first term because it unlocks later study."
);
assert(
  studyPlan.terms[0].recommendedCourses.some((item) => item.course.code === "INFT1004"),
  "INFT1004 should appear in the first term because it unlocks later study."
);
assert(
  !studyPlan.terms[0].recommendedCourses.some((item) => ["COMP3851A", "COMP3851B"].includes(item.course.code)),
  "COMP3851A and COMP3851B must not appear in the first term for a 30-unit student."
);
assert(
  !studyPlan.terms[0].recommendedCourses.some((item) => ["INFT2060", "INFT2150", "SENG2130"].includes(item.course.code)),
  "Courses with unmet structured enrolment requirements must not appear in the first term."
);
assert(
  studyPlan.terms.some((term) => term.recommendedCourses.some((item) => item.course.code === "ELEC-01")),
  "The study plan should include elective slots when they are needed to fill term load."
);

const partTimePlan = studyPlanService.generateStudyPlan(midProgramStudent.id, {
  startTerm: "S1",
  startYear: 2026,
  maxCoursesPerTerm: 2
});
assert(
  partTimePlan.terms.every((term) => term.recommendedCourses.length <= 2),
  "Part-time study plans must not recommend more than two courses in a term."
);

const savedStudyPlan = studyPlanService.saveStudyPlan(midProgramStudent.id, {
  startTerm: studyPlan.startTerm,
  startYear: studyPlan.startYear,
  maxCoursesPerTerm: studyPlan.maxCoursesPerTerm,
  terms: studyPlan.terms.map((term) => ({
    termCode: term.termCode,
    year: term.year,
    courseIds: term.recommendedCourses.map((item) => item.course.id)
  }))
});
assert(savedStudyPlan?.terms.length === studyPlan.terms.length, "A valid generated study plan should save successfully.");
assert(
  savedStudyPlan.terms[0].recommendedCourses.length === studyPlan.terms[0].recommendedCourses.length,
  "Saved study plan terms should preserve the generated course allocations."
);

let invalidPlanRejected = false;
try {
  const invalidTerms = studyPlan.terms.map((term) => ({
    termCode: term.termCode,
    year: term.year,
    courseIds: term.recommendedCourses.map((item) => item.course.id)
  }));
  const firstTerm = invalidTerms[0];
  const secondTerm = invalidTerms[1];
  const seng1110Index = firstTerm.courseIds.findIndex((courseId) => {
    const course = studyPlan.terms[0].recommendedCourses.find((item) => item.course.id === courseId);
    return course?.course.code === "SENG1110";
  });
  const inft2150Index = secondTerm.courseIds.findIndex((courseId) => {
    const course = studyPlan.terms[1].recommendedCourses.find((item) => item.course.id === courseId);
    return course?.course.code === "INFT2150";
  });

  const [seng1110Id] = firstTerm.courseIds.splice(seng1110Index, 1);
  const [inft2150Id] = secondTerm.courseIds.splice(inft2150Index, 1);
  firstTerm.courseIds.push(inft2150Id);
  secondTerm.courseIds.push(seng1110Id);

  studyPlanService.saveStudyPlan(midProgramStudent.id, {
    startTerm: studyPlan.startTerm,
    startYear: studyPlan.startYear,
    maxCoursesPerTerm: studyPlan.maxCoursesPerTerm,
    terms: invalidTerms
  });
} catch (error) {
  invalidPlanRejected = Boolean(error?.details?.some((detail) => detail.includes("INFT2150")));
}
assert(invalidPlanRejected, "An invalid manually rearranged study plan should be rejected with validation details.");

const dragValidationTerms = studyPlan.terms.map((term) => ({
  termCode: term.termCode,
  year: term.year,
  courseIds: term.recommendedCourses.map((item) => item.course.id)
}));
const dragFirstTerm = dragValidationTerms[0];
const dragSecondTerm = dragValidationTerms[1];
const dragSeng1110Index = dragFirstTerm.courseIds.findIndex((courseId) => {
  const course = studyPlan.terms[0].recommendedCourses.find((item) => item.course.id === courseId);
  return course?.course.code === "SENG1110";
});
const dragInft2150Index = dragSecondTerm.courseIds.findIndex((courseId) => {
  const course = studyPlan.terms[1].recommendedCourses.find((item) => item.course.id === courseId);
  return course?.course.code === "INFT2150";
});
const [dragSeng1110Id] = dragFirstTerm.courseIds.splice(dragSeng1110Index, 1);
const [dragInft2150Id] = dragSecondTerm.courseIds.splice(dragInft2150Index, 1);
dragFirstTerm.courseIds.push(dragInft2150Id);
dragSecondTerm.courseIds.push(dragSeng1110Id);

let invalidDragRejected = false;
try {
  studyPlanService.validateStudyPlan(
    midProgramStudent.id,
    {
      startTerm: studyPlan.startTerm,
      startYear: studyPlan.startYear,
      maxCoursesPerTerm: studyPlan.maxCoursesPerTerm,
      terms: dragValidationTerms
    },
    { scope: "drag" }
  );
} catch (error) {
  invalidDragRejected = Boolean(error?.details?.some((detail) => detail.includes("INFT2150")));
}
assert(
  invalidDragRejected,
  "Drag validation should reject moves that break assumed-knowledge sequencing immediately."
);

studyPlanService.validateStudyPlan(
  midProgramStudent.id,
  {
    startTerm: studyPlan.startTerm,
    startYear: studyPlan.startYear,
    maxCoursesPerTerm: 3,
    terms: studyPlan.terms.map((term) => ({
      termCode: term.termCode,
      year: term.year,
      courseIds: term.recommendedCourses.map((item) => item.course.id)
    }))
  },
  { scope: "drag" }
);

let overloadedSaveRejected = false;
try {
  studyPlanService.saveStudyPlan(midProgramStudent.id, {
    startTerm: studyPlan.startTerm,
    startYear: studyPlan.startYear,
    maxCoursesPerTerm: 3,
    terms: studyPlan.terms.map((term) => ({
      termCode: term.termCode,
      year: term.year,
      courseIds: term.recommendedCourses.map((item) => item.course.id)
    }))
  });
} catch (error) {
  overloadedSaveRejected = Boolean(error?.details?.some((detail) => detail.includes("exceeds the selected study load")));
}
assert(
  overloadedSaveRejected,
  "Save validation should still reject semesters that exceed the selected study load."
);

const bcsStudyPlan = studyPlanService.generateStudyPlan(bcsAiStudent.id, {
  startTerm: "S1",
  startYear: 2026,
  maxCoursesPerTerm: 4
});
const bcsAvailabilityTerms = bcsStudyPlan.terms.map((term) => ({
  termCode: term.termCode,
  year: term.year,
  courseIds: term.recommendedCourses.map((item) => item.course.id)
}));
const bcsFirstTerm = bcsAvailabilityTerms[0];
const bcsSecondTerm = bcsAvailabilityTerms[1];
assert(bcsFirstTerm && bcsSecondTerm, "BCS study plan should generate at least two semesters for availability validation.");

const comp1010Id = bcsFirstTerm.courseIds.find((courseId) => {
  const course = bcsStudyPlan.terms[0].recommendedCourses.find((item) => item.course.id === courseId);
  return course?.course.code === "COMP1010";
});
assert(comp1010Id, "BCS Semester 1 plan should include COMP1010 for the availability validation case.");

bcsFirstTerm.courseIds = bcsFirstTerm.courseIds.filter((courseId) => courseId !== comp1010Id);
bcsSecondTerm.courseIds.push(comp1010Id);

let invalidAvailabilityDragRejected = false;
try {
  studyPlanService.validateStudyPlan(
    bcsAiStudent.id,
    {
      startTerm: bcsStudyPlan.startTerm,
      startYear: bcsStudyPlan.startYear,
      maxCoursesPerTerm: bcsStudyPlan.maxCoursesPerTerm,
      terms: bcsAvailabilityTerms
    },
    { scope: "drag" }
  );
} catch (error) {
  invalidAvailabilityDragRejected = Boolean(
    error?.details?.some((detail) => detail.includes("COMP1010") && detail.includes("Semester 2"))
  );
}
assert(
  invalidAvailabilityDragRejected,
  "Drag validation should reject moves into semesters where the course is not offered."
);

assert(
  studyPlan.terms.some((term) => term.recommendedCourses.some((item) => item.course.code === "COMP3851A")),
  "Mid-program BIT plan should place COMP3851A in a later semester for drag validation."
);

const comp3851aDragTerms = studyPlan.terms.map((term) => ({
  termCode: term.termCode,
  year: term.year,
  courseIds: term.recommendedCourses.map((item) => item.course.id)
}));
const comp3851aCurrentTermIndex = studyPlan.terms.findIndex((term) =>
  term.recommendedCourses.some((item) => item.course.code === "COMP3851A")
);
const comp3851aCurrentCourseIndex = comp3851aDragTerms[comp3851aCurrentTermIndex].courseIds.findIndex((courseId) => {
  const course = studyPlan.terms[comp3851aCurrentTermIndex].recommendedCourses.find((item) => item.course.id === courseId);
  return course?.course.code === "COMP3851A";
});
const [dragComp3851aId] = comp3851aDragTerms[comp3851aCurrentTermIndex].courseIds.splice(comp3851aCurrentCourseIndex, 1);
comp3851aDragTerms[0].courseIds.push(dragComp3851aId);

let invalidWorkIntegratedLearningDragRejected = false;
try {
  studyPlanService.validateStudyPlan(
    midProgramStudent.id,
    {
      startTerm: studyPlan.startTerm,
      startYear: studyPlan.startYear,
      maxCoursesPerTerm: studyPlan.maxCoursesPerTerm,
      terms: comp3851aDragTerms
    },
    { scope: "drag" }
  );
} catch (error) {
  invalidWorkIntegratedLearningDragRejected = Boolean(
    error?.details?.some((detail) => detail.includes("COMP3851A") && detail.includes("140 units"))
  );
}
assert(
  invalidWorkIntegratedLearningDragRejected,
  "Drag validation should reject moving COMP3851A before the required 140 passed units are completed."
);

const bcsStudyPlanSemester2Start = studyPlanService.generateStudyPlan(bcsAiStudent.id, {
  startTerm: "S2",
  startYear: 2026,
  maxCoursesPerTerm: 4
});
assert(
  !bcsStudyPlanSemester2Start.terms[0].recommendedCourses.some((item) => item.course.code === "COMP1010"),
  "BCS COMP1010 must not be recommended in a Semester 2 start term because it is unavailable then."
);

console.log("Academic logic verification passed.");
db.close();
fs.unlinkSync(tempDbPath);



