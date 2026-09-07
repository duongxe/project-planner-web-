export class ProgramRepository {
  constructor(db) {
    this.db = db;
  }

  listProgramsWithMajors() {
    return this.db
      .prepare(`
        SELECT
          program.id AS program_id,
          program.code AS program_code,
          program.name AS program_name,
          program.total_units AS program_total_units,
          major.id AS major_id,
          major.code AS major_code,
          major.name AS major_name,
          major.total_units AS major_total_units
        FROM programs program
        LEFT JOIN majors major ON major.program_id = program.id
        ORDER BY program.name, major.name
      `)
      .all();
  }

  getProgramById(programId) {
    return this.db
      .prepare(`
        SELECT id, code, name, total_units
        FROM programs
        WHERE id = ?
      `)
      .get(programId);
  }

  listMajorsByProgramId(programId) {
    return this.db
      .prepare(`
        SELECT id, program_id, code, name, total_units
        FROM majors
        WHERE program_id = ?
        ORDER BY name
      `)
      .all(programId);
  }

  getMajorById(majorId) {
    return this.db
      .prepare(`
        SELECT
          major.id,
          major.program_id,
          major.code,
          major.name,
          major.total_units,
          program.code AS program_code,
          program.name AS program_name
        FROM majors major
        JOIN programs program ON program.id = major.program_id
        WHERE major.id = ?
      `)
      .get(majorId);
  }

  getProgramLevelRules(programId) {
    return this.db
      .prepare(`
        SELECT id, program_id, level, rule_operator, units, display_order
        FROM program_level_rules
        WHERE program_id = ?
        ORDER BY display_order, level
      `)
      .all(programId);
  }

  getProgramCourseOfferingRows(programId, courseIds = []) {
    if (!courseIds.length) {
      return this.db
        .prepare(`
          SELECT program_id, course_id, term_code
          FROM program_course_offerings
          WHERE program_id = ?
          ORDER BY course_id, term_code
        `)
        .all(programId);
    }

    const placeholders = courseIds.map(() => "?").join(", ");

    return this.db
      .prepare(`
        SELECT program_id, course_id, term_code
        FROM program_course_offerings
        WHERE program_id = ?
          AND course_id IN (${placeholders})
        ORDER BY course_id, term_code
      `)
      .all(programId, ...courseIds);
  }
}
