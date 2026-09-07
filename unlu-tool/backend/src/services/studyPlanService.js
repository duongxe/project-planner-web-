import { AppError, assertFound } from "../utils/appError.js";

const TERM_SEQUENCE = {
  S1: 1,
  S2: 2
};

const MAX_GENERATION_TERM_STEPS = 80;
const MAX_STAGNANT_STEPS = 6;

function normalizeSentence(text) {
  if (!text) {
    return "";
  }

  return String(text).trim().replace(/\.$/, "");
}

function formatStudyTermLabel(termCode, year) {
  return `${termCode === "S1" ? "Semester 1" : "Semester 2"} ${year}`;
}

function nextTerm(termCode, year) {
  return termCode === "S1"
    ? { termCode: "S2", year }
    : { termCode: "S1", year: year + 1 };
}

function compareTerms(left, right) {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  return (TERM_SEQUENCE[left.termCode] ?? 0) - (TERM_SEQUENCE[right.termCode] ?? 0);
}

function buildTermKey(termCode, year) {
  return `${year}-${termCode}`;
}

function isStructuredRuleGroup(group) {
  return Boolean(group?.itemResults?.some((item) => item.itemType !== "free_text"));
}

function toSortedUnique(array) {
  return [...new Set(array)].sort((left, right) => left.localeCompare(right));
}

function cloneCourseSnapshot(course) {
  if (!course) {
    return null;
  }

  return {
    id: course.id,
    code: course.code,
    name: course.name,
    units: course.units,
    level: course.level,
    electiveSlot: Boolean(course.electiveSlot),
    majorOptionSlot: Boolean(course.majorOptionSlot),
    optionSlotCourseId: course.optionSlotCourseId ?? null,
    optionSlotCode: course.optionSlotCode ?? null,
    optionSlotName: course.optionSlotName ?? null,
    selectedOptionCourseId: course.selectedOptionCourseId ?? null,
    selectedOptionCourse: course.selectedOptionCourse ? cloneCourseSnapshot(course.selectedOptionCourse) : null,
    sharedWithCore: Boolean(course.sharedWithCore),
    hasOfferingData: Boolean(course.hasOfferingData),
    offeredTerms: Array.isArray(course.offeredTerms) ? [...course.offeredTerms] : [],
    inProgramBlocks: Array.isArray(course.inProgramBlocks)
      ? course.inProgramBlocks.map((block) => ({ ...block }))
      : [],
    inMajorBlocks: Array.isArray(course.inMajorBlocks)
      ? course.inMajorBlocks.map((block) => ({ ...block }))
      : []
  };
}

function buildCourseSummary(course) {
  return `${course.code} ${course.name}`;
}

function flattenCourseIds(terms) {
  const ids = [];
  for (const term of terms) {
    ids.push(...term.courseIds);
  }
  return ids;
}

export class StudyPlanService {
  constructor({ ruleEngineService, progressService, studyPlanRepository }) {
    this.ruleEngineService = ruleEngineService;
    this.progressService = progressService;
    this.studyPlanRepository = studyPlanRepository;
  }

  getProgramRequirements(programId, majorId) {
    return this.ruleEngineService.catalogService.getProgramRequirements(programId, majorId);
  }

  buildPlanningCatalog(studentId) {
    const context = this.ruleEngineService.buildStudentAcademicContext(studentId);
    const progress = this.progressService.getStudentProgress(studentId);
    const allCourses = [...progress.requiredCourses, ...progress.electiveSlots];
    const allCourseMap = new Map();
    const remainingCourseMap = new Map();

    for (const course of allCourses) {
      const snapshot = cloneCourseSnapshot(course);
      allCourseMap.set(snapshot.id, snapshot);

      if (!course.isPassed) {
        remainingCourseMap.set(snapshot.id, snapshot);
      }
    }

    return {
      context,
      progress,
      allCourseMap,
      remainingCourseMap
    };
  }

  buildUnlockScoreMap(remainingCourses, context) {
    const remainingIds = new Set(remainingCourses.map((course) => course.id));
    const unlockScores = new Map();

    for (const course of remainingCourses) {
      unlockScores.set(course.id, 0);
    }

    for (const course of remainingCourses) {
      const groupedRules = context.groupsByCourseId.get(course.id) ?? {
        prerequisite: [],
        assumed_knowledge: [],
        exclusion: []
      };

      const relevantGroups = [...groupedRules.prerequisite, ...groupedRules.assumed_knowledge];

      for (const group of relevantGroups) {
        for (const item of group.items || []) {
          if (item.itemType !== "course" || !remainingIds.has(item.requiredCourseId)) {
            continue;
          }

          unlockScores.set(
            item.requiredCourseId,
            (unlockScores.get(item.requiredCourseId) ?? 0) + 1
          );
        }
      }
    }

    return unlockScores;
  }

