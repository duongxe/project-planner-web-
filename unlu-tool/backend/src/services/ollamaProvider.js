const OLLAMA_CHAT_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL = "gemma3";
const REQUEST_TIMEOUT_MS = 30000;

const PLANNER_INTENT_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "reduce_term_load",
        "move_course_request",
        "what_if_adjustment",
        "unknown"
      ]
    },
    year: { type: ["integer", "null"] },
    termCode: {
      type: ["string", "null"],
      enum: ["S1", "S2", "T1", "T2", "T3", null]
    },
    courseCode: { type: ["string", "null"] },
    constraints: {
      type: "object",
      properties: {
        maxCourses: { type: ["integer", "null"] },
        avoidMultipleHardCourses: { type: ["boolean", "null"] },
        preferBalancedLoad: { type: ["boolean", "null"] },
        workStatus: {
          type: ["string", "null"],
          enum: ["part_time", "full_time", "free", null]
        }
      },
      required: [
        "maxCourses",
        "avoidMultipleHardCourses",
        "preferBalancedLoad",
        "workStatus"
      ]
    },
    reasoningText: { type: "string" }
  },
  required: [
    "intent",
    "year",
    "termCode",
    "courseCode",
    "constraints",
    "reasoningText"
  ]
};

const SYSTEM_PROMPT = `You are an academic planner intent parser.

Your only job is to convert a student's English request into structured JSON.

Rules:
- Do not generate a study plan.
- Do not explain prerequisites.
- Do not invent any course data.
- Only extract the user's request into the required schema.
- If some information is missing, use null.
- Always return valid JSON only.
- Supported intents are:
  reduce_term_load, move_course_request, what_if_adjustment, unknown`;

function ensureFetchAvailable() {
  if (typeof fetch !== "function") {
    throw new Error("Ollama provider requires a Node.js runtime with global fetch support.");
  }
}

function buildPlannerMessages(message) {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: `Student message: "${String(message ?? "")}"`
    }
  ];
}

function parseJsonContent(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    throw new Error("Ollama returned empty planner intent content.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`Ollama returned invalid planner intent JSON: ${error.message}`);
  }
}

function isIntegerOrNull(value) {
  return value === null || Number.isInteger(value);
}

function isStringOrNull(value) {
  return value === null || typeof value === "string";
}

function isBooleanOrNull(value) {
  return value === null || typeof value === "boolean";
}

function validatePlannerIntent(intentPayload) {
  const errors = [];
  const validIntents = new Set([
    "reduce_term_load",
    "move_course_request",
    "what_if_adjustment",
    "unknown"
  ]);
  const validTermCodes = new Set(["S1", "S2", "T1", "T2", "T3", null]);
  const validWorkStatuses = new Set(["part_time", "full_time", "free", null]);
  const requiredFields = [
    "intent",
    "year",
    "termCode",
    "courseCode",
    "constraints",
    "reasoningText"
  ];

  if (!intentPayload || typeof intentPayload !== "object" || Array.isArray(intentPayload)) {
    throw new Error("Ollama planner intent JSON must be an object.");
  }

  for (const field of requiredFields) {
    if (!(field in intentPayload)) {
      errors.push(`Missing required field: ${field}.`);
    }
  }

  if (!validIntents.has(intentPayload.intent)) {
    errors.push("intent must be one of reduce_term_load, move_course_request, what_if_adjustment, unknown.");
  }
  if (!isIntegerOrNull(intentPayload.year)) {
    errors.push("year must be an integer or null.");
  }
  if (!validTermCodes.has(intentPayload.termCode)) {
    errors.push("termCode must be one of S1, S2, T1, T2, T3, or null.");
  }
  if (!isStringOrNull(intentPayload.courseCode)) {
    errors.push("courseCode must be a string or null.");
  }
  if (typeof intentPayload.reasoningText !== "string") {
    errors.push("reasoningText must be a string.");
  }

  const constraints = intentPayload.constraints;
  if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
    errors.push("constraints must be an object.");
  } else {
    for (const field of ["maxCourses", "avoidMultipleHardCourses", "preferBalancedLoad", "workStatus"]) {
      if (!(field in constraints)) {
        errors.push(`Missing required constraints field: ${field}.`);
      }
    }
    if (!isIntegerOrNull(constraints.maxCourses)) {
      errors.push("constraints.maxCourses must be an integer or null.");
    }
    if (!isBooleanOrNull(constraints.avoidMultipleHardCourses)) {
      errors.push("constraints.avoidMultipleHardCourses must be a boolean or null.");
    }
    if (!isBooleanOrNull(constraints.preferBalancedLoad)) {
      errors.push("constraints.preferBalancedLoad must be a boolean or null.");
    }
    if (!validWorkStatuses.has(constraints.workStatus)) {
      errors.push("constraints.workStatus must be part_time, full_time, free, or null.");
    }
  }

  if (errors.length) {
    throw new Error(`Ollama returned planner intent JSON that does not match the schema: ${errors.join(" ")}`);
  }

  return intentPayload;
}

function getResponseContent(responseBody) {
  const content = responseBody?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Ollama response did not include non-empty message.content.");
  }
  return content;
}

/**
 * Parses a student's planner request into structured intent JSON using Ollama.
 *
 * @param {string} message
 * @returns {Promise<object>}
 */
export async function parsePlannerMessage(message) {
  ensureFetchAvailable();

  const trimmedMessage = String(message ?? "").trim();
  if (!trimmedMessage) {
    throw new Error("parsePlannerMessage requires a non-empty student message.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: "10m",
        format: PLANNER_INTENT_SCHEMA,
        messages: buildPlannerMessages(trimmedMessage)
      }),
      signal: controller.signal
    });

    const responseText = await response.text();
    let responseBody = null;

    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw new Error(`Ollama returned non-JSON response with status ${response.status}.`);
    }

    if (!response.ok) {
      const detail = responseBody?.error || responseText || `HTTP ${response.status}`;
      throw new Error(`Ollama planner intent request failed: ${detail}`);
    }

    return validatePlannerIntent(parseJsonContent(getResponseContent(responseBody)));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Ollama planner intent request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }

    throw error instanceof Error
      ? error
      : new Error(`Ollama planner intent request failed: ${String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}
