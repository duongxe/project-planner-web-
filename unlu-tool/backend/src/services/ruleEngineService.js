import { assertFound } from "../utils/appError.js";

function normalizeSentence(text) {
  if (!text) {
    return "";
  }

  return String(text).trim().replace(/\.$/, "");
}

function formatAcademicTerm(termCode) {
  if (termCode === "S1") {
    return "Semester 1";
  }

  if (termCode === "S2") {
    return "Semester 2";
  }

  return "Summer";
}

function describeCourse(course) {
  return `${course.code} (${course.name})`;
}

function joinWithConjunction(values, conjunction) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} ${conjunction} ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, ${conjunction} ${values[values.length - 1]}`;
}

function describeItem(item) {
  if (item.itemType === "course" && item.requiredCourse) {
    return describeCourse(item.requiredCourse);
  }

  if (item.itemType === "minimum_units") {
    return `successful completion of at least ${item.minimumUnits} units`;
  }

  return item.freeText || "";
}

function buildExpectationText(group) {
  const note = normalizeSentence(group.note);
  if (note) {
    return note;
  }

  const itemDescriptions = group.items.map(describeItem).filter(Boolean);
  if (group.logicType === "all_of") {
    return joinWithConjunction(itemDescriptions, "and");
  }

  return `one of ${joinWithConjunction(itemDescriptions, "or")}`;
}

function buildRuleGroupsByCourseId(ruleGroups) {
  const groupsByCourseId = new Map();

  for (const group of ruleGroups) {
    if (!groupsByCourseId.has(group.courseId)) {
      groupsByCourseId.set(group.courseId, {
        prerequisite: [],
        assumed_knowledge: [],
        exclusion: []
      });
    }

    groupsByCourseId.get(group.courseId)[group.ruleCategory].push(group);
  }

  return groupsByCourseId;
}

function uniqueCourses(records) {
  const map = new Map();

  for (const record of records) {
    if (!map.has(record.courseId)) {
      map.set(record.courseId, record.course);
    }
  }

  return [...map.values()];
}

function cloneCourseSnapshot(course) {
  if (!course) {
    return null;
  }

  return {
    ...course,
    offeredTerms: [...(course.offeredTerms || [])],
    inProgramBlocks: course.inProgramBlocks ? course.inProgramBlocks.map((block) => ({ ...block })) : [],
    inMajorBlocks: course.inMajorBlocks ? course.inMajorBlocks.map((block) => ({ ...block })) : [],
    optionChoices: Array.isArray(course.optionChoices)
      ? course.optionChoices.map((option) => cloneCourseSnapshot(option))
      : undefined,
    selectedOptionCourse: course.selectedOptionCourse ? cloneCourseSnapshot(course.selectedOptionCourse) : null
  };
}

function resolveStudentRequirements(requirements, selectionRows = []) {
  const detailedCourseMap = new Map();

  for (const course of requirements.distinctCourses) {
    detailedCourseMap.set(course.id, cloneCourseSnapshot(course));
  }

  for (const block of requirements.majorOptionBlocks || []) {
    for (const course of block.optionCourses || []) {
      detailedCourseMap.set(course.id, cloneCourseSnapshot(course));
    }
  }

  const validSelections = [];
  for (const block of requirements.majorOptionBlocks || []) {
    const optionIds = new Set((block.optionCourses || []).map((course) => course.id));
    const slotIds = new Set((block.slotCourses || []).map((course) => course.id));

    for (const row of selectionRows) {
      if (slotIds.has(row.slotCourseId) && optionIds.has(row.selectedCourseId)) {
        validSelections.push(row);
      }
    }
  }

  const selectedCourseIds = new Set(validSelections.map((row) => row.selectedCourseId));

  const resolvedMajorOptionBlocks = (requirements.majorOptionBlocks || []).map((block) => ({
    ...block,
    slotCourses: (block.slotCourses || []).map((slotCourse) => {
      const selectedRow = validSelections.find((row) => row.slotCourseId === slotCourse.id);
      const selectedCourse = selectedRow
        ? cloneCourseSnapshot((block.optionCourses || []).find((course) => course.id === selectedRow.selectedCourseId))
        : null;
      const activeCourse = selectedCourse ? cloneCourseSnapshot(selectedCourse) : cloneCourseSnapshot(slotCourse);

      return {
        ...activeCourse,
        majorOptionSlot: true,
        optionSlotCourseId: slotCourse.id,
        optionSlotCode: slotCourse.code,
        optionSlotName: slotCourse.name,
        selectedOptionCourseId: selectedCourse?.id ?? null,
        selectedOptionCourse: selectedCourse ? cloneCourseSnapshot(selectedCourse) : null,
        optionChoices: (block.optionCourses || [])
          .filter((course) => course.id === selectedCourse?.id || !selectedCourseIds.has(course.id))
          .map((course) => cloneCourseSnapshot(course))
      };
    }),
    optionCourses: (block.optionCourses || []).map((course) => cloneCourseSnapshot(course))
  }));

  const resolvedOptionBlockById = new Map(resolvedMajorOptionBlocks.map((block) => [block.id, block]));
  const resolvedMajorBlocks = requirements.majorBlocks.map((block) => ({
    ...block,
    courses: resolvedOptionBlockById.has(block.id)
      ? resolvedOptionBlockById.get(block.id).slotCourses.map((course) => cloneCourseSnapshot(course))
      : block.courses.map((course) => cloneCourseSnapshot(course))
  }));

  const distinctCourseMap = new Map();

  for (const block of requirements.programBlocks) {
    for (const course of block.courses) {
      const detail = cloneCourseSnapshot(detailedCourseMap.get(course.id) || course);

      if (!distinctCourseMap.has(course.id)) {
        distinctCourseMap.set(course.id, {
          ...detail,
          inProgramBlocks: [],
          inMajorBlocks: [],
          countsFromCore: false,
          sharedWithCore: false
        });
      }

      distinctCourseMap.get(course.id).inProgramBlocks.push({
        id: block.id,
        code: block.code,
        name: block.name
      });
    }
  }

  for (const block of resolvedMajorBlocks) {
    for (const course of block.courses) {
      const detail = cloneCourseSnapshot(detailedCourseMap.get(course.id) || course);

      if (!distinctCourseMap.has(course.id)) {
        distinctCourseMap.set(course.id, {
          ...detail,
          inProgramBlocks: [],
          inMajorBlocks: [],
          countsFromCore: false,
          sharedWithCore: false
        });
      }

      const distinctCourse = distinctCourseMap.get(course.id);
      distinctCourse.inMajorBlocks.push({
        id: block.id,
        code: block.code,
        name: block.name
      });
      distinctCourse.countsFromCore = distinctCourse.countsFromCore || Boolean(course.countsFromCore);

      if (course.majorOptionSlot) {
        distinctCourse.majorOptionSlot = true;
        distinctCourse.optionSlotCourseId = course.optionSlotCourseId;
        distinctCourse.optionSlotCode = course.optionSlotCode;
        distinctCourse.optionSlotName = course.optionSlotName;
        distinctCourse.selectedOptionCourseId = course.selectedOptionCourseId ?? null;
        distinctCourse.selectedOptionCourse = course.selectedOptionCourse ? cloneCourseSnapshot(course.selectedOptionCourse) : null;
        distinctCourse.optionChoices = (course.optionChoices || []).map((option) => cloneCourseSnapshot(option));
      }
    }
  }

  const distinctCourses = [...distinctCourseMap.values()]
    .map((course) => ({
      ...course,
      sharedWithCore: course.countsFromCore || (course.inProgramBlocks.length > 0 && course.inMajorBlocks.length > 0)
    }))
    .sort((left, right) => (left.level - right.level) || left.code.localeCompare(right.code));

  return {
    ...requirements,
    majorBlocks: resolvedMajorBlocks,
    majorOptionBlocks: resolvedMajorOptionBlocks,
    distinctCourses,
    sharedCourseIds: distinctCourses.filter((course) => course.sharedWithCore).map((course) => course.id),
    distinctRequirementUnits: distinctCourses.reduce((total, course) => total + course.units, 0),
    majorOptionSelections: validSelections.map((row) => ({ ...row }))
  };
}


export class RuleEngineService {
  constructor({ studentRepository, catalogService, ruleRepository }) {
    this.studentRepository = studentRepository;
    this.catalogService = catalogService;
    this.ruleRepository = ruleRepository;
  }

  getStudentPassedCourses(studentId, existingContext = null) {
    const context = existingContext ?? this.buildStudentAcademicContext(studentId);
    return context.passedCourses;
  }

  buildStudentAcademicContext(studentId) {
    const student = assertFound(this.studentRepository.getStudentProfileById(studentId), "Student not found.");
    const requirements = this.catalogService.getProgramRequirements(
      student.selected_program_id,
      student.selected_major_id
    );
    const majorOptionSelections = this.studentRepository.listMajorOptionSelectionsByStudentId(studentId);
    const resolvedRequirements = resolveStudentRequirements(requirements, majorOptionSelections);
    const records = this.studentRepository.listCourseRecordsByStudentId(studentId).map((record) => ({
      id: record.id,
      studentId: record.student_id,
      courseId: record.course_id,
      status: record.status,
      year: record.year,
      term: record.term,
      grade: record.grade,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      course: {
        id: record.course_id,
        code: record.course_code,
        name: record.course_name,
        units: record.course_units,
        level: record.course_level
      }
    }));

    const courseMap = new Map();
    for (const course of resolvedRequirements.distinctCourses) {
      courseMap.set(course.id, course);
    }
    for (const record of records) {
      courseMap.set(record.courseId, {
        ...(courseMap.get(record.courseId) ?? {}),
        ...record.course
      });
    }

    const relevantCourseIds = [...courseMap.keys()];
    const rawRuleGroups = this.ruleRepository.getRuleGroupsForCourseIds(
      relevantCourseIds,
      student.selected_program_id
    );
    const normalizedGroups = [];
    const groupMap = new Map();

    for (const row of rawRuleGroups) {
      if (!groupMap.has(row.group_id)) {
        groupMap.set(row.group_id, {
          id: row.group_id,
          courseId: row.course_id,
          ruleCategory: row.rule_category,
          logicType: row.logic_type,
          groupOrder: row.group_order,
          note: row.group_note,
          items: []
        });
      }

      if (row.item_id) {
        groupMap.get(row.group_id).items.push({
          id: row.item_id,
          itemType: row.item_type,
          itemOrder: row.item_order,
          minimumUnits: row.minimum_units,
          freeText: row.free_text,
          requiredCourseId: row.required_course_id,
          requiredCourse: row.required_course_id
            ? {
                id: row.required_course_id,
                code: row.required_course_code,
                name: row.required_course_name,
                units: row.required_course_units,
                level: row.required_course_level
              }
            : null
        });
      }
    }

    for (const group of groupMap.values()) {
      normalizedGroups.push(group);
    }

    const groupsByCourseId = buildRuleGroupsByCourseId(normalizedGroups);
    const recordByCourseId = new Map(records.map((record) => [record.courseId, record]));
    const passedRecords = records.filter((record) => record.status === "passed");
    const passedCourseIds = new Set(passedRecords.map((record) => record.courseId));
    const passedCourses = uniqueCourses(passedRecords);
    const passedUnits = passedCourses.reduce((total, course) => total + course.units, 0);

    return {
      student,
      requirements: resolvedRequirements,
      courseMap,
      records,
      recordByCourseId,
      passedCourseIds,
      passedCourses,
      passedUnits,
      groupsByCourseId,
      majorOptionSelections
    };
  }

  evaluateRuleGroup(studentPassedCourses, group, passedUnits = 0) {
    const passedSet = studentPassedCourses instanceof Set ? studentPassedCourses : new Set(studentPassedCourses);

    const itemResults = group.items.map((item) => {
      const label = describeItem(item);

      if (item.itemType === "course") {
        const satisfied = passedSet.has(item.requiredCourseId ?? item.requiredCourse?.id);
        return {
          ...item,
          label,
          satisfied
        };
      }

      if (item.itemType === "minimum_units") {
        return {
          ...item,
          label,
          satisfied: passedUnits >= item.minimumUnits
        };
      }

      return {
        ...item,
        label,
        satisfied: false
      };
    });

    const satisfied =
      group.logicType === "all_of"
        ? itemResults.every((item) => item.satisfied)
        : itemResults.some((item) => item.satisfied);

    return {
      id: group.id,
      courseId: group.courseId,
      ruleCategory: group.ruleCategory,
      logicType: group.logicType,
      groupOrder: group.groupOrder,
      note: group.note,
      expectation: buildExpectationText(group),
      satisfied,
      matchedItems: itemResults.filter((item) => item.satisfied),
      missingItems: itemResults.filter((item) => !item.satisfied),
      itemResults
    };
  }

  evaluateCourseEligibility(studentId, courseId, existingContext = null, options = {}) {
    const context = existingContext ?? this.buildStudentAcademicContext(studentId);
    return this.evaluateCourseEligibilityFromContext(courseId, context, options);
  }

  evaluateCourseEligibilityFromContext(courseId, context, options = {}) {
    const course = assertFound(context.courseMap.get(courseId), "Course not found.");
    const termCode = options.termCode ? String(options.termCode).toUpperCase() : null;
    const groupedRules = context.groupsByCourseId.get(courseId) ?? {
      prerequisite: [],
      assumed_knowledge: [],
      exclusion: []
    };

    // Hard prerequisite checks only use previously passed courses and passed units.
    // Planned, in-progress, and failed records never satisfy a blocking prerequisite.
    const prerequisiteGroups = groupedRules.prerequisite.map((group) =>
      this.evaluateRuleGroup(context.passedCourseIds, group, context.passedUnits)
    );
    const exclusionGroups = groupedRules.exclusion.map((group) =>
      this.evaluateRuleGroup(context.passedCourseIds, group, context.passedUnits)
    );
    const assumedKnowledgeGroups = groupedRules.assumed_knowledge.map((group) =>
      this.evaluateRuleGroup(context.passedCourseIds, group, context.passedUnits)
    );

    const hardBlocks = [];

    for (const evaluation of prerequisiteGroups.filter((group) => !group.satisfied)) {
      hardBlocks.push({
        category: "prerequisite",
        message: `Blocked by prerequisite: ${normalizeSentence(evaluation.expectation)}.`,
        group: evaluation
      });
    }

    for (const evaluation of exclusionGroups.filter((group) => group.satisfied)) {
      const matchedDescriptions = evaluation.matchedItems.map((item) => item.label);
      hardBlocks.push({
        category: "exclusion",
        message: `Blocked by exclusion: completed ${joinWithConjunction(matchedDescriptions, "or")}.`,
        group: evaluation
      });
    }

    if (
      termCode &&
      course.hasOfferingData &&
      Array.isArray(course.offeredTerms) &&
      !course.offeredTerms.includes(termCode)
    ) {
      hardBlocks.push({
        category: "availability",
        message: `Not offered in ${formatAcademicTerm(termCode)} for the selected program.`,
        termCode
      });
    }

    const warnings = assumedKnowledgeGroups
      .filter((group) => !group.satisfied)
      .map((group) => ({
        category: "assumed_knowledge",
        message: `Assumed knowledge warning: ${normalizeSentence(group.expectation)}.`,
        group
      }));

    return {
      course,
      eligible: hardBlocks.length === 0,
      hardBlocks,
      warnings,
      termCode,
      prerequisiteGroups,
      exclusionGroups,
      assumedKnowledgeGroups,
      currentRecord: context.recordByCourseId.get(courseId) ?? null
    };
  }
}
