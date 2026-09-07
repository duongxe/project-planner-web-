PRAGMA foreign_keys = ON;

INSERT INTO programs (code, name, total_units)
VALUES ('BIT', 'Bachelor of Information Technology', 240);

INSERT INTO majors (program_id, code, name, total_units)
SELECT id, 'ICTBA', 'ICT Business Analytics', 80
FROM programs
WHERE code = 'BIT';

INSERT INTO program_requirement_blocks (program_id, code, name, required_units, display_order)
SELECT id, 'CORE', 'Program Core', 140, 1
FROM programs
WHERE code = 'BIT';

INSERT INTO program_requirement_blocks (program_id, code, name, required_units, display_order)
SELECT id, 'ELECTIVES', 'Electives', 40, 2
FROM programs
WHERE code = 'BIT';

INSERT INTO major_requirement_blocks (major_id, code, name, required_units, display_order)
SELECT id, 'COMPULSORY', 'ICT Business Analytics Compulsory', 80, 1
FROM majors
WHERE code = 'ICTBA';

INSERT INTO program_level_rules (program_id, level, rule_operator, units, display_order)
SELECT id, 1000, 'max', 100, 1
FROM programs
WHERE code = 'BIT';

INSERT INTO program_level_rules (program_id, level, rule_operator, units, display_order)
SELECT id, 2000, 'min', 40, 2
FROM programs
WHERE code = 'BIT';

INSERT INTO program_level_rules (program_id, level, rule_operator, units, display_order)
SELECT id, 3000, 'min', 60, 3
FROM programs
WHERE code = 'BIT';

INSERT INTO courses (code, name, units, level) VALUES
('COMP1010', 'Computing Fundamentals', 10, 1000),
('COMP1140', 'Database and Information Management', 10, 1000),
('INFT1060', 'Cybersecurity Fundamentals', 10, 1000),
('SENG1050', 'Web Technologies', 10, 1000),
('SENG1110', 'Object Oriented Programming', 10, 1000),
('INFT2031', 'Systems and Network Administration', 10, 2000),
('INFT2060', 'Applied Artificial Intelligence', 10, 2000),
('INFT2150', 'ICT Business Analysis', 10, 2000),
('SENG2130', 'Systems Analysis and Design', 10, 2000),
('SENG2260', 'Human-Computer Interaction', 10, 2000),
('COMP3851A', 'Computing and Information Sciences Work Integrated Learning Part A', 10, 3000),
('COMP3851B', 'Computing and Information Sciences Work Integrated Learning Part B', 10, 3000),
('INFT3100', 'ICT Project Management', 10, 3000),
('INFT3800', 'Professional Practice in IT', 10, 3000),
('INFT1004', 'Introduction to Programming', 10, 1000),
('STAT1060', 'Business Decision Making', 10, 1000),
('BUSA2001', 'Big Data Analytics', 10, 2000),
('BUSA2002', 'Data Visualisation for Decision Makers in Business', 10, 2000),
('COMP3350', 'Advanced Database', 10, 3000),
('EBUS3040', 'Business Intelligence in Practice', 10, 3000),
('INFT1001', 'Referenced external course INFT1001', 10, 1000),
('INFT1150', 'Referenced external course INFT1150', 10, 1000),
('INFT2040', 'Referenced external course INFT2040', 10, 2000),
('INFT6031', 'Referenced external course INFT6031', 10, 6000),
('INFT3150', 'Referenced external course INFT3150', 10, 3000),
('BUSA1001', 'Introduction to Business Information Systems', 10, 1000),
('ECON1003', 'Referenced external course ECON1003', 10, 1000);

INSERT INTO program_block_courses (program_block_id, course_id)
SELECT block.id, course.id
FROM program_requirement_blocks block
JOIN courses course ON course.code IN (
  'COMP1010',
  'COMP1140',
  'INFT1060',
  'SENG1050',
  'SENG1110',
  'INFT2031',
  'INFT2060',
  'INFT2150',
  'SENG2130',
  'SENG2260',
  'COMP3851A',
  'COMP3851B',
  'INFT3100',
  'INFT3800'
)
WHERE block.code = 'CORE';

