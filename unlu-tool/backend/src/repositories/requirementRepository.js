export class RequirementRepository {
  constructor(db) {
    this.db = db;
  }

  getProgramBlocksWithCourses(programId) {
    return this.db
      .prepare(`
        SELECT
          block.id AS block_id,
          block.code AS block_code,
          block.name AS block_name,
          block.required_units AS block_required_units,
          block.display_order AS block_display_order,
          course.id AS course_id,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM program_requirement_blocks block
        LEFT JOIN program_block_courses block_course ON block_course.program_block_id = block.id
        LEFT JOIN courses course ON course.id = block_course.course_id
        WHERE block.program_id = ?
        ORDER BY block.display_order, course.level, course.code
      `)
      .all(programId);
  }

  getMajorBlocksWithCourses(majorId) {
    return this.db
      .prepare(`
        SELECT
          block.id AS block_id,
          block.code AS block_code,
          block.name AS block_name,
          block.required_units AS block_required_units,
          block.display_order AS block_display_order,
          block_course.counts_from_core AS counts_from_core,
          course.id AS course_id,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM major_requirement_blocks block
        LEFT JOIN major_block_courses block_course ON block_course.major_block_id = block.id
        LEFT JOIN courses course ON course.id = block_course.course_id
        WHERE block.major_id = ?
        ORDER BY block.display_order, course.level, course.code
      `)
      .all(majorId);
  }

  getMajorBlockOptionCourses(majorId) {
    return this.db
      .prepare(`
        SELECT
          block.id AS block_id,
          block.code AS block_code,
          block.name AS block_name,
          block.required_units AS block_required_units,
          block.display_order AS block_display_order,
          course.id AS course_id,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM major_requirement_blocks block
        JOIN major_block_option_courses option_course ON option_course.major_block_id = block.id
        JOIN courses course ON course.id = option_course.course_id
        WHERE block.major_id = ?
        ORDER BY block.display_order, course.level, course.code
      `)
      .all(majorId);
  }

  getCourseMemberships(courseId) {
    const programMemberships = this.db
      .prepare(`
        SELECT
          block.id AS block_id,
          block.code AS block_code,
          block.name AS block_name,
          program.id AS program_id,
          program.code AS program_code,
          program.name AS program_name
        FROM program_block_courses block_course
        JOIN program_requirement_blocks block ON block.id = block_course.program_block_id
        JOIN programs program ON program.id = block.program_id
        WHERE block_course.course_id = ?
        ORDER BY block.display_order
      `)
      .all(courseId);

    const majorMemberships = this.db
      .prepare(`
        SELECT
          block.id AS block_id,
          block.code AS block_code,
          block.name AS block_name,
          major.id AS major_id,
          major.code AS major_code,
          major.name AS major_name,
          block_course.counts_from_core AS counts_from_core
        FROM major_block_courses block_course
        JOIN major_requirement_blocks block ON block.id = block_course.major_block_id
        JOIN majors major ON major.id = block.major_id
        WHERE block_course.course_id = ?
        ORDER BY block.display_order
      `)
      .all(courseId);

    return {
      programMemberships,
      majorMemberships
    };
  }
}
