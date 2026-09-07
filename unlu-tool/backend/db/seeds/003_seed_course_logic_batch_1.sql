PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO courses (code, name, units, level)
VALUES ('COMP6240', 'Referenced external course COMP6240', 10, 6000);

DELETE FROM course_rule_items
WHERE group_id IN (
  SELECT group_row.id
  FROM course_rule_groups group_row
  JOIN courses course ON course.id = group_row.course_id
  WHERE course.code IN (
    'COMP2230',
    'COMP2240',
    'COMP2270',
    'SENG2130',
    'SENG2250',
    'COMP3851A',
    'COMP3851B',
    'INFT3800',
    'SENG4500',
    'COMP3330',
    'INFT2060',
    'COMP3340'
  )
);

DELETE FROM course_rule_groups
WHERE course_id IN (
  SELECT id
  FROM courses
  WHERE code IN (
    'COMP2230',
    'COMP2240',
    'COMP2270',
    'SENG2130',
    'SENG2250',
    'COMP3851A',
    'COMP3851B',
    'INFT3800',
    'SENG4500',
    'COMP3330',
    'INFT2060',
    'COMP3340'
  )
);

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'SENG1120 Data Structures and MATH1510 Discrete Mathematics'
FROM courses
WHERE code = 'COMP2230';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP2230'
JOIN courses required_course ON required_course.code = 'SENG1120'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP2230'
JOIN courses required_course ON required_course.code = 'MATH1510'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'SENG1120 Data Structures'
FROM courses
WHERE code = 'COMP2240';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP2240'
JOIN courses required_course ON required_course.code = 'SENG1120'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'MATH1510 Discrete Mathematics and SENG1120 Data Structures'
FROM courses
WHERE code = 'COMP2270';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP2270'
JOIN courses required_course ON required_course.code = 'MATH1510'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP2270'
JOIN courses required_course ON required_course.code = 'SENG1120'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses
WHERE code = 'SENG2130';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses
WHERE code = 'SENG2250';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2250'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2250'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'prerequisite', 'all_of', 1, 'Successful completion of at least 140 units of study'
FROM courses
WHERE code = 'COMP3851A';

INSERT INTO course_rule_items (group_id, item_type, item_order, minimum_units)
SELECT group_row.id, 'minimum_units', 1, 140
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3851A'
WHERE group_row.rule_category = 'prerequisite' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'prerequisite', 'all_of', 1, 'Successful completion of COMP3851A'
FROM courses
WHERE code = 'COMP3851B';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3851B'
JOIN courses required_course ON required_course.code = 'COMP3851A'
WHERE group_row.rule_category = 'prerequisite' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'SENG2130 Systems Analysis and Design or INFT2150 ICT Business Analysis'
FROM courses
WHERE code = 'INFT3800';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT3800'
JOIN courses required_course ON required_course.code = 'SENG2130'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT3800'
JOIN courses required_course ON required_course.code = 'INFT2150'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 2, 'Students must have successfully completed at least 100 units to enrol in this course'
FROM courses
WHERE code = 'INFT3800';

INSERT INTO course_rule_items (group_id, item_type, item_order, minimum_units)
SELECT group_row.id, 'minimum_units', 1, 100
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT3800'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'COMP2240 Operating Systems or COMP6240'
FROM courses
WHERE code = 'SENG4500';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG4500'
JOIN courses required_course ON required_course.code = 'COMP2240'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG4500'
JOIN courses required_course ON required_course.code = 'COMP6240'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'MATH1110 Mathematics for Engineering, Science and Technology 1'
FROM courses
WHERE code = 'COMP3330';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3330'
JOIN courses required_course ON required_course.code = 'MATH1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 2, 'INFT1004 Introduction to Programming or SENG1110 Object Oriented Programming'
FROM courses
WHERE code = 'COMP3330';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3330'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3330'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'INFT1004 Introduction to Programming or SENG1110 Object Oriented Programming'
FROM courses
WHERE code = 'INFT2060';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2060'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2060'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'MATH1510 Discrete Mathematics or SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses
WHERE code = 'COMP3340';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3340'
JOIN courses required_course ON required_course.code = 'MATH1510'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3340'
JOIN courses required_course ON required_course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 3, required_course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3340'
JOIN courses required_course ON required_course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;
