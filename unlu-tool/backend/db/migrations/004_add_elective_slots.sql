PRAGMA foreign_keys = ON;

INSERT INTO courses (code, name, units, level)
SELECT 'ELEC-01', 'Elective Slot 1', 10, 1000
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE code = 'ELEC-01'
);

INSERT INTO courses (code, name, units, level)
SELECT 'ELEC-02', 'Elective Slot 2', 10, 1000
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE code = 'ELEC-02'
);

INSERT INTO courses (code, name, units, level)
SELECT 'ELEC-03', 'Elective Slot 3', 10, 1000
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE code = 'ELEC-03'
);

INSERT INTO courses (code, name, units, level)
SELECT 'ELEC-04', 'Elective Slot 4', 10, 1000
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE code = 'ELEC-04'
);
