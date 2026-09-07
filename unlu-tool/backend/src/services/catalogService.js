import { assertFound } from "../utils/appError.js";

function buildCourse(row, includeCountsFromCore = false) {
  if (!row.course_id) {
    return null;
  }

  return {
    id: row.course_id,
    code: row.course_code,
    name: row.course_name,
    units: row.course_units,
    level: row.course_level,
    ...(includeCountsFromCore ? { countsFromCore: Boolean(row.counts_from_core) } : {})
  };
}

function groupBlocks(rows, { includeCountsFromCore = false } = {}) {
  const blockMap = new Map();

  for (const row of rows) {
    if (!blockMap.has(row.block_id)) {
      blockMap.set(row.block_id, {
        id: row.block_id,
        code: row.block_code,
        name: row.block_name,
        requiredUnits: row.block_required_units,
        displayOrder: row.block_display_order,
        courses: []
      });
    }

    const block = blockMap.get(row.block_id);
    const course = buildCourse(row, includeCountsFromCore);

    if (course) {
      block.courses.push(course);
    }
  }

  return [...blockMap.values()];
}

function normalizeRuleGroups(ruleRows) {
  const groupMap = new Map();

  for (const row of ruleRows) {
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

    if (!row.item_id) {
      continue;
    }

    groupMap.get(row.group_id).items.push({
      id: row.item_id,
      itemType: row.item_type,
      itemOrder: row.item_order,
      minimumUnits: row.minimum_units,
      freeText: row.free_text,
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

  return [...groupMap.values()];
}

function buildOfferingMap(offeringRows) {
  const offeringMap = new Map();

  for (const row of offeringRows) {
    if (!offeringMap.has(row.course_id)) {
      offeringMap.set(row.course_id, []);
    }

    offeringMap.get(row.course_id).push(row.term_code);
  }

  return offeringMap;
}

function attachOfferingData(course, offeringMap) {
  const offeredTerms = offeringMap.get(course.id) ?? [];

  return {
    ...course,
    offeredTerms,
    hasOfferingData: offeredTerms.length > 0
  };
}

export class CatalogService {
  constructor({ programRepository, requirementRepository, courseRepository, ruleRepository }) {
    this.programRepository = programRepository;
    this.requirementRepository = requirementRepository;
    this.courseRepository = courseRepository;
    this.ruleRepository = ruleRepository;
  }

  getPrograms() {
    const rows = this.programRepository.listProgramsWithMajors();
    const programMap = new Map();

    for (const row of rows) {
      if (!programMap.has(row.program_id)) {
        programMap.set(row.program_id, {
          id: row.program_id,
          code: row.program_code,
          name: row.program_name,
          totalUnits: row.program_total_units,
          majors: []
        });
      }

      if (row.major_id) {
        programMap.get(row.program_id).majors.push({
          id: row.major_id,
          code: row.major_code,
          name: row.major_name,
          totalUnits: row.major_total_units
        });
      }
    }

    return [...programMap.values()];
  }

  getProgramRequirements(programId, majorId) {
    const program = assertFound(this.programRepository.getProgramById(programId), "Program not found.");
    const major = assertFound(this.programRepository.getMajorById(majorId), "Major not found.");

    const programBlocks = groupBlocks(this.requirementRepository.getProgramBlocksWithCourses(programId));
    const majorBlocks = groupBlocks(this.requirementRepository.getMajorBlocksWithCourses(majorId), {
      includeCountsFromCore: true
    });
    const majorOptionBlockCourses = groupBlocks(this.requirementRepository.getMajorBlockOptionCourses(majorId));
    const programLevelRules = this.programRepository.getProgramLevelRules(programId).map((rule) => ({
      id: rule.id,
      level: rule.level,
      ruleOperator: rule.rule_operator,
      units: rule.units,
      displayOrder: rule.display_order
    }));

    const distinctCourseMap = new Map();

    for (const block of programBlocks) {
      for (const course of block.courses) {
        if (!distinctCourseMap.has(course.id)) {
          distinctCourseMap.set(course.id, {
            ...course,
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

    for (const block of majorBlocks) {
      for (const course of block.courses) {
        if (!distinctCourseMap.has(course.id)) {
          distinctCourseMap.set(course.id, {
            id: course.id,
            code: course.code,
            name: course.name,
            units: course.units,
            level: course.level,
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
      }
    }

    const distinctCourses = [...distinctCourseMap.values()]
      .map((course) => ({
        ...course,
        sharedWithCore: course.countsFromCore || (course.inProgramBlocks.length > 0 && course.inMajorBlocks.length > 0)
      }))
      .sort((left, right) => (left.level - right.level) || left.code.localeCompare(right.code));

    const sharedCourseIds = distinctCourses
      .filter((course) => course.sharedWithCore)
      .map((course) => course.id);

    const offeringCourseIds = [...new Set([
      ...distinctCourses.map((course) => course.id),
      ...majorOptionBlockCourses.flatMap((block) => block.courses.map((course) => course.id))
    ])];
    const offeringMap = buildOfferingMap(
      this.programRepository.getProgramCourseOfferingRows(programId, offeringCourseIds)
    );

    const majorOptionBlocks = majorBlocks
      .filter((block) => majorOptionBlockCourses.some((candidate) => candidate.id === block.id))
      .map((block) => {
        const optionBlock = majorOptionBlockCourses.find((candidate) => candidate.id === block.id);

        return {
          id: block.id,
          code: block.code,
          name: block.name,
          requiredUnits: block.requiredUnits,
          displayOrder: block.displayOrder,
          slotCourses: block.courses.map((course) => attachOfferingData(course, offeringMap)),
          optionCourses: (optionBlock?.courses || []).map((course) => attachOfferingData(course, offeringMap))
        };
      });

    const distinctRequirementUnits = distinctCourses.reduce((total, course) => total + course.units, 0);

    return {
      program: {
        id: program.id,
        code: program.code,
        name: program.name,
        totalUnits: program.total_units
      },
      major: {
        id: major.id,
        code: major.code,
        name: major.name,
        totalUnits: major.total_units
      },
      programBlocks,
      majorBlocks,
      majorOptionBlocks,
      programLevelRules,
      distinctCourses: distinctCourses.map((course) => attachOfferingData(course, offeringMap)),
      sharedCourseIds,
      distinctRequirementUnits
    };
  }

  getProgramById(programId) {
    const program = assertFound(this.programRepository.getProgramById(programId), "Program not found.");

    return {
      id: program.id,
      code: program.code,
      name: program.name,
      totalUnits: program.total_units,
      majors: this.programRepository.listMajorsByProgramId(programId).map((major) => ({
        id: major.id,
        code: major.code,
        name: major.name,
        totalUnits: major.total_units
      })),
      blocks: groupBlocks(this.requirementRepository.getProgramBlocksWithCourses(programId)),
      levelRules: this.programRepository.getProgramLevelRules(programId).map((rule) => ({
        id: rule.id,
        level: rule.level,
        ruleOperator: rule.rule_operator,
        units: rule.units,
        displayOrder: rule.display_order
      }))
    };
  }

  getMajorById(majorId) {
    const major = assertFound(this.programRepository.getMajorById(majorId), "Major not found.");

    return {
      id: major.id,
      code: major.code,
      name: major.name,
      totalUnits: major.total_units,
      program: {
        id: major.program_id,
        code: major.program_code,
        name: major.program_name
      },
      blocks: groupBlocks(this.requirementRepository.getMajorBlocksWithCourses(majorId), {
        includeCountsFromCore: true
      })
    };
  }

  getCourseById(courseId) {
    const course = assertFound(this.courseRepository.getCourseById(courseId), "Course not found.");
    const memberships = this.requirementRepository.getCourseMemberships(courseId);
    const rules = normalizeRuleGroups(this.ruleRepository.getRuleGroupsForCourseIds([courseId]));

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      units: course.units,
      level: course.level,
      memberships,
      ruleGroups: rules
    };
  }
}
