import { Router } from "express";
import { parseId } from "../validators/commonValidators.js";

export function createProgramRoutes({ catalogService }) {
  const router = Router();

  router.get("/programs", (req, res) => {
    res.json({ ok: true, data: catalogService.getPrograms() });
  });

  router.get("/programs/:id", (req, res) => {
    const programId = parseId(req.params.id, "programId");
    res.json({ ok: true, data: catalogService.getProgramById(programId) });
  });

  return router;
}
