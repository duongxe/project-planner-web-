import { AppError } from "../utils/appError.js";

function sumUnits(courses) {
  return courses.reduce((total, course) => total + course.units, 0);
}

function sortCourses(courses) {
  return [...courses].sort((left, right) => (left.level - right.level) || left.code.localeCompare(right.code));
}

function isElectiveSlotCourse(course) {
  return String(course?.code ?? "").startsWith("ELEC-");
}

export class ProgressService {
  constructor({ ruleEngineService, courseRepository }) {
    this.ruleEngineService = ruleEngineService;
    this.courseRepository = courseRepository;
  }

  calculateEarnedUnits(studentId, existingContext = null) {
    const context = existingContext ?? this.ruleEngineService.buildStudentAcademicContext(studentId);
    return context.passedUnits;
  }

  calculateProgramBlockProgress(studentId, blockId, existingContext = null) {
    const context = existingContext ?? this.ruleEngineService.buildStudentAcademicContext(studentId);
    const block = context.requirements.programBlocks.find((candidate) => candidate.id === blockId);

    if (!block) {
      throw new AppError(404, "Program requirement block not found.");
    }

    if (block.code === "ELECTIVES") {
      const electives = this.calculateElectiveProgress(context);
      return {
        id: block.id,
        code: block.code,
        name: block.name,
        requiredUnits: block.requiredUnits,
        completedUnits: electives.completedUnits,
        remainingUnits: electives.remainingUnits,
        completedCourses: [],
        remainingCourses: []
      };
    }

    return this.buildBlockProgress(block, context.passedCourseIds);
  }

  calculateMajorBlockProgress(studentId, blockId, existingContext = null) {
    const context = existingContext ?? this.ruleEngineService.buildStudentAcademicContext(studentId);
    const block = context.requirements.majorBlocks.find((candidate) => candidate.id === blockId);

    if (!block) {
      throw new AppError(404, "Major requirement block not found.");
    }

    return this.buildBlockProgress(block, context.passedCourseIds);
  }

  calculateLevelDistribution(studentId, existingContext = null) {
    const context = existingContext ?? this.ruleEngineService.buildStudentAcademicContext(studentId);
    const distribution = new Map();

    for (const course of context.passedCourses) {
      if (isElectiveSlotCourse(course)) {
        continue;
      }

      distribution.set(course.level, (distribution.get(course.level) ?? 0) + course.units);
    }

    return [...distribution.entries()]
      .map(([level, units]) => ({ level, units }))
      .sort((left, right) => left.level - right.level);
  }

  validateLevelRules(studentId, existingContext = null) {
    const context = existingContext ?? this.ruleEngineService.buildStudentAcademicContext(studentId);
    const distributionMap = new Map(
      this.calculateLevelDistribution(studentId, context).map((entry) => [entry.level, entry.units])
    );

    return context.requirements.programLevelRules.map((rule) => {
      const completedUnits = distributionMap.get(rule.level) ?? 0;
      const satisfied =
        rule.ruleOperator === "min" ? completedUnits >= rule.units : completedUnits <= rule.units;

      return {
        id: rule.id,
        level: rule.level,
        ruleOperator: rule.ruleOperator,
        requiredUnits: rule.units,
        completedUnits,
        satisfied,
        unitsRemaining:
          rule.ruleOperator === "min" ? Math.max(0, rule.units - completedUnits) : Math.max(0, rule.units - completedUnits),
        unitsExceeded: rule.ruleOperator === "max" ? Math.max(0, completedUnits - rule.units) : 0
      };
    });
  }

