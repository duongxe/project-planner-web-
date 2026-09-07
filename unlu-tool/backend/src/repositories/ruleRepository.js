export class RuleRepository {
  constructor(db) {
    this.db = db;
  }

  getRuleGroupsForCourseIds(courseIds, programId = null) {
    if (!courseIds.length) {
      return [];
    }

    const placeholders = courseIds.map(() => "?").join(", ");
    const scopedCondition = programId === null
      ? "group_row.program_id IS NULL"
      : `
        (
          group_row.program_id = ?
          OR (
            group_row.program_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM course_rule_groups override_group
              WHERE override_group.course_id = group_row.course_id
                AND override_group.rule_category = group_row.rule_category
                AND override_group.program_id = ?
            )
          )
        )
      `;

    return this.db
      .prepare(`
        SELECT
          group_row.id AS group_id,
          group_row.course_id AS course_id,
          group_row.program_id AS program_id,
          group_row.rule_category AS rule_category,
          group_row.logic_type AS logic_type,
          group_row.group_order AS group_order,
          group_row.note AS group_note,
          item.id AS item_id,
          item.item_type AS item_type,
          item.item_order AS item_order,
          item.minimum_units AS minimum_units,
          item.free_text AS free_text,
          required_course.id AS required_course_id,
          required_course.code AS required_course_code,
          required_course.name AS required_course_name,
          required_course.units AS required_course_units,
          required_course.level AS required_course_level
        FROM course_rule_groups group_row
        LEFT JOIN course_rule_items item ON item.group_id = group_row.id
        LEFT JOIN courses required_course ON required_course.id = item.required_course_id
        WHERE group_row.course_id IN (${placeholders})
          AND ${scopedCondition}
        ORDER BY group_row.course_id, group_row.rule_category, group_row.group_order, item.item_order
      `)
      .all(...(programId === null ? courseIds : [...courseIds, programId, programId]));
  }
}
