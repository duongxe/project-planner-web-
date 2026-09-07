PRAGMA foreign_keys = ON;

UPDATE course_rule_groups
SET
  rule_category = 'prerequisite',
  note = 'Successful completion of at least 140 units of study.'
WHERE course_id = (SELECT id FROM courses WHERE code = 'COMP3851A')
  AND rule_category = 'assumed_knowledge';

UPDATE course_rule_groups
SET
  rule_category = 'prerequisite',
  note = 'Successful completion of COMP3851A.'
WHERE course_id = (SELECT id FROM courses WHERE code = 'COMP3851B')
  AND rule_category = 'assumed_knowledge';

DELETE FROM student_course_records
WHERE student_id = (SELECT id FROM student_profiles WHERE student_number = 'c3415519');

DELETE FROM student_course_records
WHERE status IN ('failed', 'in_progress', 'planned');

INSERT OR IGNORE INTO student_course_records (student_id, course_id, status, year, term, grade)
SELECT student.id, course.id, 'passed', 2025, 'S1', 'P'
FROM student_profiles student
JOIN courses course ON course.code IN ('COMP1010', 'COMP1140', 'SENG1050')
WHERE student.student_number = 'c3415519';
