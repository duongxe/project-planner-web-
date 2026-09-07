import { Router } from "express";
import { parseId } from "../validators/commonValidators.js";

export function createMajorRoutes({ catalogService }) {
  const router = Router();

  router.get("/majors/:id", (req, res) => {
    const majorId = parseId(req.params.id, "majorId");
    res.json({ ok: true, data: catalogService.getMajorById(majorId) });
  });

  return router;
}