INSERT INTO major_block_courses (major_block_id, course_id, counts_from_core)
SELECT block.id, course.id,
  CASE
    WHEN course.code IN ('COMP3851A', 'COMP3851B') THEN 1
    ELSE 0
  END
FROM major_requirement_blocks block
JOIN courses course ON course.code IN (
  'INFT1004',
  'STAT1060',
  'BUSA2001',
  'BUSA2002',
  'COMP3350',
  'COMP3851A',
  'COMP3851B',
  'EBUS3040'
)
WHERE block.code = 'COMPULSORY';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'exclusion', 'any_of', 1, 'Not available to students who have completed INFT1001 or INFT1150.'
FROM courses
WHERE code = 'COMP1010';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP1010'
JOIN courses course ON course.code = 'INFT1001'
WHERE group_row.rule_category = 'exclusion';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP1010'
JOIN courses course ON course.code = 'INFT1150'
WHERE group_row.rule_category = 'exclusion';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'exclusion', 'any_of', 1, 'Not available to students who have completed INFT2040.'
FROM courses
WHERE code = 'COMP1140';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP1140'
JOIN courses course ON course.code = 'INFT2040'
WHERE group_row.rule_category = 'exclusion';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'exclusion', 'any_of', 1, 'Not available to students who have completed INFT6031.'
FROM courses
WHERE code = 'INFT2031';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2031'
JOIN courses course ON course.code = 'INFT6031'
WHERE group_row.rule_category = 'exclusion';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'exclusion', 'any_of', 1, 'Not available to students who have completed INFT3150.'
FROM courses
WHERE code = 'INFT2150';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2150'
JOIN courses course ON course.code = 'INFT3150'
WHERE group_row.rule_category = 'exclusion';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'INFT1004 Introduction to Programming or SENG1110 Object Oriented Programming'
FROM courses
WHERE code = 'INFT2060';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2060'
JOIN courses course ON course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2060'
JOIN courses course ON course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses
WHERE code = 'INFT2150';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2150'
JOIN courses course ON course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT2150'
JOIN courses course ON course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'SENG1050 Web Technologies'
FROM courses
WHERE code = 'SENG2130';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses course ON course.code = 'SENG1050'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 2, 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
FROM courses
WHERE code = 'SENG2130';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses course ON course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'SENG2130'
JOIN courses course ON course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'prerequisite', 'all_of', 1, 'Successful completion of at least 140 units of study'
FROM courses
WHERE code = 'COMP3851A';

INSERT INTO course_rule_items (group_id, item_type, item_order, minimum_units)
SELECT group_row.id, 'minimum_units', 1, 140
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3851A'
WHERE group_row.rule_category = 'prerequisite';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'prerequisite', 'all_of', 1, 'Successful completion of COMP3851A'
FROM courses
WHERE code = 'COMP3851B';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3851B'
JOIN courses course ON course.code = 'COMP3851A'
WHERE group_row.rule_category = 'prerequisite';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'Basic competency in Microsoft Office packages including Excel'
FROM courses
WHERE code = 'INFT3100';

INSERT INTO course_rule_items (group_id, item_type, item_order, free_text)
SELECT group_row.id, 'free_text', 1, 'Basic competency in Microsoft Office packages including Excel'
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT3100'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'SENG2130 Systems Analysis and Design or INFT2150 ICT Business Analysis'
FROM courses
WHERE code = 'INFT3800';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT3800'
JOIN courses course ON course.code = 'SENG2130'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'INFT3800'
JOIN courses course ON course.code = 'INFT2150'
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
SELECT id, 'assumed_knowledge', 'all_of', 1, 'BUSA1001 Introduction to Business Information Systems'
FROM courses
WHERE code = 'BUSA2001';

