PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS saved_study_plans_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  start_term TEXT NOT NULL CHECK (start_term IN ('S1', 'S2')),
  start_year INTEGER NOT NULL CHECK (start_year >= 2000),
  max_courses_per_term INTEGER NOT NULL CHECK (max_courses_per_term BETWEEN 1 AND 6),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student_profiles(id)
);

INSERT INTO saved_study_plans_new (
  id,
  student_id,
  start_term,
  start_year,
  max_courses_per_term,
  created_at,
  updated_at
)
SELECT
  id,
  student_id,
  start_term,
  start_year,
  max_courses_per_term,
  created_at,
  updated_at
FROM saved_study_plans;

DROP TABLE saved_study_plans;
ALTER TABLE saved_study_plans_new RENAME TO saved_study_plans;

CREATE INDEX IF NOT EXISTS idx_saved_study_plans_student_id
  ON saved_study_plans(student_id);

PRAGMA foreign_keys = ON;
