import { Router } from "express";
import { parseId } from "../validators/commonValidators.js";

export function createCourseRoutes({ catalogService }) {
  const router = Router();

  router.get("/courses/:id", (req, res) => {
    const courseId = parseId(req.params.id, "courseId");
    res.json({ ok: true, data: catalogService.getCourseById(courseId) });
  });

  return router;
}