  evaluateCourseForPlanning({
    course,
    context,
    passedCourseIds,
    passedUnits,
    termCode = null,
    enforceStructuredAssumedKnowledge = true
  }) {
    if (course.electiveSlot) {
      return {
        course,
        eligible: true,
        blockingReasons: [],
        warnings: []
      };
    }

    const evaluation = this.ruleEngineService.evaluateCourseEligibilityFromContext(
      course.id,
      {
        ...context,
        passedCourseIds,
        passedUnits
      },
      {
        termCode
      }
    );

    const blockingReasons = evaluation.hardBlocks.map((block) => block.message);
    const structuredAssumedFailures = evaluation.assumedKnowledgeGroups.filter(
      (group) => !group.satisfied && isStructuredRuleGroup(group)
    );

    if (enforceStructuredAssumedKnowledge) {
      for (const group of structuredAssumedFailures) {
        blockingReasons.push(
          `Planned later until enrolment requirement is met: ${normalizeSentence(group.expectation)}.`
        );
      }
    }

    const blockedAssumedGroupIds = new Set(structuredAssumedFailures.map((group) => group.id));
    const warnings = evaluation.warnings
      .filter((warning) => !blockedAssumedGroupIds.has(warning.group?.id))
      .map((warning) => warning.message);

    return {
      course,
      eligible: blockingReasons.length === 0,
      blockingReasons,
      warnings,
      sourceEvaluation: evaluation
    };
  }

  comparePlanningCandidates(left, right) {
    const leftElective = Boolean(left.course.electiveSlot);
    const rightElective = Boolean(right.course.electiveSlot);

    if (leftElective !== rightElective) {
      return leftElective ? 1 : -1;
    }

    if (left.course.level !== right.course.level) {
      return left.course.level - right.course.level;
    }

    if (left.unlockScore !== right.unlockScore) {
      return right.unlockScore - left.unlockScore;
    }

    return left.course.code.localeCompare(right.course.code);
  }

  generateEligibleCourses(studentId, termCode = null) {
    const catalog = this.buildPlanningCatalog(studentId);
    const remainingCourses = [...catalog.remainingCourseMap.values()].sort(
      (left, right) => (left.level - right.level) || left.code.localeCompare(right.code)
    );

    const eligibleCourses = [];
    const blockedCourses = [];

    for (const course of remainingCourses) {
      const evaluation = this.evaluateCourseForPlanning({
        course,
        context: catalog.context,
        passedCourseIds: catalog.context.passedCourseIds,
        passedUnits: catalog.context.passedUnits,
        termCode,
        enforceStructuredAssumedKnowledge: true
      });

      if (evaluation.eligible) {
        eligibleCourses.push({
          course: cloneCourseSnapshot(course),
          warnings: [...evaluation.warnings]
        });
        continue;
      }

      blockedCourses.push({
        course: cloneCourseSnapshot(course),
        blockingReasons: [...evaluation.blockingReasons],
        warnings: [...evaluation.warnings]
      });
    }

    return {
      termCode: termCode ?? null,
      eligibleCourses,
      blockedCourses
    };
  }

