PRAGMA foreign_keys = ON;

DELETE FROM program_course_offerings
WHERE program_id IN (
  SELECT id
  FROM programs
  WHERE code IN ('BIT', 'BCS')
);

WITH offering_data(program_code, course_code, term_code) AS (
  VALUES
    ('BIT', 'INFT2060', 'S2'),
    ('BIT', 'COMP1010', 'S1'),
    ('BIT', 'COMP1010', 'S2'),
    ('BIT', 'COMP3350', 'S1'),
    ('BIT', 'COMP3851A', 'S1'),
    ('BIT', 'COMP3851A', 'S2'),
    ('BIT', 'COMP3851B', 'S1'),
    ('BIT', 'COMP3851B', 'S2'),
    ('BIT', 'SENG2130', 'S1'),
    ('BIT', 'SENG2260', 'S2'),
    ('BIT', 'INFT2150', 'S2'),
    ('BIT', 'SENG1110', 'S1'),
    ('BIT', 'SENG1110', 'S2'),
    ('BIT', 'SENG1050', 'S2'),
    ('BIT', 'INFT2031', 'S1'),
    ('BIT', 'INFT1060', 'S1'),
    ('BIT', 'COMP1140', 'S2'),
    ('BIT', 'INFT3100', 'S1'),
    ('BIT', 'INFT3800', 'S1'),
    ('BIT', 'INFT1004', 'S1'),
    ('BIT', 'INFT1004', 'S2'),
    ('BIT', 'STAT1060', 'S1'),
    ('BIT', 'STAT1060', 'S2'),
    ('BIT', 'BUSA2001', 'S1'),
    ('BIT', 'BUSA2002', 'S2'),
    ('BIT', 'EBUS3040', 'S1'),
    ('BIT', 'EBUS3040', 'S2'),
    ('BCS', 'COMP2230', 'S2'),
    ('BCS', 'COMP2240', 'S2'),
    ('BCS', 'COMP2270', 'S1'),
    ('BCS', 'SENG2130', 'S1'),
    ('BCS', 'SENG2250', 'S2'),
    ('BCS', 'COMP3851A', 'S1'),
    ('BCS', 'COMP3851A', 'S2'),
    ('BCS', 'COMP3851B', 'S1'),
    ('BCS', 'COMP3851B', 'S2'),
    ('BCS', 'INFT3800', 'S1'),
    ('BCS', 'SENG4500', 'S2'),
    ('BCS', 'COMP3330', 'S1'),
    ('BCS', 'INFT2060', 'S2'),
    ('BCS', 'MATH2340', 'S1'),
    ('BCS', 'MECH2360', 'S1'),
    ('BCS', 'STAT2020', 'S2'),
    ('BCS', 'COMP3340', 'S2'),
    ('BCS', 'COMP3350', 'S1'),
    ('BCS', 'INFT3060', 'S2'),
    ('BCS', 'COMP1010', 'S1'),
    ('BCS', 'COMP1140', 'S2'),
    ('BCS', 'MATH1110', 'S1'),
    ('BCS', 'MATH1110', 'S2'),
    ('BCS', 'MATH1510', 'S2'),
    ('BCS', 'SENG1050', 'S2'),
    ('BCS', 'SENG1110', 'S1'),
    ('BCS', 'SENG1110', 'S2'),
    ('BCS', 'SENG1120', 'S1'),
    ('BCS', 'SENG1120', 'S2')
)
INSERT INTO program_course_offerings (program_id, course_id, term_code)
SELECT program.id, course.id, offering_data.term_code
FROM offering_data
JOIN programs program ON program.code = offering_data.program_code
JOIN courses course ON course.code = offering_data.course_code;

DELETE FROM course_rule_items
WHERE group_id IN (
  SELECT group_row.id
  FROM course_rule_groups group_row
  JOIN courses course ON course.id = group_row.course_id
  LEFT JOIN programs program ON program.id = group_row.program_id
  WHERE (
    group_row.program_id IS NULL
    AND course.code = 'SENG1120'
    AND group_row.rule_category = 'assumed_knowledge'
  ) OR (
    program.code = 'BIT'
    AND course.code IN ('SENG2130', 'SENG2260', 'INFT2150', 'INFT2031')
    AND group_row.rule_category = 'assumed_knowledge'
  )
);

DELETE FROM course_rule_groups
WHERE id IN (
  SELECT group_row.id
  FROM course_rule_groups group_row
  JOIN courses course ON course.id = group_row.course_id
  LEFT JOIN programs program ON program.id = group_row.program_id
  WHERE (
    group_row.program_id IS NULL
    AND course.code = 'SENG1120'
    AND group_row.rule_category = 'assumed_knowledge'
  ) OR (
    program.code = 'BIT'
    AND course.code IN ('SENG2130', 'SENG2260', 'INFT2150', 'INFT2031')
    AND group_row.rule_category = 'assumed_knowledge'
  )
);

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, NULL, 'assumed_knowledge', 'any_of', 1, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses course
WHERE course.code = 'SENG1120';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG1120'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.program_id IS NULL
  AND group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG1120'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.program_id IS NULL
  AND group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, program.id, 'assumed_knowledge', 'all_of', 1, 'SENG1050 Web Technologies'
FROM courses course
JOIN programs program ON program.code = 'BIT'
WHERE course.code = 'SENG2130';

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, program.id, 'assumed_knowledge', 'any_of', 2, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses course
JOIN programs program ON program.code = 'BIT'
WHERE course.code = 'SENG2130';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses required_course ON required_course.code = 'SENG1050'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 2;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 2;

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, program.id, 'assumed_knowledge', 'all_of', 1, 'SENG1050 Web Technologies'
FROM courses course
JOIN programs program ON program.code = 'BIT'
WHERE course.code = 'SENG2260';

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, program.id, 'assumed_knowledge', 'any_of', 2, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses course
JOIN programs program ON program.code = 'BIT'
WHERE course.code = 'SENG2260';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2260'
JOIN courses required_course ON required_course.code = 'SENG1050'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2260'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 2;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2260'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 2;

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, program.id, 'assumed_knowledge', 'any_of', 1, 'COMP1010 Computing Fundamentals or COMP1140 Database and Information Management'
FROM courses course
JOIN programs program ON program.code = 'BIT'
WHERE course.code = 'INFT2150';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2150'
JOIN courses required_course ON required_course.code = 'COMP1010'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2150'
JOIN courses required_course ON required_course.code = 'COMP1140'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, program_id, rule_category, logic_type, group_order, note)
SELECT course.id, program.id, 'assumed_knowledge', 'any_of', 1, 'SENG1050 Web Technologies or INFT1004 Introduction to Programming'
FROM courses course
JOIN programs program ON program.code = 'BIT'
WHERE course.code = 'INFT2031';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2031'
JOIN courses required_course ON required_course.code = 'SENG1050'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN programs program ON program.id = group_row.program_id AND program.code = 'BIT'
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2031'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge'
  AND group_row.group_order = 1;
