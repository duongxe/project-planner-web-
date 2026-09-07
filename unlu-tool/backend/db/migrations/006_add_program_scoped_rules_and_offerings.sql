PRAGMA foreign_keys = ON;

ALTER TABLE course_rule_groups
ADD COLUMN program_id INTEGER REFERENCES programs(id);

CREATE INDEX IF NOT EXISTS idx_course_rule_groups_program_id
ON course_rule_groups(program_id);

CREATE TABLE IF NOT EXISTS program_course_offerings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  term_code TEXT NOT NULL CHECK (term_code IN ('S1', 'S2', 'SUMMER')),
  UNIQUE (program_id, course_id, term_code),
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_program_course_offerings_program_id
ON program_course_offerings(program_id);

CREATE INDEX IF NOT EXISTS idx_program_course_offerings_course_id
ON program_course_offerings(course_id);