  generateStudyPlan(
    studentId,
    {
      startTerm = "S1",
      startYear = new Date().getFullYear(),
      maxCoursesPerTerm = 4
    } = {}
  ) {
    if (!["S1", "S2"].includes(startTerm)) {
      throw new AppError(400, "startTerm must be S1 or S2.");
    }

    if (!Number.isInteger(startYear) || startYear < 2000) {
      throw new AppError(400, "startYear must be a valid year.");
    }

    if (!Number.isInteger(maxCoursesPerTerm) || maxCoursesPerTerm < 1 || maxCoursesPerTerm > 6) {
      throw new AppError(400, "maxCoursesPerTerm must be between 1 and 6.");
    }

    const catalog = this.buildPlanningCatalog(studentId);
    const pendingCourses = new Map(catalog.remainingCourseMap);
    const terms = [];
    let termCursor = {
      termCode: startTerm,
      year: startYear
    };
    let passedCourseIds = new Set(catalog.context.passedCourseIds);
    let passedUnits = catalog.context.passedUnits;
    let stagnantSteps = 0;
    let generationSteps = 0;

    while (pendingCourses.size > 0 && generationSteps < MAX_GENERATION_TERM_STEPS) {
      generationSteps += 1;
      const remainingCourses = [...pendingCourses.values()];
      const unlockScoreMap = this.buildUnlockScoreMap(remainingCourses, catalog.context);
      const evaluations = remainingCourses.map((course) => {
        const result = this.evaluateCourseForPlanning({
          course,
          context: catalog.context,
          passedCourseIds,
          passedUnits,
          termCode: termCursor.termCode,
          enforceStructuredAssumedKnowledge: true
        });

        return {
          ...result,
          unlockScore: unlockScoreMap.get(course.id) ?? 0
        };
      });

      const eligible = evaluations
        .filter((entry) => entry.eligible)
        .sort((left, right) => this.comparePlanningCandidates(left, right));

      if (!eligible.length) {
        stagnantSteps += 1;
        if (stagnantSteps >= MAX_STAGNANT_STEPS) {
          break;
        }

        termCursor = nextTerm(termCursor.termCode, termCursor.year);
        continue;
      }

      stagnantSteps = 0;

      const selected = eligible.slice(0, maxCoursesPerTerm);
      const selectedIds = new Set(selected.map((entry) => entry.course.id));
      const blockedCourses = evaluations
        .filter((entry) => !selectedIds.has(entry.course.id))
        .filter((entry) => !entry.eligible)
        .map((entry) => ({
          course: cloneCourseSnapshot(entry.course),
          blockingReasons: [...entry.blockingReasons]
        }));

      terms.push({
        termCode: termCursor.termCode,
        year: termCursor.year,
        label: formatStudyTermLabel(termCursor.termCode, termCursor.year),
        recommendedCourses: selected.map((entry) => ({
          course: cloneCourseSnapshot(entry.course),
          warnings: [...entry.warnings]
        })),
        blockedCourses
      });

      for (const entry of selected) {
        pendingCourses.delete(entry.course.id);
      }

      // Courses completed in the planned term only unlock following terms.
      for (const entry of selected) {
        passedCourseIds.add(entry.course.id);
        passedUnits += entry.course.units;
      }

      termCursor = nextTerm(termCursor.termCode, termCursor.year);
    }

    const unresolvedCourses = [...pendingCourses.values()].map((course) => cloneCourseSnapshot(course));

    return {
      studentId,
      startTerm,
      startYear,
      maxCoursesPerTerm,
      terms,
      unresolvedCourses
    };
  }

  normalizePlanTerms(terms) {
    const normalized = terms.map((term) => ({
      termCode: term.termCode,
      year: term.year,
      courseIds: [...term.courseIds]
    }));

    normalized.sort(compareTerms);
    return normalized;
  }

  validatePlanStructure(payload) {
    const errors = [];
    const seenTermKeys = new Set();

    for (const term of payload.terms) {
      const key = buildTermKey(term.termCode, term.year);
      if (seenTermKeys.has(key)) {
        errors.push(`Duplicate semester detected: ${formatStudyTermLabel(term.termCode, term.year)}.`);
      }
      seenTermKeys.add(key);
    }

    const allCourseIds = flattenCourseIds(payload.terms);
    const seenCourseIds = new Set();
    const duplicateCodes = [];

    for (const courseId of allCourseIds) {
      if (seenCourseIds.has(courseId)) {
        duplicateCodes.push(courseId);
      }
      seenCourseIds.add(courseId);
    }

    if (duplicateCodes.length) {
      errors.push("A course appears more than once in the study plan.");
    }

    return {
      errors,
      allCourseIds
    };
  }

  validateStudyPlan(studentId, payload, { scope = "save" } = {}) {
    if (!["save", "drag"].includes(scope)) {
      throw new AppError(400, "scope must be save or drag.");
    }

    const catalog = this.buildPlanningCatalog(studentId);
    const remainingCourseMap = catalog.remainingCourseMap;
    const normalizedTerms = this.normalizePlanTerms(payload.terms);
    const structureResult = this.validatePlanStructure({
      ...payload,
      terms: normalizedTerms
    });
    const errors = [...structureResult.errors];

    const unknownCourses = structureResult.allCourseIds.filter((courseId) => !remainingCourseMap.has(courseId));
    if (unknownCourses.length) {
      const unknownCourseCodes = unknownCourses.map((courseId) => `#${courseId}`);
      errors.push(`The study plan includes course(s) that are not currently plannable: ${toSortedUnique(unknownCourseCodes).join(", ")}.`);
    }

    const plannedCourseIds = new Set(structureResult.allCourseIds);

    if (scope === "save") {
      for (const term of normalizedTerms) {
        if (term.courseIds.length > payload.maxCoursesPerTerm) {
          errors.push(
            `${formatStudyTermLabel(term.termCode, term.year)} exceeds the selected study load (${payload.maxCoursesPerTerm} course(s) per semester).`
          );
        }
      }

      const missingCourses = [...remainingCourseMap.values()]
        .filter((course) => !plannedCourseIds.has(course.id))
        .map((course) => buildCourseSummary(course));

      if (missingCourses.length) {
        errors.push(`Missing course(s) from the saved study plan: ${toSortedUnique(missingCourses).join(", ")}.`);
      }
    }

    let passedCourseIds = new Set(catalog.context.passedCourseIds);
    let passedUnits = catalog.context.passedUnits;

    for (const term of normalizedTerms) {
      const termLabel = formatStudyTermLabel(term.termCode, term.year);
      const termCourses = term.courseIds.map((courseId) => remainingCourseMap.get(courseId)).filter(Boolean);

      for (const course of termCourses) {
        const evaluation = this.evaluateCourseForPlanning({
          course,
          context: catalog.context,
          passedCourseIds,
          passedUnits,
          termCode: term.termCode,
          enforceStructuredAssumedKnowledge: true
        });

        if (!evaluation.eligible) {
          errors.push(
            `${course.code} in ${termLabel} is not valid: ${evaluation.blockingReasons.join(" ")}`
          );
        }
      }

      // Same-semester planned courses never satisfy each other; unlock only after this term.
      for (const course of termCourses) {
        passedCourseIds.add(course.id);
        passedUnits += course.units;
      }
    }

    if (errors.length) {
      throw new AppError(400, "Study plan validation failed.", errors);
    }

    return {
      valid: true,
      scope,
      termCount: normalizedTerms.length,
      courseCount: structureResult.allCourseIds.length
    };
  }