INSERT INTO course_rule_items (group_id, item_type, item_order, free_text)
SELECT group_row.id, 'free_text', 1, 'BUSA1001 Introduction to Business Information Systems'
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'BUSA2001'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 1, 'STAT1060 Business Decision Making or ECON1003 Basic Econometrics and Quantitative Modelling'
FROM courses
WHERE code = 'BUSA2002';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'BUSA2002'
JOIN courses course ON course.code = 'STAT1060'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'BUSA2002'
JOIN courses course ON course.code = 'ECON1003'
WHERE group_row.rule_category = 'assumed_knowledge';

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'all_of', 1, 'COMP1140 Database and Information Management'
FROM courses
WHERE code = 'COMP3350';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3350'
JOIN courses course ON course.code = 'COMP1140'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 1;

INSERT INTO course_rule_groups (course_id, rule_category, logic_type, group_order, note)
SELECT id, 'assumed_knowledge', 'any_of', 2, 'INFT1004 Introduction to Programming or SENG1110 Object Oriented Programming'
FROM courses
WHERE code = 'COMP3350';

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 1, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3350'
JOIN courses course ON course.code = 'INFT1004'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO course_rule_items (group_id, item_type, item_order, required_course_id)
SELECT group_row.id, 'course', 2, course.id
FROM course_rule_groups group_row
JOIN courses target ON target.id = group_row.course_id AND target.code = 'COMP3350'
JOIN courses course ON course.code = 'SENG1110'
WHERE group_row.rule_category = 'assumed_knowledge' AND group_row.group_order = 2;

INSERT INTO student_profiles (student_number, name, selected_program_id, selected_major_id)
SELECT 'c3415519', 'Tung Duong Nguyen', program.id, major.id
FROM programs program
JOIN majors major ON major.program_id = program.id
WHERE program.code = 'BIT' AND major.code = 'ICTBA';

INSERT INTO student_profiles (student_number, name, selected_program_id, selected_major_id)
SELECT 'c0000001', 'Demo Exclusion Case', program.id, major.id
FROM programs program
JOIN majors major ON major.program_id = program.id
WHERE program.code = 'BIT' AND major.code = 'ICTBA';

INSERT INTO student_profiles (student_number, name, selected_program_id, selected_major_id)
SELECT 'c0000002', 'Demo Shared Course Case', program.id, major.id
FROM programs program
JOIN majors major ON major.program_id = program.id
WHERE program.code = 'BIT' AND major.code = 'ICTBA';

INSERT INTO student_course_records (student_id, course_id, status, year, term, grade)
SELECT student.id, course.id, 'passed', 2025, 'S1', 'P'
FROM student_profiles student
JOIN courses course ON course.code IN (
  'COMP1010',
  'COMP1140',
  'SENG1050'
)
WHERE student.student_number = 'c3415519';

INSERT INTO student_course_records (student_id, course_id, status, year, term, grade)
SELECT student.id, course.id, 'passed', 2025, 'S1', 'P'
FROM student_profiles student
JOIN courses course ON course.code IN (
  'INFT1001',
  'INFT2040',
  'SENG1050',
  'INFT1004',
  'STAT1060'
)
WHERE student.student_number = 'c0000001';

INSERT INTO student_course_records (student_id, course_id, status, year, term, grade)
SELECT student.id, course.id, 'passed', 2024, 'S2', 'P'
FROM student_profiles student
JOIN courses course ON course.code IN (
  'COMP1010',
  'COMP1140',
  'INFT1060',
  'SENG1050',
  'SENG1110',
  'INFT2031',
  'INFT2060',
  'INFT2150',
  'SENG2130',
  'SENG2260',
  'INFT1004',
  'STAT1060',
  'BUSA2001',
  'BUSA2002',
  'COMP3851A',
  'COMP3851B'
)
WHERE student.student_number = 'c0000002';
