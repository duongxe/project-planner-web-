PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS major_block_option_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  major_block_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  UNIQUE (major_block_id, course_id),
  FOREIGN KEY (major_block_id) REFERENCES major_requirement_blocks(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_major_block_option_courses_block_id
ON major_block_option_courses(major_block_id);
