const TERM_SEQUENCE = { S1: 1, S2: 2 };
const COURSE_COLLECTION_KEYS = ["recommendedCourses", "courses", "courseEntries", "courseItems", "items", "courseIds"];
const MAX_PLACEMENT_TERM_SEARCH = 12;
const FALLBACK_VALIDATION_WARNING =
  "Planner validation service was not available; only basic duplicate, load, and availability checks were applied.";

function clonePlan(plan) {
  if (!plan || typeof plan !== "object") {
    return null;
  }

  return typeof structuredClone === "function"
    ? structuredClone(plan)
    : JSON.parse(JSON.stringify(plan));
}

function toInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toPositiveInteger(value) {
  const parsed = toInteger(value);
  return parsed && parsed > 0 ? parsed : null;
}

function toNonNegativeInteger(value) {
  const parsed = toInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function normalizeTermCode(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase().replace(/[\s_-]/g, "");
  if (["S1", "SEM1", "SEMESTER1", "TERM1", "1"].includes(normalized)) {
    return "S1";
  }

  if (["S2", "SEM2", "SEMESTER2", "TERM2", "2"].includes(normalized)) {
    return "S2";
  }

  return normalized || null;
}

function normalizeCourseCode(value) {
  return value === null || value === undefined
    ? null
    : String(value).trim().toUpperCase().replace(/\s+/g, "") || null;
}

function parseTermFromLabel(label) {
  const match = String(label || "").match(/(?:Semester\s*([12])|S([12]))\s+(\d{4})/i);
  return match ? { termCode: `S${match[1] || match[2]}`, year: toInteger(match[3]) } : {};
}

function getPlanTerms(plan) {
  if (Array.isArray(plan?.terms)) {
    return plan.terms;
  }
  if (Array.isArray(plan?.semesters)) {
    return plan.semesters;
  }
  if (Array.isArray(plan?.studyPlan?.terms)) {
    return plan.studyPlan.terms;
  }
  return [];
}

function getTermYear(term) {
  const fromLabel = parseTermFromLabel(term?.label);
  return toInteger(term?.year ?? term?.academicYear ?? fromLabel.year);
}

function getTermCode(term) {
  const fromLabel = parseTermFromLabel(term?.label);
  return normalizeTermCode(term?.termCode ?? term?.term ?? term?.semester ?? term?.code ?? fromLabel.termCode);
}

function getTermInfo(term) {
  return { termCode: getTermCode(term), year: getTermYear(term) };
}

function formatTermLabel(termOrInfo) {
  const termCode = getTermCode(termOrInfo) ?? normalizeTermCode(termOrInfo?.termCode);
  const year = getTermYear(termOrInfo) ?? toInteger(termOrInfo?.year);
  if (!termCode || !year) {
    return termOrInfo?.label || "selected term";
  }

  return `${termCode === "S1" ? "Semester 1" : "Semester 2"} ${year}`;
}

function compareTermInfo(left, right) {
  if (left?.year !== right?.year) {
    return (left?.year ?? 0) - (right?.year ?? 0);
  }

  return (TERM_SEQUENCE[normalizeTermCode(left?.termCode)] ?? 0) -
    (TERM_SEQUENCE[normalizeTermCode(right?.termCode)] ?? 0);
}

function getTermOrdinal(termOrInfo) {
  const termCode = getTermCode(termOrInfo) ?? normalizeTermCode(termOrInfo?.termCode);
  const year = getTermYear(termOrInfo) ?? toInteger(termOrInfo?.year);
  return termCode && year && TERM_SEQUENCE[termCode] ? year * 2 + TERM_SEQUENCE[termCode] - 1 : null;
}

function getNextTerm(termOrInfo) {
  const termCode = getTermCode(termOrInfo) ?? normalizeTermCode(termOrInfo?.termCode);
  const year = getTermYear(termOrInfo) ?? toInteger(termOrInfo?.year);
  if (!termCode || !year) {
    return null;
  }

  return termCode === "S1" ? { termCode: "S2", year } : { termCode: "S1", year: year + 1 };
}

function offsetTerm(termOrInfo, offset = 1) {
  let cursor = getTermInfo(termOrInfo);
  for (let index = 0; index < offset; index += 1) {
    cursor = getNextTerm(cursor);
    if (!cursor) {
      return null;
    }
  }
  return cursor;
}

function sortTerms(plan) {
  getPlanTerms(plan).sort((left, right) => compareTermInfo(getTermInfo(left), getTermInfo(right)));
  for (const term of getPlanTerms(plan)) {
    const termCode = getTermCode(term);
    const year = getTermYear(term);
    if (termCode && year) {
      term.termCode = termCode;
      term.year = year;
      term.label = formatTermLabel({ termCode, year });
    }
  }
}

function findTermIndex(plan, year, termCode) {
  const targetYear = toInteger(year);
  const targetTermCode = normalizeTermCode(termCode);
  return !targetYear || !targetTermCode
    ? -1
    : getPlanTerms(plan).findIndex((term) => getTermYear(term) === targetYear && getTermCode(term) === targetTermCode);
}

function getCourseCollection(term) {
  for (const key of COURSE_COLLECTION_KEYS) {
    if (Array.isArray(term?.[key])) {
      return { key, items: term[key] };
    }
  }
  return { key: null, items: [] };
}

function getPreferredCourseCollectionKey(plan) {
  const counts = new Map();
  for (const term of getPlanTerms(plan)) {
    const key = getCourseCollection(term).key;
    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts.size ? [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0] : "recommendedCourses";
}

function ensureCourseCollection(term, plan) {
  const existing = getCourseCollection(term);
  if (existing.key) {
    return existing;
  }

  const key = getPreferredCourseCollectionKey(plan);
  term[key] = [];
  return { key, items: term[key] };
}

function unwrapCourseEntry(entry) {
  return entry && typeof entry === "object" && entry.course && typeof entry.course === "object" ? entry.course : entry;
}

function getCourseId(entry) {
  if (typeof entry === "number") {
    return entry;
  }

  const course = unwrapCourseEntry(entry);
  return toInteger(course?.id ?? course?.courseId ?? course?.course_id ?? entry?.courseId ?? entry?.course_id);
}

function getCourseCode(entry) {
  if (typeof entry === "string") {
    return normalizeCourseCode(entry);
  }

  const course = unwrapCourseEntry(entry);
  return normalizeCourseCode(course?.code ?? course?.courseCode ?? course?.course_code ?? entry?.courseCode ?? entry?.course_code);
}

function getCourseSignature(entry) {
  return { id: getCourseId(entry), code: getCourseCode(entry) };
}

function courseMatches(entry, courseRef) {
  const signature = getCourseSignature(entry);
  const target = typeof courseRef === "object" && courseRef !== null
    ? getCourseSignature(courseRef)
    : { id: toInteger(courseRef), code: normalizeCourseCode(courseRef) };

  return Boolean(
    (target.id && signature.id && target.id === signature.id) ||
    (target.code && signature.code && target.code === signature.code)
  );
}

function describeCourseEntry(entry) {
  const code = getCourseCode(entry);
  const id = getCourseId(entry);
  return code || (id ? `#${id}` : "The selected course");
}

function findCourseInPlan(plan, courseCodeOrId) {
  const courseRef = typeof courseCodeOrId === "object" && courseCodeOrId !== null
    ? courseCodeOrId
    : { id: toInteger(courseCodeOrId), code: normalizeCourseCode(courseCodeOrId) };

  for (let termIndex = 0; termIndex < getPlanTerms(plan).length; termIndex += 1) {
    const term = getPlanTerms(plan)[termIndex];
    const collection = getCourseCollection(term);
    const courseIndex = collection.items.findIndex((entry) => courseMatches(entry, courseRef));
    if (courseIndex >= 0) {
      const entry = collection.items[courseIndex];
      return { termIndex, courseIndex, term, collectionKey: collection.key, entry, course: unwrapCourseEntry(entry) };
    }
  }

  return null;
}

function removeCourseFromTerm(term, courseIndex) {
  const items = getCourseCollection(term).items;
  return courseIndex < 0 || courseIndex >= items.length ? null : items.splice(courseIndex, 1)[0] ?? null;
}

function insertCourseIntoTerm(term, courseEntry, plan, index = null) {
  const collection = ensureCourseCollection(term, plan);
  const entry = collection.key === "courseIds" ? getCourseId(courseEntry) : courseEntry;
  if (entry === null || entry === undefined) {
    return null;
  }

  if (Number.isInteger(index) && index >= 0 && index <= collection.items.length) {
    collection.items.splice(index, 0, entry);
    return { entry, index };
  }

  collection.items.push(entry);
  return { entry, index: collection.items.length - 1 };
}

function calculateTermLoad(term) {
  return getCourseCollection(term).items.length;
}

function getPlanMaxCourses(plan) {
  return toPositiveInteger(plan?.maxCoursesPerTerm ?? plan?.maxCourses ?? plan?.studyLoad ?? plan?.constraints?.maxCourses);
}

function getRequestedMaxCourses(plan, parsedIntent, currentLoad) {
  const explicitMaxCourses = toNonNegativeInteger(parsedIntent?.constraints?.maxCourses ?? parsedIntent?.maxCourses ?? parsedIntent?.targetMaxCourses);
  if (explicitMaxCourses !== null) {
    return explicitMaxCourses;
  }

  if (isEmptyTermRequest(parsedIntent)) {
    return 0;
  }

  if (isLighterTermRequest(parsedIntent)) {
    return Math.max(0, currentLoad - 1);
  }

  return getPlanMaxCourses(plan) ?? Math.max(1, currentLoad - 1);
}

function metadataNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function collectPrerequisiteRefs(course) {
  return [
    course?.prerequisites,
    course?.prerequisiteCourses,
    course?.requiredCourses,
    course?.requires,
    course?.dependsOn
  ].flatMap(asArray);
}

function referenceMatchesCourse(reference, signature) {
  if (typeof reference === "number") {
    return Boolean(signature.id && signature.id === reference);
  }
  if (typeof reference === "string") {
    return Boolean(signature.code && signature.code === normalizeCourseCode(reference));
  }

  const referenceSignature = getCourseSignature(reference);
  return Boolean(
    (signature.id && referenceSignature.id && signature.id === referenceSignature.id) ||
    (signature.code && referenceSignature.code && signature.code === referenceSignature.code)
  );
}

function inferUnlockScore(entry, plan) {
  const course = unwrapCourseEntry(entry);
  const signature = getCourseSignature(entry);
  let score = metadataNumber(course?.unlockScore ?? course?.unlockCount ?? course?.prerequisiteUnlockCount) ?? 0;

  for (const field of [course?.unlocks, course?.prerequisiteFor, course?.dependentCourses]) {
    score += asArray(field).length;
  }

  for (const term of getPlanTerms(plan)) {
    for (const otherEntry of getCourseCollection(term).items) {
      if (!courseMatches(otherEntry, signature)) {
        const otherCourse = unwrapCourseEntry(otherEntry);
        if (collectPrerequisiteRefs(otherCourse).some((reference) => referenceMatchesCourse(reference, signature))) {
          score += 1;
        }
      }
    }
  }

  return score + (course?.isBottleneck || course?.bottleneck ? 3 : 0);
}

function getDifficultyScore(entry) {
  const course = unwrapCourseEntry(entry);
  const explicit = metadataNumber(course?.difficultyScore ?? course?.difficulty ?? course?.workloadScore ?? course?.workload);
  if (explicit !== null) {
    return explicit;
  }

  const label = String(course?.difficultyLevel ?? course?.difficulty ?? course?.workload ?? "").toLowerCase();
  if (["hard", "high", "heavy", "difficult"].some((token) => label.includes(token))) {
    return 3;
  }
  if (["medium", "moderate", "normal"].some((token) => label.includes(token))) {
    return 2;
  }
  return ["easy", "low", "light", "intro"].some((token) => label.includes(token)) ? 1 : null;
}

function getPriorityAdjustment(entry) {
  const course = unwrapCourseEntry(entry);
  const priorityRank = metadataNumber(course?.priorityRank);
  if (priorityRank !== null) {
    return priorityRank * 5;
  }

  const priorityScore = metadataNumber(course?.priorityScore ?? course?.planningPriority ?? course?.priority);
  if (priorityScore !== null) {
    return -priorityScore * 5;
  }

  const label = String(course?.priority ?? course?.priorityLevel ?? course?.requirementPriority ?? "").toLowerCase();
  if (["low", "optional", "elective", "defer"].some((token) => label.includes(token))) {
    return 25;
  }
  return ["high", "core", "required", "critical"].some((token) => label.includes(token)) ? -30 : 0;
}

function hasUsefulMetadata(entry) {
  const course = unwrapCourseEntry(entry);
  return Boolean(course && typeof course === "object" && (
    course.priority !== undefined ||
    course.priorityScore !== undefined ||
    course.priorityRank !== undefined ||
    course.planningPriority !== undefined ||
    course.difficulty !== undefined ||
    course.difficultyScore !== undefined ||
    course.workload !== undefined ||
    course.unlockScore !== undefined ||
    course.isBottleneck !== undefined ||
    course.bottleneck !== undefined ||
    course.electiveSlot !== undefined ||
    course.majorOptionSlot !== undefined ||
    course.inProgramBlocks !== undefined
  ));
}

function rankCoursesForRemoval(term, plan, constraints = {}) {
  const items = getCourseCollection(term).items;
  const anyMetadata = items.some(hasUsefulMetadata);
  const wantsLighterTerm = Boolean(constraints?.avoidMultipleHardCourses || constraints?.preferBalancedLoad || constraints?.workStatus);

  return items
    .map((entry, index) => {
      const course = unwrapCourseEntry(entry);
      const difficulty = getDifficultyScore(entry);
      const metadataScore =
        -inferUnlockScore(entry, plan) * 30 +
        getPriorityAdjustment(entry) +
        (course?.electiveSlot ? 20 : 0) +
        (course?.majorOptionSlot ? 8 : 0) -
        (Array.isArray(course?.inProgramBlocks) && course.inProgramBlocks.length ? 8 : 0) -
        (course?.sharedWithCore ? 12 : 0) +
        (wantsLighterTerm && difficulty !== null ? difficulty * 10 : 0);

      return { entry, index, score: anyMetadata ? metadataScore + index / 100 : index };
    })
    .sort((left, right) => (right.score - left.score) || (right.index - left.index));
}

function uniqueWarnings(warnings) {
  return [...new Set((warnings || []).filter(Boolean).map((warning) => String(warning)))];
}

function buildBaseImpact(overrides = {}) {
  return { graduationDelayTerms: null, targetTermReducedTo: null, ...overrides };
}

function buildNoOpResponse(summary, updatedPlan, { warnings = [], impact = {} } = {}) {
  return { summary, updatedPlan, changes: [], warnings: uniqueWarnings(warnings), impact: buildBaseImpact(impact) };
}

function buildErrorResponse(summary, updatedPlan, warnings = []) {
  return buildNoOpResponse(summary, updatedPlan, { warnings });
}

function buildChange(type, courseEntry, fromTerm, toTerm, reason = null) {
  const termSummary = (term) => term ? { year: getTermYear(term), termCode: getTermCode(term), label: formatTermLabel(term) } : null;
  return {
    type,
    courseCode: getCourseCode(courseEntry),
    courseId: getCourseId(courseEntry),
    courseLabel: describeCourseEntry(courseEntry),
    from: termSummary(fromTerm),
    to: termSummary(toTerm),
    reason
  };
}

function calculateGraduationDelayTerms(originalPlan, updatedPlan) {
  const originalOrdinals = getPlanTerms(originalPlan).map(getTermOrdinal).filter((value) => value !== null);
  const updatedOrdinals = getPlanTerms(updatedPlan).map(getTermOrdinal).filter((value) => value !== null);
  return originalOrdinals.length && updatedOrdinals.length
    ? Math.max(0, Math.max(...updatedOrdinals) - Math.max(...originalOrdinals))
    : null;
}

function extractWarningsFromError(error) {
  if (Array.isArray(error?.details) && error.details.length) {
    return error.details.map((detail) => String(detail));
  }
  if (Array.isArray(error?.errors) && error.errors.length) {
    return error.errors.map((detail) => String(detail));
  }
  return error ? [error.message || String(error)] : [];
}

function resolveStudyPlanService(currentPlan, plannerServices) {
  return (
    plannerServices?.studyPlanService ??
    plannerServices?.studyPlan ??
    currentPlan?.studyPlanService ??
    currentPlan?.services?.studyPlanService ??
    currentPlan?._services?.studyPlanService ??
    currentPlan?.plannerServices?.studyPlanService ??
    null
  );
}

function buildStudyPlanValidationPayload(plan) {
  const terms = [];
  for (const term of getPlanTerms(plan)) {
    const termCode = getTermCode(term);
    const year = getTermYear(term);
    if (!termCode || !year) {
      return null;
    }

    const courseIds = [];
    for (const entry of getCourseCollection(term).items) {
      const courseId = getCourseId(entry);
      if (!courseId) {
        return null;
      }
      courseIds.push(courseId);
    }
    terms.push({ termCode, year, courseIds });
  }

  return terms.length
    ? {
        startTerm: normalizeTermCode(plan?.startTerm) ?? terms[0].termCode,
        startYear: toInteger(plan?.startYear) ?? terms[0].year,
        maxCoursesPerTerm: getPlanMaxCourses(plan) ?? 6,
        terms
      }
    : null;
}

async function validateWithExistingPlanner({ studentId, plan, currentPlan, plannerServices, scope = "drag" }) {
  const studyPlanService = resolveStudyPlanService(currentPlan, plannerServices);
  const payload = buildStudyPlanValidationPayload(plan);
  if (!studyPlanService || typeof studyPlanService.validateStudyPlan !== "function" || !payload) {
    return { available: false, valid: true, warnings: [] };
  }

  try {
    await studyPlanService.validateStudyPlan(studentId, payload, { scope });
    return { available: true, valid: true, warnings: [] };
  } catch (error) {
    return { available: true, valid: false, warnings: extractWarningsFromError(error) };
  }
}

function validateNoDuplicateCourses(plan) {
  const seen = new Set();
  const duplicates = [];
  for (const term of getPlanTerms(plan)) {
    for (const entry of getCourseCollection(term).items) {
      const signature = getCourseSignature(entry);
      const key = signature.id ? `id:${signature.id}` : signature.code ? `code:${signature.code}` : null;
      if (key && seen.has(key)) {
        duplicates.push(describeCourseEntry(entry));
      }
      if (key) {
        seen.add(key);
      }
    }
  }
  return duplicates;
}

function validateCourseOffering(courseEntry, targetTerm) {
  const course = unwrapCourseEntry(courseEntry);
  const termCode = getTermCode(targetTerm);
  if (
    course?.hasOfferingData &&
    Array.isArray(course.offeredTerms) &&
    course.offeredTerms.length &&
    termCode &&
    !course.offeredTerms.map(normalizeTermCode).includes(termCode)
  ) {
    return `${describeCourseEntry(courseEntry)} is not offered in ${formatTermLabel(targetTerm)}.`;
  }
  return null;
}

function validateExplicitPrerequisites(plan, courseEntry, targetTerm) {
  const prerequisites = collectPrerequisiteRefs(unwrapCourseEntry(courseEntry));
  const targetOrdinal = getTermOrdinal(targetTerm);
  if (!prerequisites.length || targetOrdinal === null) {
    return [];
  }

  const before = new Set();
  const atOrAfter = new Set();
  for (const term of getPlanTerms(plan)) {
    const ordinal = getTermOrdinal(term);
    if (ordinal === null) {
      continue;
    }
    for (const entry of getCourseCollection(term).items) {
      const signature = getCourseSignature(entry);
      for (const key of [signature.id ? `id:${signature.id}` : null, signature.code ? `code:${signature.code}` : null].filter(Boolean)) {
        (ordinal < targetOrdinal ? before : atOrAfter).add(key);
      }
    }
  }

  return prerequisites.flatMap((prerequisite) => {
    const signature = getCourseSignature(prerequisite);
    const keys = [signature.id ? `id:${signature.id}` : null, signature.code ? `code:${signature.code}` : null].filter(Boolean);
    return keys.length && !keys.some((key) => before.has(key)) && keys.some((key) => atOrAfter.has(key))
      ? [`${describeCourseEntry(courseEntry)} appears to require ${describeCourseEntry(prerequisite)} before ${formatTermLabel(targetTerm)}.`]
      : [];
  });
}

async function validateCandidatePlan({ studentId, plan, currentPlan, plannerServices, movedCourse, targetTerm, targetMaxCourses = null }) {
  const existingValidation = await validateWithExistingPlanner({ studentId, plan, currentPlan, plannerServices, scope: "drag" });
  if (existingValidation.available) {
    return existingValidation;
  }

  // TODO: Wire this to StudyPlanService.validateStudyPlan from app.js when the
  // AI planner route is added. This fallback only blocks obvious invalid moves.
  const warnings = [];
  const duplicates = validateNoDuplicateCourses(plan);
  if (duplicates.length) {
    warnings.push(`A course appears more than once in the plan: ${duplicates.join(", ")}.`);
  }
  if (targetMaxCourses !== null && targetMaxCourses !== undefined && calculateTermLoad(targetTerm) > targetMaxCourses) {
    warnings.push(`${formatTermLabel(targetTerm)} would exceed ${targetMaxCourses} course(s).`);
  }

  const offeringWarning = validateCourseOffering(movedCourse, targetTerm);
  if (offeringWarning) {
    warnings.push(offeringWarning);
  }
  warnings.push(...validateExplicitPrerequisites(plan, movedCourse, targetTerm));

  return { available: false, usedFallback: true, valid: warnings.length === 0, warnings };
}

function createEmptyTermLike(plan, termInfo) {
  const termCode = normalizeTermCode(termInfo?.termCode);
  const year = toInteger(termInfo?.year);
  return { termCode, year, label: formatTermLabel({ termCode, year }), [getPreferredCourseCollectionKey(plan)]: [] };
}

function ensureTerm(plan, termInfo) {
  const existingIndex = findTermIndex(plan, termInfo?.year, termInfo?.termCode);
  if (existingIndex >= 0) {
    return { index: existingIndex, created: false, term: getPlanTerms(plan)[existingIndex] };
  }

  const termCode = normalizeTermCode(termInfo?.termCode);
  const year = toInteger(termInfo?.year);
  if (!termCode || !year) {
    return { index: -1, created: false, term: null };
  }

  getPlanTerms(plan).push(createEmptyTermLike(plan, { termCode, year }));
  sortTerms(plan);
  const index = findTermIndex(plan, year, termCode);
  return { index, created: true, term: getPlanTerms(plan)[index] };
}

function removeEmptyTerm(plan, termInfo) {
  const index = findTermIndex(plan, termInfo?.year, termInfo?.termCode);
  if (index >= 0 && calculateTermLoad(getPlanTerms(plan)[index]) === 0) {
    getPlanTerms(plan).splice(index, 1);
  }
}

function courseKey(entry) {
  const signature = getCourseSignature(entry);
  return signature.id ? `id:${signature.id}` : signature.code ? `code:${signature.code}` : null;
}

function sameTerm(left, right) {
  return getTermYear(left) === getTermYear(right) && getTermCode(left) === getTermCode(right);
}

function buildCourseLocationMap(plan) {
  const locations = new Map();
  for (const term of getPlanTerms(plan)) {
    for (const entry of getCourseCollection(term).items) {
      const key = courseKey(entry);
      if (key) {
        locations.set(key, { term: clonePlan(getTermInfo(term)), entry: clonePlan(entry) });
      }
    }
  }
  return locations;
}

function getSuffixTerms(plan, startTerm) {
  const startInfo = getTermInfo(startTerm);
  return getPlanTerms(plan)
    .filter((term) => compareTermInfo(getTermInfo(term), startInfo) >= 0)
    .sort((left, right) => compareTermInfo(getTermInfo(left), getTermInfo(right)));
}

function getReflowCourseQueue(plan, startTerm, options = {}) {
  const suffixTerms = getSuffixTerms(plan, startTerm);
  const excludedFromStart = new Set(options.excludeFromStartCourseKeys || []);
  const queue = [];

  for (const term of suffixTerms) {
    const items = [...getCourseCollection(term).items];
    const orderedItems = sameTerm(term, startTerm)
      ? rankCoursesForRemoval(term, plan, options.constraints || {}).sort((left, right) => (left.score - right.score) || (left.index - right.index)).map((item) => item.entry)
      : items;

    for (const entry of orderedItems) {
      queue.push({
        entry,
        originalTerm: clonePlan(getTermInfo(term)),
        disallowStartTerm: sameTerm(term, startTerm) && excludedFromStart.has(courseKey(entry))
      });
    }
  }

  return queue;
}

function clearSuffixTerms(plan, startTerm) {
  for (const term of getSuffixTerms(plan, startTerm)) {
    getCourseCollection(term).items.splice(0);
  }
}

async function canPlaceCourseInTerm({ studentId, plan, term, entry, currentPlan, plannerServices }) {
  const insertion = insertCourseIntoTerm(term, entry, plan);
  if (!insertion) {
    return false;
  }

  const validation = await validateCandidatePlan({
    studentId,
    plan,
    currentPlan,
    plannerServices,
    movedCourse: entry,
    targetTerm: term
  });

  getCourseCollection(term).items.splice(insertion.index, 1);
  return validation.valid;
}

async function reflowPlanFromTerm({
  studentId,
  plan,
  startTerm,
  startTermMaxCourses,
  currentPlan,
  plannerServices,
  excludeFromStartCourseKeys = [],
  constraints = {}
}) {
  const originalLocations = buildCourseLocationMap(plan);
  const queue = getReflowCourseQueue(plan, startTerm, { excludeFromStartCourseKeys, constraints });
  const remaining = [...queue];
  const planMaxCourses = getPlanMaxCourses(plan) ?? 4;
  const warnings = [];
  let cursor = getTermInfo(startTerm);
  let steps = 0;

  clearSuffixTerms(plan, startTerm);

  while (remaining.length && steps < MAX_PLACEMENT_TERM_SEARCH + getPlanTerms(plan).length + 8) {
    const ensuredTerm = ensureTerm(plan, cursor);
    if (ensuredTerm.index < 0) {
      break;
    }

    const term = ensuredTerm.term;
    const capacity = sameTerm(term, startTerm) ? startTermMaxCourses : planMaxCourses;
    let placedInThisTerm = 0;
    let madeProgress = true;

    while (calculateTermLoad(term) < capacity && madeProgress) {
      madeProgress = false;

      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        if (candidate.disallowStartTerm && sameTerm(term, startTerm)) {
          continue;
        }

        if (await canPlaceCourseInTerm({ studentId, plan, term, entry: candidate.entry, currentPlan, plannerServices })) {
          insertCourseIntoTerm(term, candidate.entry, plan);
          remaining.splice(index, 1);
          placedInThisTerm += 1;
          madeProgress = true;
          break;
        }
      }
    }

    if (!placedInThisTerm && calculateTermLoad(term) === 0 && !sameTerm(term, startTerm) && ensuredTerm.created) {
      removeEmptyTerm(plan, cursor);
    }

    cursor = getNextTerm(cursor);
    steps += 1;
  }

  if (remaining.length) {
    warnings.push(`Could not place ${remaining.length} course(s) while keeping the plan valid: ${remaining.map((item) => describeCourseEntry(item.entry)).join(", ")}.`);
  }

  sortTerms(plan);

  const changes = [];
  for (const [key, originalLocation] of originalLocations.entries()) {
    const currentLocation = findCourseInPlan(plan, originalLocation.entry);
    if (currentLocation && !sameTerm(originalLocation.term, currentLocation.term)) {
      changes.push(buildChange("move_course", currentLocation.entry, originalLocation.term, currentLocation.term, "Reflowed to satisfy the planner request and academic rules."));
    }
  }

  return {
    valid: remaining.length === 0,
    changes,
    warnings
  };
}

async function applyValidatedMove({ studentId, plan, courseRef, targetTermIndex, targetMaxCourses = null, currentPlan, plannerServices }) {
  const targetTerm = getPlanTerms(plan)[targetTermIndex];
  const sourceLocation = findCourseInPlan(plan, courseRef);
  if (!sourceLocation || !targetTerm) {
    return { moved: false, warnings: ["The requested course or target term could not be found."] };
  }
  if (sourceLocation.term === targetTerm) {
    return { moved: false, noOp: true, warnings: [] };
  }
  if (targetMaxCourses !== null && targetMaxCourses !== undefined && calculateTermLoad(targetTerm) >= targetMaxCourses) {
    return { moved: false, warnings: [`${formatTermLabel(targetTerm)} already has ${targetMaxCourses} course(s).`] };
  }

  const sourceTerm = sourceLocation.term;
  const sourceIndex = sourceLocation.courseIndex;
  const removedEntry = removeCourseFromTerm(sourceTerm, sourceIndex);
  const insertion = insertCourseIntoTerm(targetTerm, removedEntry, plan);
  if (!removedEntry || !insertion) {
    if (removedEntry) {
      insertCourseIntoTerm(sourceTerm, removedEntry, plan, sourceIndex);
    }
    return { moved: false, warnings: ["The requested course could not be moved in the current plan shape."] };
  }

  const validation = await validateCandidatePlan({
    studentId,
    plan,
    currentPlan,
    plannerServices,
    movedCourse: removedEntry,
    targetTerm,
    targetMaxCourses
  });
  if (validation.valid) {
    return {
      moved: true,
      entry: removedEntry,
      fromTerm: sourceTerm,
      toTerm: targetTerm,
      usedFallbackValidation: validation.usedFallback,
      warnings: validation.warnings || []
    };
  }

  getCourseCollection(targetTerm).items.splice(insertion.index, 1);
  insertCourseIntoTerm(sourceTerm, removedEntry, plan, sourceIndex);
  return { moved: false, warnings: validation.warnings };
}

function getExistingLaterTermIndexes(plan, sourceTerm) {
  const sourceInfo = getTermInfo(sourceTerm);
  return getPlanTerms(plan)
    .map((term, index) => ({ term, index }))
    .filter(({ term }) => compareTermInfo(getTermInfo(term), sourceInfo) > 0)
    .sort((left, right) => compareTermInfo(getTermInfo(left.term), getTermInfo(right.term)))
    .map(({ index }) => index);
}

function getLatestTermInfo(plan) {
  const latest = [...getPlanTerms(plan)].sort((left, right) => compareTermInfo(getTermInfo(right), getTermInfo(left)))[0];
  return latest ? getTermInfo(latest) : null;
}

async function tryPlaceCourseInLaterTerms({ studentId, plan, sourceTerm, courseEntry, currentPlan, plannerServices }) {
  const courseRef = getCourseSignature(courseEntry);
  const warnings = [];
  const planMaxCourses = getPlanMaxCourses(plan);

  for (const targetTermIndex of getExistingLaterTermIndexes(plan, sourceTerm)) {
    const result = await applyValidatedMove({ studentId, plan, courseRef, targetTermIndex, targetMaxCourses: planMaxCourses, currentPlan, plannerServices });
    if (result.moved) {
      return { ...result, createdTerm: false };
    }
    warnings.push(...(result.warnings || []));
  }

  let cursor = getLatestTermInfo(plan);
  if (!cursor || compareTermInfo(cursor, getTermInfo(sourceTerm)) <= 0) {
    cursor = getTermInfo(sourceTerm);
  }

  for (let attempt = 0; attempt < MAX_PLACEMENT_TERM_SEARCH; attempt += 1) {
    cursor = getNextTerm(cursor);
    const ensuredTerm = cursor ? ensureTerm(plan, cursor) : { index: -1 };
    if (ensuredTerm.index < 0) {
      break;
    }

    const result = await applyValidatedMove({ studentId, plan, courseRef, targetTermIndex: ensuredTerm.index, targetMaxCourses: planMaxCourses, currentPlan, plannerServices });
    if (result.moved) {
      return { ...result, createdTerm: ensuredTerm.created };
    }
    if (ensuredTerm.created) {
      removeEmptyTerm(plan, cursor);
    }
    warnings.push(...(result.warnings || []));
  }

  return { moved: false, warnings: uniqueWarnings(warnings) };
}

function getIntentText(parsedIntent) {
  return [
    parsedIntent?.rawText,
    parsedIntent?.message,
    parsedIntent?.text,
    parsedIntent?.reasoningText,
    parsedIntent?.target,
    parsedIntent?.targetTerm,
    parsedIntent?.timeframe,
    parsedIntent?.dateReference
  ].filter(Boolean).join(" ");
}

function isEmptyTermRequest(parsedIntent) {
  return /\b(empty|clear|remove\s+all|no\s+courses?|zero\s+courses?|0\s+courses?)\b/i.test(getIntentText(parsedIntent));
}

function isLighterTermRequest(parsedIntent) {
  return /\b(lighter|lighten|light|easier|reduce|reduced|less|fewer)\b/i.test(getIntentText(parsedIntent));
}

function isNextTermIntent(parsedIntent) {
  const offset = toInteger(parsedIntent?.offsetTerms ?? parsedIntent?.termOffset);
  if (offset === 1) {
    return true;
  }

  return [
    parsedIntent?.relativeTerm,
    parsedIntent?.target,
    parsedIntent?.targetTerm,
    parsedIntent?.timeframe,
    parsedIntent?.dateReference,
    parsedIntent?.rawText,
    parsedIntent?.message,
    parsedIntent?.text
  ].filter(Boolean).some((value) =>
    /next\s+(semester|term)|following\s+(semester|term)|other\s+(semester|term)|another\s+(semester|term)|different\s+(semester|term)|later\s+(semester|term)/i.test(String(value))
  );
}

function resolveTermLoadTarget(plan, parsedIntent) {
  const explicitTermCode = normalizeTermCode(parsedIntent?.termCode ?? parsedIntent?.term);
  const explicitYear = toInteger(parsedIntent?.year);
  if (explicitTermCode && explicitYear) {
    return { termCode: explicitTermCode, year: explicitYear };
  }

  const currentTermCode = normalizeTermCode(plan?.currentTermCode ?? plan?.activeTermCode);
  const currentYear = toInteger(plan?.currentYear ?? plan?.activeYear);
  if (isNextTermIntent(parsedIntent) && currentTermCode && currentYear) {
    return getNextTerm({ termCode: currentTermCode, year: currentYear });
  }

  const firstTerm = [...getPlanTerms(plan)].sort((left, right) => compareTermInfo(getTermInfo(left), getTermInfo(right)))[0];
  return firstTerm ? getTermInfo(firstTerm) : null;
}

function resolveMoveTarget(plan, parsedIntent, sourceTerm) {
  const explicitTermCode = normalizeTermCode(parsedIntent?.termCode ?? parsedIntent?.term);
  const explicitYear = toInteger(parsedIntent?.year);
  if (explicitTermCode && explicitYear) {
    return { termCode: explicitTermCode, year: explicitYear };
  }

  const offset = toInteger(parsedIntent?.offsetTerms ?? parsedIntent?.termOffset);
  if (offset && offset > 0) {
    return offsetTerm(sourceTerm, offset);
  }

  if (!isNextTermIntent(parsedIntent)) {
    return null;
  }

  const existingNextTerm = getPlanTerms(plan)
    .filter((term) => compareTermInfo(getTermInfo(term), getTermInfo(sourceTerm)) > 0)
    .sort((left, right) => compareTermInfo(getTermInfo(left), getTermInfo(right)))[0];
  return existingNextTerm ? getTermInfo(existingNextTerm) : getNextTerm(sourceTerm);
}

function getRequestedCourseRef(parsedIntent) {
  const courseId = toInteger(parsedIntent?.courseId ?? parsedIntent?.course_id);
  const courseCode = normalizeCourseCode(parsedIntent?.courseCode ?? parsedIntent?.course_code ?? parsedIntent?.course);
  return courseId || courseCode ? { id: courseId, code: courseCode } : null;
}

function isTermLoadAdjustmentIntent(parsedIntent) {
  const hasTargetTerm = Boolean(normalizeTermCode(parsedIntent?.termCode ?? parsedIntent?.term) && toInteger(parsedIntent?.year));
  const hasExplicitLoad = toNonNegativeInteger(parsedIntent?.constraints?.maxCourses ?? parsedIntent?.maxCourses ?? parsedIntent?.targetMaxCourses) !== null;

  return hasTargetTerm && !getRequestedCourseRef(parsedIntent) && (
    hasExplicitLoad ||
    isLighterTermRequest(parsedIntent) ||
    isEmptyTermRequest(parsedIntent)
  );
}

function normalizeIntentName(intent) {
  const normalized = String(intent || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  if (["reduce_term_load", "lighter_term"].includes(normalized) || ["reducetermload", "lighterterm", "lightersemester"].includes(compact)) {
    return "reduce_term_load";
  }
  if (["move_course_request", "move_course"].includes(normalized) || ["movecourserequest", "movecourse"].includes(compact)) {
    return "move_course_request";
  }
  if (["what_if_adjustment", "what_if"].includes(normalized) || ["whatifadjustment", "whatif"].includes(compact)) {
    return "what_if_adjustment";
  }
  return normalized;
}

function deriveWhatIfIntent(parsedIntent) {
  for (const key of ["adjustment", "hypothetical", "change", "previewIntent", "innerIntent", "targetIntent"]) {
    if (parsedIntent?.[key] && typeof parsedIntent[key] === "object") {
      return { ...parsedIntent[key], intent: normalizeIntentName(parsedIntent[key].intent) };
    }
  }

  const requestedIntent = normalizeIntentName(parsedIntent?.adjustmentIntent ?? parsedIntent?.actionIntent ?? parsedIntent?.intentType ?? parsedIntent?.action);
  if (requestedIntent && requestedIntent !== "what_if_adjustment") {
    return { ...parsedIntent, intent: requestedIntent };
  }
  if (getRequestedCourseRef(parsedIntent)) {
    return { ...parsedIntent, intent: "move_course_request" };
  }
  if (parsedIntent?.constraints?.maxCourses || parsedIntent?.maxCourses || parsedIntent?.targetMaxCourses || parsedIntent?.year || parsedIntent?.termCode || isNextTermIntent(parsedIntent)) {
    return { ...parsedIntent, intent: "reduce_term_load" };
  }
  return null;
}

/**
 * Adjusts the course load for a target term by reflowing courses across later
 * terms while preserving planner validation where possible.
 *
 * @param {object} params
 * @param {number|string} params.studentId
 * @param {object} params.currentPlan
 * @param {object} params.parsedIntent
 * @param {object} [params.plannerServices] Optional service bag; pass
 *   { studyPlanService } to reuse existing plan validation.
 */
export async function reduceTermLoad({ studentId, currentPlan, parsedIntent, plannerServices = null } = {}) {
  const updatedPlan = clonePlan(currentPlan);
  if (!updatedPlan) {
    return buildErrorResponse("No changes made because the current plan was missing or invalid.", updatedPlan);
  }

  sortTerms(updatedPlan);
  const target = resolveTermLoadTarget(updatedPlan, parsedIntent);
  const targetTermIndex = findTermIndex(updatedPlan, target?.year, target?.termCode);
  if (targetTermIndex < 0) {
    return buildNoOpResponse(`No changes made because ${formatTermLabel(target)} was not found in the current plan.`, updatedPlan);
  }

  const targetTerm = getPlanTerms(updatedPlan)[targetTermIndex];
  const startingLoad = calculateTermLoad(targetTerm);
  const targetMaxCourses = getRequestedMaxCourses(updatedPlan, parsedIntent, startingLoad);
  if (startingLoad === targetMaxCourses) {
    return buildNoOpResponse(
      `${formatTermLabel(targetTerm)} already has ${startingLoad} course(s), which matches the requested load of ${targetMaxCourses}.`,
      updatedPlan,
      { impact: { graduationDelayTerms: 0, targetTermReducedTo: startingLoad } }
    );
  }

  const reflow = await reflowPlanFromTerm({
    studentId,
    plan: updatedPlan,
    startTerm: targetTerm,
    startTermMaxCourses: targetMaxCourses,
    currentPlan,
    plannerServices,
    constraints: parsedIntent?.constraints || {}
  });

  const finalLoad = calculateTermLoad(targetTerm);
  const warnings = [...reflow.warnings];
  if (finalLoad > targetMaxCourses) {
    warnings.push(`${formatTermLabel(targetTerm)} still has ${finalLoad} course(s); requested limit was ${targetMaxCourses}.`);
  }

  sortTerms(updatedPlan);
  const actionLabel = finalLoad < startingLoad ? "Reduced" : finalLoad > startingLoad ? "Filled" : "Adjusted";
  return {
    summary: reflow.changes.length
      ? `${finalLoad === targetMaxCourses ? actionLabel : `Partially ${actionLabel.toLowerCase()}`} ${formatTermLabel(targetTerm)} from ${startingLoad} to ${finalLoad} course(s) by reflowing ${reflow.changes.length} course(s).`
      : `No courses were moved for ${formatTermLabel(targetTerm)} because no valid placement was found.`,
    updatedPlan,
    changes: reflow.changes,
    warnings: uniqueWarnings(warnings),
    impact: buildBaseImpact({
      graduationDelayTerms: calculateGraduationDelayTerms(currentPlan, updatedPlan),
      targetTermReducedTo: finalLoad
    })
  };
}

/**
 * Moves one requested course to a target term when the candidate plan validates.
 *
 * @param {object} params
 * @param {number|string} params.studentId
 * @param {object} params.currentPlan
 * @param {object} params.parsedIntent
 * @param {object} [params.plannerServices] Optional service bag; pass
 *   { studyPlanService } to reuse existing plan validation.
 */
export async function moveCourseRequest({ studentId, currentPlan, parsedIntent, plannerServices = null } = {}) {
  const updatedPlan = clonePlan(currentPlan);
  if (!updatedPlan) {
    return buildErrorResponse("No changes made because the current plan was missing or invalid.", updatedPlan);
  }

  sortTerms(updatedPlan);
  const courseRef = getRequestedCourseRef(parsedIntent);
  if (!courseRef) {
    return buildErrorResponse("No course was moved because no course code or course id was supplied.", updatedPlan);
  }

  const sourceLocation = findCourseInPlan(updatedPlan, courseRef);
  if (!sourceLocation) {
    return buildErrorResponse(`No course was moved because ${courseRef.code || `#${courseRef.id}`} was not found in the current plan.`, updatedPlan);
  }

  if (isNextTermIntent(parsedIntent) && !toInteger(parsedIntent?.year)) {
    const sourceStartingLoad = calculateTermLoad(sourceLocation.term);
    const reflow = await reflowPlanFromTerm({
      studentId,
      plan: updatedPlan,
      startTerm: sourceLocation.term,
      startTermMaxCourses: Math.max(0, sourceStartingLoad - 1),
      currentPlan,
      plannerServices,
      excludeFromStartCourseKeys: [courseKey(sourceLocation.entry)],
      constraints: parsedIntent?.constraints || {}
    });
    const movedLocation = findCourseInPlan(updatedPlan, sourceLocation.entry);

    if (!movedLocation || sameTerm(movedLocation.term, sourceLocation.term)) {
      return buildErrorResponse(
        `${describeCourseEntry(sourceLocation.entry)} was not moved because no valid alternative semester could be found.`,
        updatedPlan,
        reflow.warnings
      );
    }

    return {
      summary: `Moved ${describeCourseEntry(sourceLocation.entry)} from ${formatTermLabel(sourceLocation.term)} to ${formatTermLabel(movedLocation.term)} and reflowed affected courses.`,
      updatedPlan,
      changes: reflow.changes,
      warnings: uniqueWarnings(reflow.warnings),
      impact: buildBaseImpact({ graduationDelayTerms: calculateGraduationDelayTerms(currentPlan, updatedPlan) })
    };
  }

  const target = resolveMoveTarget(updatedPlan, parsedIntent, sourceLocation.term);
  if (!target?.termCode || !target?.year) {
    return buildErrorResponse(`No course was moved because a target term could not be determined for ${describeCourseEntry(sourceLocation.entry)}.`, updatedPlan);
  }

  if (compareTermInfo(getTermInfo(sourceLocation.term), target) === 0) {
    return buildNoOpResponse(
      `${describeCourseEntry(sourceLocation.entry)} is already in ${formatTermLabel(sourceLocation.term)}.`,
      updatedPlan,
      { impact: { graduationDelayTerms: 0 } }
    );
  }

  const ensuredTerm = ensureTerm(updatedPlan, target);
  if (ensuredTerm.index < 0) {
    return buildErrorResponse(`No course was moved because ${formatTermLabel(target)} could not be added to the plan.`, updatedPlan);
  }

  const result = await applyValidatedMove({
    studentId,
    plan: updatedPlan,
    courseRef,
    targetTermIndex: ensuredTerm.index,
    targetMaxCourses: toPositiveInteger(parsedIntent?.constraints?.maxCourses) ?? getPlanMaxCourses(updatedPlan),
    currentPlan,
    plannerServices
  });

  if (!result.moved) {
    if (ensuredTerm.created) {
      removeEmptyTerm(updatedPlan, target);
    }
    return buildErrorResponse(
      `${describeCourseEntry(sourceLocation.entry)} was not moved because the requested placement could not be validated.`,
      updatedPlan,
      result.warnings
    );
  }

  const warnings = result.usedFallbackValidation
    ? [...(result.warnings || []), FALLBACK_VALIDATION_WARNING]
    : [...(result.warnings || [])];

  sortTerms(updatedPlan);
  return {
    summary: `Moved ${describeCourseEntry(result.entry)} from ${formatTermLabel(result.fromTerm)} to ${formatTermLabel(result.toTerm)}.`,
    updatedPlan,
    changes: [
      buildChange(
        "move_course",
        result.entry,
        result.fromTerm,
        result.toTerm,
        ensuredTerm.created ? "Created the requested target term." : "Moved by direct request."
      )
    ],
    warnings: uniqueWarnings(warnings),
    impact: buildBaseImpact({ graduationDelayTerms: calculateGraduationDelayTerms(currentPlan, updatedPlan) })
  };
}

/**
 * Applies a hypothetical planner adjustment to a cloned plan only.
 *
 * @param {object} params
 * @param {number|string} params.studentId
 * @param {object} params.currentPlan
 * @param {object} params.parsedIntent
 * @param {object} [params.plannerServices] Optional service bag; pass
 *   { studyPlanService } to reuse existing plan validation.
 */
export async function whatIfAdjustment({ studentId, currentPlan, parsedIntent, plannerServices = null } = {}) {
  const previewPlan = clonePlan(currentPlan);
  if (!previewPlan) {
    return {
      ...buildErrorResponse("What-if preview could not be created because the current plan was missing or invalid.", previewPlan),
      isWhatIf: true
    };
  }

  const hypotheticalIntent = deriveWhatIfIntent(parsedIntent);
  if (!hypotheticalIntent) {
    return {
      ...buildNoOpResponse("What-if preview did not identify a supported planner adjustment.", previewPlan),
      isWhatIf: true
    };
  }

  const result = await applyPlannerIntent({ studentId, currentPlan: previewPlan, parsedIntent: hypotheticalIntent, plannerServices });
  return { ...result, summary: `What-if preview: ${result.summary}`, isWhatIf: true };
}

/**
 * Dispatches a parsed planner intent to the appropriate rule-based action.
 *
 * @param {object} params
 * @param {number|string} params.studentId
 * @param {object} params.currentPlan
 * @param {object} params.parsedIntent
 * @param {object} [params.plannerServices] Optional service bag; pass
 *   { studyPlanService } to reuse existing plan validation.
 */
export async function applyPlannerIntent({ studentId, currentPlan, parsedIntent, plannerServices = null } = {}) {
  const intent = parsedIntent?.intent;
  if (intent === "reduce_term_load") {
    return reduceTermLoad({ studentId, currentPlan, parsedIntent, plannerServices });
  }
  if (intent === "move_course_request") {
    if (isTermLoadAdjustmentIntent(parsedIntent)) {
      return reduceTermLoad({ studentId, currentPlan, parsedIntent, plannerServices });
    }

    return moveCourseRequest({ studentId, currentPlan, parsedIntent, plannerServices });
  }
  if (intent === "what_if_adjustment") {
    return whatIfAdjustment({ studentId, currentPlan, parsedIntent, plannerServices });
  }

  return buildNoOpResponse(
    `No planner changes were made because intent "${parsedIntent?.intent || "unknown"}" is not supported.`,
    clonePlan(currentPlan),
    { warnings: ["Supported intents are reduce_term_load, move_course_request, and what_if_adjustment."] }
  );
}
