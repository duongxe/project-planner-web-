const MAX_SAVED_STUDY_PLAN_VERSIONS = 4;

export class StudyPlanRepository {
  constructor(db) {
    this.db = db;
  }

  listSavedStudyPlanHeadersByStudentId(studentId) {
    return this.db
      .prepare(`
        SELECT
          id,
          student_id,
          start_term,
          start_year,
          max_courses_per_term,
          created_at,
          updated_at
        FROM saved_study_plans
        WHERE student_id = ?
        ORDER BY datetime(updated_at) DESC, id DESC
      `)
      .all(studentId);
  }

  getSavedStudyPlanHeaderByStudentId(studentId) {
    return this.db
      .prepare(`
        SELECT
          id,
          student_id,
          start_term,
          start_year,
          max_courses_per_term,
          created_at,
          updated_at
        FROM saved_study_plans
        WHERE student_id = ?
        ORDER BY datetime(updated_at) DESC, id DESC
        LIMIT 1
      `)
      .get(studentId);
  }

  getSavedStudyPlanHeaderById(studentId, studyPlanId) {
    return this.db
      .prepare(`
        SELECT
          id,
          student_id,
          start_term,
          start_year,
          max_courses_per_term,
          created_at,
          updated_at
        FROM saved_study_plans
        WHERE student_id = ? AND id = ?
      `)
      .get(studentId, studyPlanId);
  }

  listSavedStudyPlanItemsByStudyPlanId(studyPlanId) {
    return this.db
      .prepare(`
        SELECT
          item.id,
          item.study_plan_id,
          item.course_id,
          item.year,
          item.term,
          item.display_order,
          course.code AS course_code,
          course.name AS course_name,
          course.units AS course_units,
          course.level AS course_level
        FROM saved_study_plan_items item
        JOIN courses course ON course.id = item.course_id
        WHERE item.study_plan_id = ?
        ORDER BY item.year, item.term, item.display_order, course.code
      `)
      .all(studyPlanId);
  }

  deleteSavedStudyPlan(studentId) {
    this.db
      .prepare(`
        DELETE FROM saved_study_plans
        WHERE student_id = ?
      `)
      .run(studentId);
  }

  deleteSavedStudyPlanVersion(studentId, studyPlanId) {
    this.db
      .prepare(`
        DELETE FROM saved_study_plans
        WHERE student_id = ? AND id = ?
      `)
      .run(studentId, studyPlanId);
  }

  saveStudyPlanVersion(studentId, payload, { maxVersions = MAX_SAVED_STUDY_PLAN_VERSIONS } = {}) {
    const save = this.db.transaction(() => {
      const headerResult = this.db
        .prepare(`
          INSERT INTO saved_study_plans (
            student_id,
            start_term,
            start_year,
            max_courses_per_term,
            updated_at
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .run(studentId, payload.startTerm, payload.startYear, payload.maxCoursesPerTerm);

      const studyPlanId = headerResult.lastInsertRowid;

      const insertItem = this.db.prepare(`
        INSERT INTO saved_study_plan_items (
          study_plan_id,
          course_id,
          year,
          term,
          display_order
        )
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const term of payload.terms) {
        term.courseIds.forEach((courseId, index) => {
          insertItem.run(studyPlanId, courseId, term.year, term.termCode, index + 1);
        });
      }

      const overflowRows = this.db
        .prepare(`
          SELECT id
          FROM saved_study_plans
          WHERE student_id = ?
          ORDER BY datetime(updated_at) DESC, id DESC
          LIMIT -1 OFFSET ?
        `)
        .all(studentId, maxVersions);

      if (overflowRows.length) {
        const deleteVersion = this.db.prepare(`
          DELETE FROM saved_study_plans
          WHERE student_id = ? AND id = ?
        `);

        for (const row of overflowRows) {
          deleteVersion.run(studentId, row.id);
        }
      }

      return this.getSavedStudyPlanHeaderById(studentId, studyPlanId);
    });

    return save();
  }

  saveStudyPlan(studentId, payload, options = {}) {
    return this.saveStudyPlanVersion(studentId, payload, options);
  }
}