  buildSavedStudyPlanFromHeader(header, allCourseMap) {
    if (!header) {
      return null;
    }

    const items = this.studyPlanRepository.listSavedStudyPlanItemsByStudyPlanId(header.id);
    const termsByKey = new Map();

    for (const item of items) {
      const key = buildTermKey(item.term, item.year);
      if (!termsByKey.has(key)) {
        termsByKey.set(key, {
          termCode: item.term,
          year: item.year,
          label: formatStudyTermLabel(item.term, item.year),
          recommendedCourses: []
        });
      }

      const mappedCourse = allCourseMap.get(item.course_id) ?? {
        id: item.course_id,
        code: item.course_code,
        name: item.course_name,
        units: item.course_units,
        level: item.course_level
      };

      termsByKey.get(key).recommendedCourses.push({
        course: cloneCourseSnapshot(mappedCourse),
        warnings: []
      });
    }

    const terms = [...termsByKey.values()].sort(compareTerms);

    return {
      id: header.id,
      studentId: header.student_id,
      startTerm: header.start_term,
      startYear: header.start_year,
      maxCoursesPerTerm: header.max_courses_per_term,
      createdAt: header.created_at,
      updatedAt: header.updated_at,
      terms
    };
  }

  getSavedStudyPlanVersions(studentId) {
    assertFound(this.ruleEngineService.studentRepository.getStudentProfileById(studentId), "Student not found.");

    const catalog = this.buildPlanningCatalog(studentId);
    const headers = this.studyPlanRepository.listSavedStudyPlanHeadersByStudentId(studentId);

    return headers.map((header) => this.buildSavedStudyPlanFromHeader(header, catalog.allCourseMap));
  }

  getSavedStudyPlan(studentId) {
    assertFound(this.ruleEngineService.studentRepository.getStudentProfileById(studentId), "Student not found.");

    const catalog = this.buildPlanningCatalog(studentId);
    const header = this.studyPlanRepository.getSavedStudyPlanHeaderByStudentId(studentId);

    return this.buildSavedStudyPlanFromHeader(header, catalog.allCourseMap);
  }

  getSavedStudyPlanById(studentId, studyPlanId) {
    assertFound(this.ruleEngineService.studentRepository.getStudentProfileById(studentId), "Student not found.");

    const catalog = this.buildPlanningCatalog(studentId);
    const header = assertFound(
      this.studyPlanRepository.getSavedStudyPlanHeaderById(studentId, studyPlanId),
      "Saved study plan version not found."
    );

    return this.buildSavedStudyPlanFromHeader(header, catalog.allCourseMap);
  }

  saveStudyPlan(studentId, payload) {
    this.validateStudyPlan(studentId, payload, { scope: "save" });

    const savedHeader = this.studyPlanRepository.saveStudyPlanVersion(
      studentId,
      {
        startTerm: payload.startTerm,
        startYear: payload.startYear,
        maxCoursesPerTerm: payload.maxCoursesPerTerm,
        terms: payload.terms
      },
      {
        maxVersions: 4
      }
    );

    const catalog = this.buildPlanningCatalog(studentId);
    return this.buildSavedStudyPlanFromHeader(savedHeader, catalog.allCourseMap);
  }

  deleteSavedStudyPlanVersion(studentId, studyPlanId) {
    assertFound(this.ruleEngineService.studentRepository.getStudentProfileById(studentId), "Student not found.");
    assertFound(
      this.studyPlanRepository.getSavedStudyPlanHeaderById(studentId, studyPlanId),
      "Saved study plan version not found."
    );

    this.studyPlanRepository.deleteSavedStudyPlanVersion(studentId, studyPlanId);
    return this.getSavedStudyPlanVersions(studentId);
  }
}