  getStudentProgress(studentId) {
    const context = this.ruleEngineService.buildStudentAcademicContext(studentId);
    const requiredCourseIds = new Set(context.requirements.distinctCourses.map((course) => course.id));
    const electiveSlots = this.buildElectiveSlots(context);
    const electiveSlotIds = new Set(electiveSlots.map((course) => course.id));
    const earnedUnits = this.calculateEarnedUnits(studentId, context);

    // Shared courses can complete both block views, but earned units remain based on unique passed courses.
    const requiredCoursesPassed = context.requirements.distinctCourses.filter((course) =>
      context.passedCourseIds.has(course.id)
    );
    const requiredDistinctUnitsCompleted = sumUnits(requiredCoursesPassed);
    const electiveProgress = this.calculateElectiveProgress(context, electiveSlots);

    const programBlocks = context.requirements.programBlocks.map((block) => {
      if (block.code === "ELECTIVES") {
        return {
          id: block.id,
          code: block.code,
          name: block.name,
          requiredUnits: block.requiredUnits,
          completedUnits: electiveProgress.completedUnits,
          remainingUnits: electiveProgress.remainingUnits,
          completedCourses: [],
          remainingCourses: []
        };
      }

      return this.buildBlockProgress(block, context.passedCourseIds);
    });

    const majorBlocks = context.requirements.majorBlocks.map((block) =>
      this.buildBlockProgress(block, context.passedCourseIds)
    );

    const requiredCourses = sortCourses(
      context.requirements.distinctCourses.map((course) => ({
        ...course,
        record: context.recordByCourseId.get(course.id) ?? null,
        isPassed: context.passedCourseIds.has(course.id)
      }))
    );

    const additionalRecords = context.records
      .filter((record) => !requiredCourseIds.has(record.courseId) && !electiveSlotIds.has(record.courseId))
      .map((record) => ({
        ...record,
        sharedWithCore: false
      }));

    return {
      student: {
        id: context.student.id,
        studentNumber: context.student.student_number,
        name: context.student.name,
        program: {
          id: context.student.selected_program_id,
          code: context.student.program_code,
          name: context.student.program_name,
          totalUnits: context.requirements.program.totalUnits
        },
        major: {
          id: context.student.selected_major_id,
          code: context.student.major_code,
          name: context.student.major_name,
          totalUnits: context.requirements.major.totalUnits
        }
      },
      summary: {
        earnedUnits,
        remainingUnits: Math.max(0, context.requirements.program.totalUnits - earnedUnits),
        requiredDistinctUnitsCompleted,
        requiredDistinctUnitsTotal: context.requirements.distinctRequirementUnits,
        electivesCompletedUnits: electiveProgress.completedUnits,
        electivesRemainingUnits: electiveProgress.remainingUnits,
        sharedCourseCount: context.requirements.sharedCourseIds.length
      },
      programBlocks,
      majorBlocks,
      levelDistribution: this.calculateLevelDistribution(studentId, context),
      levelRules: this.validateLevelRules(studentId, context),
      requiredCourses,
      electiveSlots,
      additionalRecords
    };
  }

  calculateElectiveProgress(context, existingElectiveSlots = null) {
    const electiveBlock = context.requirements.programBlocks.find((block) => block.code === "ELECTIVES");
    const electiveSlots = existingElectiveSlots ?? this.buildElectiveSlots(context);
    const completedUnits = Math.min(
      electiveBlock?.requiredUnits ?? 0,
      sumUnits(electiveSlots.filter((course) => course.isPassed))
    );

    return {
      requiredUnits: electiveBlock?.requiredUnits ?? 0,
      completedUnits,
      remainingUnits: Math.max(0, (electiveBlock?.requiredUnits ?? 0) - completedUnits)
    };
  }

  buildElectiveSlots(context) {
    const electiveBlock = context.requirements.programBlocks.find((block) => block.code === "ELECTIVES");
    const requiredUnits = electiveBlock?.requiredUnits ?? 0;
    let accumulatedUnits = 0;

    return this.courseRepository.listElectiveSlotCourses()
      .filter((course) => {
        if (accumulatedUnits >= requiredUnits) {
          return false;
        }

        accumulatedUnits += course.units;
        return true;
      })
      .map((course) => ({
        ...course,
        electiveSlot: true,
        inProgramBlocks: [],
        inMajorBlocks: [],
        sharedWithCore: false,
        record: context.recordByCourseId.get(course.id) ?? null,
        isPassed: context.passedCourseIds.has(course.id)
      }));
  }

  buildBlockProgress(block, passedCourseIds) {
    const completedCourses = sortCourses(block.courses.filter((course) => passedCourseIds.has(course.id)));
    const remainingCourses = sortCourses(block.courses.filter((course) => !passedCourseIds.has(course.id)));
    const completedUnits = sumUnits(completedCourses);

    return {
      id: block.id,
      code: block.code,
      name: block.name,
      requiredUnits: block.requiredUnits,
      completedUnits,
      remainingUnits: Math.max(0, block.requiredUnits - completedUnits),
      completedCourses,
      remainingCourses
    };
  }
}

