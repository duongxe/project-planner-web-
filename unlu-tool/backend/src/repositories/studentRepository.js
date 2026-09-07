import { AppError } from "../utils/appError.js";

export class StudentRepository {
  constructor(db) {
    this.db = db;
  }

  getStudentProfileById(studentId) {
    return this.db
      .prepare(`
        SELECT
          student.id,
          student.student_number,
          student.name,
          student.selected_program_id,
          student.selected_major_id,
          student.created_at,
          student.updated_at,
          program.code AS program_code,
          program.name AS program_name,
          major.code AS major_code,
          major.name AS major_name
        FROM student_profiles student
        JOIN programs program ON program.id = student.selected_program_id
        JOIN majors major ON major.id = student.selected_major_id
        WHERE student.id = ?
      `)
      .get(studentId);
  }

  getStudentByStudentNumber(studentNumber) {
    return this.db
      .prepare(`
        SELECT
          student.id,
          student.student_number,
          student.name,
          student.selected_program_id,
          student.selected_major_id,
          program.code AS program_code,
          program.name AS program_name,
          major.code AS major_code,
          major.name AS major_name
        FROM student_profiles student
        JOIN programs program ON program.id = student.selected_program_id
        JOIN majors major ON major.id = student.selected_major_id
        WHERE student.student_number = ?
      `)
      .get(studentNumber);
  }

  listCourseRecordsByStudentId(studentId) {
    return this.db
      .prepare(`
        SELECT
          record.id,
          record.student_id,
          record.course_id,
          record.status,
          record.year,
          record.term,
          record.grade,
          record.created_at,
          record.updated_at,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM student_course_records record
        JOIN courses course ON course.id = record.course_id
        WHERE record.student_id = ?
        ORDER BY course.level, course.code
      `)
      .all(studentId);
  }

  getCourseRecordById(studentId, recordId) {
    return this.db
      .prepare(`
        SELECT
          record.id,
          record.student_id,
          record.course_id,
          record.status,
          record.year,
          record.term,
          record.grade,
          record.created_at,
          record.updated_at,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM student_course_records record
        JOIN courses course ON course.id = record.course_id
        WHERE record.student_id = ? AND record.id = ?
      `)
      .get(studentId, recordId);
  }

  createCourseRecord(studentId, payload) {
    const existing = this.db
      .prepare(`
        SELECT id
        FROM student_course_records
        WHERE student_id = ? AND course_id = ?
      `)
      .get(studentId, payload.courseId);

    if (existing) {
      throw new AppError(409, "A course record already exists for that student and course.");
    }

    const result = this.db
      .prepare(`
        INSERT INTO student_course_records (
          student_id,
          course_id,
          status,
          year,
          term,
          grade,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .run(
        studentId,
        payload.courseId,
        payload.status,
        payload.year,
        payload.term,
        payload.grade
      );

    this.touchStudentProfile(studentId);
    return this.getCourseRecordById(studentId, result.lastInsertRowid);
  }

  updateCourseRecord(studentId, recordId, payload) {
    const existing = this.getCourseRecordById(studentId, recordId);
    if (!existing) {
      throw new AppError(404, "Course record not found.");
    }

    this.db
      .prepare(`
        UPDATE student_course_records
        SET
          status = ?,
          year = ?,
          term = ?,
          grade = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ? AND id = ?
      `)
      .run(payload.status, payload.year, payload.term, payload.grade, studentId, recordId);

    this.touchStudentProfile(studentId);
    return this.getCourseRecordById(studentId, recordId);
  }

  deleteCourseRecord(studentId, recordId) {
    const existing = this.getCourseRecordById(studentId, recordId);
    if (!existing) {
      throw new AppError(404, "Course record not found.");
    }

    this.db
      .prepare(`
        DELETE FROM student_course_records
        WHERE student_id = ? AND id = ?
      `)
      .run(studentId, recordId);

    this.touchStudentProfile(studentId);
    return existing;
  }

  getCourseRecordByCourseId(studentId, courseId) {
    return this.db
      .prepare(`
        SELECT
          record.id,
          record.student_id,
          record.course_id,
          record.status,
          record.year,
          record.term,
          record.grade,
          record.created_at,
          record.updated_at,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM student_course_records record
        JOIN courses course ON course.id = record.course_id
        WHERE record.student_id = ? AND record.course_id = ?
      `)
      .get(studentId, courseId);
  }

  deleteCourseRecordByCourseId(studentId, courseId) {
    const existing = this.getCourseRecordByCourseId(studentId, courseId);
    if (!existing) {
      return null;
    }

    this.db
      .prepare(`
        DELETE FROM student_course_records
        WHERE student_id = ? AND course_id = ?
      `)
      .run(studentId, courseId);

    this.touchStudentProfile(studentId);
    return existing;
  }

  listMajorOptionSelectionsByStudentId(studentId) {
    return this.db
      .prepare(`
        SELECT
          selection.id,
          selection.student_id,
          selection.slot_course_id,
          selection.selected_course_id,
          selection.created_at,
          selection.updated_at,
          slot_course.code AS slot_course_code,
          slot_course.name AS slot_course_name,
          slot_course.units AS slot_course_units,
          slot_course.level AS slot_course_level,
          selected_course.code AS selected_course_code,
          selected_course.name AS selected_course_name,
          selected_course.units AS selected_course_units,
          selected_course.level AS selected_course_level
        FROM student_major_option_selections selection
        JOIN courses slot_course ON slot_course.id = selection.slot_course_id
        JOIN courses selected_course ON selected_course.id = selection.selected_course_id
        WHERE selection.student_id = ?
        ORDER BY slot_course.code
      `)
      .all(studentId)
      .map((row) => ({
        id: row.id,
        studentId: row.student_id,
        slotCourseId: row.slot_course_id,
        selectedCourseId: row.selected_course_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        slotCourse: {
          id: row.slot_course_id,
          code: row.slot_course_code,
          name: row.slot_course_name,
          units: row.slot_course_units,
          level: row.slot_course_level
        },
        selectedCourse: {
          id: row.selected_course_id,
          code: row.selected_course_code,
          name: row.selected_course_name,
          units: row.selected_course_units,
          level: row.selected_course_level
        }
      }));
  }

  upsertMajorOptionSelection(studentId, slotCourseId, selectedCourseId) {
    this.db
      .prepare(`
        INSERT INTO student_major_option_selections (
          student_id,
          slot_course_id,
          selected_course_id,
          updated_at
        )
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id, slot_course_id) DO UPDATE SET
          selected_course_id = excluded.selected_course_id,
          updated_at = CURRENT_TIMESTAMP
      `)
      .run(studentId, slotCourseId, selectedCourseId);

    this.touchStudentProfile(studentId);
    return this.listMajorOptionSelectionsByStudentId(studentId);
  }

  deleteMajorOptionSelection(studentId, slotCourseId) {
    this.db
      .prepare(`
        DELETE FROM student_major_option_selections
        WHERE student_id = ? AND slot_course_id = ?
      `)
      .run(studentId, slotCourseId);

    this.touchStudentProfile(studentId);
    return this.listMajorOptionSelectionsByStudentId(studentId);
  }

  touchStudentProfile(studentId) {
    this.db
      .prepare(`
        UPDATE student_profiles
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(studentId);
  }
}
