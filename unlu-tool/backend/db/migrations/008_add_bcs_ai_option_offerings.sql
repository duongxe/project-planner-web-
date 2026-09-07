PRAGMA foreign_keys = ON;

WITH offering_data(program_code, course_code, term_code) AS (
  VALUES
    ('BCS', 'MATH2340', 'S1'),
    ('BCS', 'MECH2360', 'S1'),
    ('BCS', 'STAT2020', 'S2'),
    ('BCS', 'COMP3350', 'S1'),
    ('BCS', 'INFT3060', 'S2')
)
INSERT OR IGNORE INTO program_course_offerings (program_id, course_id, term_code)
SELECT program.id, course.id, offering_data.term_code
FROM offering_data
JOIN programs program ON program.code = offering_data.program_code
JOIN courses course ON course.code = offering_data.course_code;
