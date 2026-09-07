import { Router } from "express";
import { parsePlannerMessage } from "../services/ollamaProvider.js";
import { applyPlannerIntent } from "../services/plannerChatService.js";

function validatePlannerChatBody(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return ["Request body is required."];
  }

  if (body.studentId === undefined || body.studentId === null || body.studentId === "") {
    errors.push("studentId is required.");
  }

  if (!body.currentPlan || typeof body.currentPlan !== "object" || Array.isArray(body.currentPlan)) {
    errors.push("currentPlan must be an object.");
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    errors.push("message must be a non-empty string.");
  }

  return errors;
}

export function createPlannerChatRoutes({ studyPlanService } = {}) {
  const router = Router();

  router.post("/planner/chat", async (req, res) => {
    try {
      const validationErrors = validatePlannerChatBody(req.body);
      if (validationErrors.length) {
        throw new Error(validationErrors.join(" "));
      }

      const { studentId, currentPlan, message } = req.body;
      const parsedIntent = {
        ...(await parsePlannerMessage(message)),
        rawText: message
      };
      const result = await applyPlannerIntent({
        studentId,
        currentPlan,
        parsedIntent,
        plannerServices: { studyPlanService }
      });

      res.json({
        ok: true,
        parsedIntent,
        ...result
      });
    } catch (error) {
      console.error("Planner chat route failed:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "Planner chat failed"
      });
    }
  });

  return router;
}
