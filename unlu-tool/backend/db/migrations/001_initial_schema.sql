PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seed_history (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  total_units INTEGER NOT NULL CHECK (total_units > 0)
);

CREATE TABLE IF NOT EXISTS majors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  total_units INTEGER NOT NULL CHECK (total_units > 0),
  UNIQUE (program_id, code),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 10 CHECK (units > 0),
  level INTEGER NOT NULL CHECK (level >= 1000)
);

CREATE TABLE IF NOT EXISTS program_requirement_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  required_units INTEGER NOT NULL CHECK (required_units >= 0),
  display_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE (program_id, code),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS major_requirement_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  major_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  required_units INTEGER NOT NULL CHECK (required_units >= 0),
  display_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE (major_id, code),
  FOREIGN KEY (major_id) REFERENCES majors(id)
);

CREATE TABLE IF NOT EXISTS program_block_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_block_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  UNIQUE (program_block_id, course_id),
  FOREIGN KEY (program_block_id) REFERENCES program_requirement_blocks(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS major_block_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  major_block_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  counts_from_core INTEGER NOT NULL DEFAULT 0 CHECK (counts_from_core IN (0, 1)),
  UNIQUE (major_block_id, course_id),
  FOREIGN KEY (major_block_id) REFERENCES major_requirement_blocks(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS program_level_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1000),
  rule_operator TEXT NOT NULL CHECK (rule_operator IN ('min', 'max')),
  units INTEGER NOT NULL CHECK (units >= 0),
  display_order INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS course_rule_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  rule_category TEXT NOT NULL CHECK (rule_category IN ('prerequisite', 'assumed_knowledge', 'exclusion')),
  logic_type TEXT NOT NULL CHECK (logic_type IN ('all_of', 'any_of')),
  group_order INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS course_rule_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'minimum_units', 'free_text')),
  item_order INTEGER NOT NULL DEFAULT 1,
  required_course_id INTEGER,
  minimum_units INTEGER,
  free_text TEXT,
  FOREIGN KEY (group_id) REFERENCES course_rule_groups(id),
  FOREIGN KEY (required_course_id) REFERENCES courses(id),
  CHECK (
    (item_type = 'course' AND required_course_id IS NOT NULL)
    OR (item_type = 'minimum_units' AND minimum_units IS NOT NULL)
    OR (item_type = 'free_text' AND free_text IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  selected_program_id INTEGER NOT NULL,
  selected_major_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (selected_program_id) REFERENCES programs(id),
  FOREIGN KEY (selected_major_id) REFERENCES majors(id)
);

CREATE TABLE IF NOT EXISTS student_course_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'in_progress', 'planned')),
  year INTEGER,
  term TEXT CHECK (term IS NULL OR term IN ('S1', 'S2', 'SUMMER')),
  grade TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES student_profiles(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_majors_program_id ON majors(program_id);
CREATE INDEX IF NOT EXISTS idx_program_blocks_program_id ON program_requirement_blocks(program_id);
CREATE INDEX IF NOT EXISTS idx_major_blocks_major_id ON major_requirement_blocks(major_id);
CREATE INDEX IF NOT EXISTS idx_program_block_courses_block_id ON program_block_courses(program_block_id);
CREATE INDEX IF NOT EXISTS idx_major_block_courses_block_id ON major_block_courses(major_block_id);
CREATE INDEX IF NOT EXISTS idx_course_rule_groups_course_id ON course_rule_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_course_rule_items_group_id ON course_rule_items(group_id);
CREATE INDEX IF NOT EXISTS idx_student_course_records_student_id ON student_course_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_course_records_course_id ON student_course_records(course_id);
