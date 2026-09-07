export class CourseRepository {
  constructor(db) {
    this.db = db;
  }

  getCourseById(courseId) {
    return this.db
      .prepare(`
        SELECT id, code, name, units, level
        FROM courses
        WHERE id = ?
      `)
      .get(courseId);
  }

  getCourseByCode(code) {
    return this.db
      .prepare(`
        SELECT id, code, name, units, level
        FROM courses
        WHERE code = ?
      `)
      .get(code);
  }

  getCoursesByIds(courseIds) {
    if (!courseIds.length) {
      return [];
    }

    const placeholders = courseIds.map(() => "?").join(", ");

    return this.db
      .prepare(`
        SELECT id, code, name, units, level
        FROM courses
        WHERE id IN (${placeholders})
        ORDER BY level, code
      `)
      .all(...courseIds);
  }

  listElectiveSlotCourses() {
    return this.db
      .prepare(`
        SELECT id, code, name, units, level
        FROM courses
        WHERE code LIKE 'ELEC-%'
        ORDER BY code
      `)
      .all();
  }
}
