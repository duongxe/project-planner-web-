PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS student_major_option_selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  slot_course_id INTEGER NOT NULL,
  selected_course_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, slot_course_id),
  FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_course_id) REFERENCES courses(id),
  FOREIGN KEY (selected_course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_student_major_option_selections_student_id
  ON student_major_option_selections(student_id);

CREATE INDEX IF NOT EXISTS idx_student_major_option_selections_slot_course_id
  ON student_major_option_selections(slot_course_id);

CREATE INDEX IF NOT EXISTS idx_student_major_option_selections_selected_course_id
  ON student_major_option_selections(selected_course_id);
