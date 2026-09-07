PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS saved_study_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE,
  start_term TEXT NOT NULL CHECK (start_term IN ('S1', 'S2')),
  start_year INTEGER NOT NULL CHECK (start_year >= 2000),
  max_courses_per_term INTEGER NOT NULL CHECK (max_courses_per_term BETWEEN 1 AND 6),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student_profiles(id)
);

CREATE TABLE IF NOT EXISTS saved_study_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  study_plan_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2000),
  term TEXT NOT NULL CHECK (term IN ('S1', 'S2')),
  display_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE (study_plan_id, course_id),
  FOREIGN KEY (study_plan_id) REFERENCES saved_study_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_saved_study_plans_student_id
  ON saved_study_plans(student_id);

CREATE INDEX IF NOT EXISTS idx_saved_study_plan_items_plan_id
  ON saved_study_plan_items(study_plan_id);
