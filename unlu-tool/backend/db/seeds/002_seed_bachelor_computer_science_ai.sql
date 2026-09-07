PRAGMA foreign_keys = ON;

INSERT INTO programs (code, name, total_units)
VALUES ('BCS', 'Bachelor of Computer Science', 240);

INSERT INTO majors (program_id, code, name, total_units)
SELECT program.id, 'AI', 'Artificial Intelligence', 80
FROM programs program
WHERE program.code = 'BCS';

INSERT INTO program_requirement_blocks (program_id, code, name, required_units, display_order)
SELECT program.id, 'CORE', 'Program Core', 160, 1
FROM programs program
WHERE program.code = 'BCS';

INSERT INTO program_requirement_blocks (program_id, code, name, required_units, display_order)
SELECT program.id, 'ELECTIVES', 'Electives', 20, 2
FROM programs program
WHERE program.code = 'BCS';

INSERT INTO major_requirement_blocks (major_id, code, name, required_units, display_order)
SELECT major.id, 'COMPULSORY', 'Artificial Intelligence Compulsory', 60, 1
FROM majors major
JOIN programs program ON program.id = major.program_id
WHERE program.code = 'BCS' AND major.code = 'AI';

INSERT INTO major_requirement_blocks (major_id, code, name, required_units, display_order)
SELECT major.id, 'OPTIONS', 'Artificial Intelligence Approved Option Slots', 20, 2
FROM majors major
JOIN programs program ON program.id = major.program_id
WHERE program.code = 'BCS' AND major.code = 'AI';

INSERT INTO program_level_rules (program_id, level, rule_operator, units, display_order)
SELECT program.id, 1000, 'max', 100, 1
FROM programs program
WHERE program.code = 'BCS';

INSERT INTO program_level_rules (program_id, level, rule_operator, units, display_order)
SELECT program.id, 2000, 'min', 40, 2
FROM programs program
WHERE program.code = 'BCS';

INSERT INTO program_level_rules (program_id, level, rule_operator, units, display_order)
SELECT program.id, 3000, 'min', 40, 3
FROM programs program
WHERE program.code = 'BCS';

INSERT OR IGNORE INTO courses (code, name, units, level) VALUES
('COMP1010', 'Computing Fundamentals', 10, 1000),
('COMP1140', 'Database and Information Management', 10, 1000),
('COMP2230', 'Algorithms', 10, 2000),
('COMP2240', 'Operating Systems', 10, 2000),
('COMP2270', 'Theory of Computation', 10, 2000),
('COMP3851A', 'Computing and Information Sciences Work Integrated Learning Part A', 10, 3000),
('COMP3851B', 'Computing and Information Sciences Work Integrated Learning Part B', 10, 3000),
('INFT3800', 'Professional Practice in IT', 10, 3000),
('MATH1110', 'Mathematics for Engineering, Science and Technology 1', 10, 1000),
('MATH1120', 'Mathematics for Engineering, Science and Technology 2', 10, 1000),
('MATH1510', 'Discrete Mathematics', 10, 1000),
('MATH2340', 'Linearity and Continuity 1', 10, 2000),
('MECH2360', 'Dynamics of Machines', 10, 2000),
('STAT2020', 'Predictive Analytics', 10, 2000),
('SENG1050', 'Web Technologies', 10, 1000),
('SENG1110', 'Object Oriented Programming', 10, 1000),
('SENG1120', 'Data Structures', 10, 1000),
('SENG2130', 'Systems Analysis and Design', 10, 2000),
('SENG2250', 'System and Network Security', 10, 2000),
('SENG4500', 'Network and Distributed Computing', 10, 4000),
('COMP3330', 'Machine Intelligence', 10, 3000),
('COMP3340', 'Data Mining', 10, 3000),
('COMP3370', 'Computer Vision and Graphics', 10, 3000),
('COMP3930', 'Advanced Machine Learning', 10, 3000),
('INFT2060', 'Applied Artificial Intelligence', 10, 2000),
('INFT3060', 'Cloud Computing', 10, 3000),
('AIOPT-01', 'AI Major Option Slot 1 (see approved option list)', 10, 2000),
('AIOPT-02', 'AI Major Option Slot 2 (see approved option list)', 10, 3000);

INSERT INTO program_block_courses (program_block_id, course_id)
SELECT block.id, course.id
FROM program_requirement_blocks block
JOIN programs program ON program.id = block.program_id
JOIN courses course ON course.code IN (
  'COMP1010',
  'COMP1140',
  'COMP2230',
  'COMP2240',
  'COMP2270',
  'COMP3851A',
  'COMP3851B',
  'INFT3800',
  'MATH1110',
  'MATH1510',
  'SENG1050',
  'SENG1110',
  'SENG1120',
  'SENG2130',
  'SENG2250',
  'SENG4500'
)
WHERE program.code = 'BCS' AND block.code = 'CORE';

INSERT INTO major_block_courses (major_block_id, course_id, counts_from_core)
SELECT block.id, course.id,
  CASE
    WHEN course.code IN ('MATH1510', 'COMP2230') THEN 1
    ELSE 0
  END
FROM major_requirement_blocks block
JOIN majors major ON major.id = block.major_id
JOIN programs program ON program.id = major.program_id
JOIN courses course ON course.code IN (
  'MATH1120',
  'MATH1510',
  'COMP2230',
  'COMP3330',
  'COMP3370',
  'COMP3930'
)
WHERE program.code = 'BCS' AND major.code = 'AI' AND block.code = 'COMPULSORY';

INSERT INTO major_block_courses (major_block_id, course_id, counts_from_core)
SELECT block.id, course.id, 0
FROM major_requirement_blocks block
JOIN majors major ON major.id = block.major_id
JOIN programs program ON program.id = major.program_id
JOIN courses course ON course.code IN ('AIOPT-01', 'AIOPT-02')
WHERE program.code = 'BCS' AND major.code = 'AI' AND block.code = 'OPTIONS';

INSERT INTO major_block_option_courses (major_block_id, course_id)
SELECT block.id, course.id
FROM major_requirement_blocks block
JOIN majors major ON major.id = block.major_id
JOIN programs program ON program.id = major.program_id
JOIN courses course ON course.code IN (
  'INFT2060',
  'MATH2340',
  'MECH2360',
  'STAT2020',
  'COMP3340',
  'COMP3350',
  'INFT3060'
)
WHERE program.code = 'BCS' AND major.code = 'AI' AND block.code = 'OPTIONS';

INSERT INTO student_profiles (student_number, name, selected_program_id, selected_major_id)
SELECT 'c0000003', 'Demo Computer Science AI', program.id, major.id
FROM programs program
JOIN majors major ON major.program_id = program.id
WHERE program.code = 'BCS' AND major.code = 'AI';
