import cors from "cors";
import express from "express";
import { ProgramRepository } from "./repositories/programRepository.js";
import { RequirementRepository } from "./repositories/requirementRepository.js";
import { CourseRepository } from "./repositories/courseRepository.js";
import { RuleRepository } from "./repositories/ruleRepository.js";
import { StudentRepository } from "./repositories/studentRepository.js";
import { StudyPlanRepository } from "./repositories/studyPlanRepository.js";
import { CatalogService } from "./services/catalogService.js";
import { RuleEngineService } from "./services/ruleEngineService.js";
import { ProgressService } from "./services/progressService.js";
import { StudyPlanService } from "./services/studyPlanService.js";
import { MajorOptionService } from "./services/majorOptionService.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createProgramRoutes } from "./routes/programRoutes.js";
import { createMajorRoutes } from "./routes/majorRoutes.js";
import { createCourseRoutes } from "./routes/courseRoutes.js";
import { createStudentRoutes } from "./routes/studentRoutes.js";
import { createPlannerChatRoutes } from "./routes/plannerChatRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp({ db, projectRoot }) {
  const programRepository = new ProgramRepository(db);
  const requirementRepository = new RequirementRepository(db);
  const courseRepository = new CourseRepository(db);
  const ruleRepository = new RuleRepository(db);
  const studentRepository = new StudentRepository(db);
  const studyPlanRepository = new StudyPlanRepository(db);

  const catalogService = new CatalogService({
    programRepository,
    requirementRepository,
    courseRepository,
    ruleRepository
  });

  const ruleEngineService = new RuleEngineService({
    studentRepository,
    catalogService,
    ruleRepository
  });

  const progressService = new ProgressService({ ruleEngineService, courseRepository });
  const studyPlanService = new StudyPlanService({
    ruleEngineService,
    progressService,
    studyPlanRepository
  });
  const majorOptionService = new MajorOptionService({
    studentRepository,
    catalogService,
    studyPlanRepository
  });

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(projectRoot));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", createAuthRoutes({ studentRepository }));
  app.use("/api", createProgramRoutes({ catalogService }));
  app.use("/api", createMajorRoutes({ catalogService }));
  app.use("/api", createCourseRoutes({ catalogService }));
  app.use("/api", createPlannerChatRoutes({ studyPlanService }));
  app.use(
    "/api",
    createStudentRoutes({
      progressService,
      studyPlanService,
      studentRepository,
      majorOptionService
    })
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
