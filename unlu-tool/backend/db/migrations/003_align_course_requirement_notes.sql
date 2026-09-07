PRAGMA foreign_keys = ON;

UPDATE course_rule_groups
SET note = 'INFT1004 Introduction to Programming or SENG1110 Object Oriented Programming'
WHERE course_id = (SELECT id FROM courses WHERE code = 'INFT2060')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
WHERE course_id = (SELECT id FROM courses WHERE code = 'INFT2150')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'SENG1050 Web Technologies'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SENG2130')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'SENG1110 Object Oriented Programming or INFT1004 Introduction to Programming'
WHERE course_id = (SELECT id FROM courses WHERE code = 'SENG2130')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 2;

UPDATE course_rule_groups
SET note = 'Successful completion of at least 140 units of study'
WHERE course_id = (SELECT id FROM courses WHERE code = 'COMP3851A')
  AND rule_category = 'prerequisite';

UPDATE course_rule_groups
SET note = 'Successful completion of COMP3851A'
WHERE course_id = (SELECT id FROM courses WHERE code = 'COMP3851B')
  AND rule_category = 'prerequisite';

UPDATE course_rule_groups
SET note = 'Basic competency in Microsoft Office packages including Excel'
WHERE course_id = (SELECT id FROM courses WHERE code = 'INFT3100')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'SENG2130 Systems Analysis and Design or INFT2150 ICT Business Analysis'
WHERE course_id = (SELECT id FROM courses WHERE code = 'INFT3800')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'Students must have successfully completed at least 100 units to enrol in this course'
WHERE course_id = (SELECT id FROM courses WHERE code = 'INFT3800')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 2;

UPDATE course_rule_groups
SET note = 'BUSA1001 Introduction to Business Information Systems'
WHERE course_id = (SELECT id FROM courses WHERE code = 'BUSA2001')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'STAT1060 Business Decision Making or ECON1003 Basic Econometrics and Quantitative Modelling'
WHERE course_id = (SELECT id FROM courses WHERE code = 'BUSA2002')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'COMP1140 Database and Information Management'
WHERE course_id = (SELECT id FROM courses WHERE code = 'COMP3350')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 1;

UPDATE course_rule_groups
SET note = 'INFT1004 Introduction to Programming or SENG1110 Object Oriented Programming'
WHERE course_id = (SELECT id FROM courses WHERE code = 'COMP3350')
  AND rule_category = 'assumed_knowledge'
  AND group_order = 2;
