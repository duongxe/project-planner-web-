import {
  apiCreateCourseRecord,
  apiDeleteCourseRecord,
  apiDeleteSavedStudyPlanVersion,
  apiGetSavedStudyPlans,
  apiGetStudentProgress,
  apiSaveStudyPlan,
  apiGetStudyPlan,
  apiPlannerChat,
  apiUpdateMajorOptionSelection,
  apiValidateStudyPlan,
  apiUpdateCourseRecord
} from "./api.js";

const logoutBtn = document.getElementById("logoutBtn");
const statusMessage = document.getElementById("statusMessage");
const pageTitle = document.getElementById("pageTitle");

const studentName = document.getElementById("studentName");
const studentNumber = document.getElementById("studentNumber");
const sidebarProgram = document.getElementById("sidebarProgram");
const sidebarMajor = document.getElementById("sidebarMajor");

const earnedUnitsMetric = document.getElementById("earnedUnitsMetric");
const remainingUnitsMetric = document.getElementById("remainingUnitsMetric");
const coreProgressMetric = document.getElementById("coreProgressMetric");
const majorProgressMetric = document.getElementById("majorProgressMetric");

const programSummaryBody = document.getElementById("programSummaryBody");
const majorSummaryBody = document.getElementById("majorSummaryBody");

const courseSearch = document.getElementById("courseSearch");
const courseRecordsBody = document.getElementById("courseRecordsBody");

const startTerm = document.getElementById("startTerm");
const studyLoad = document.getElementById("studyLoad");
const startYear = document.getElementById("startYear");
const generatePlanBtn = document.getElementById("generatePlanBtn");
const savePlanBtn = document.getElementById("savePlanBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const planValidationBox = document.getElementById("planValidationBox");
const studyPlanOutput = document.getElementById("studyPlanOutput");
const plannerChatPanel = document.getElementById("plannerChatPanel");
const plannerChatStatus = document.getElementById("plannerChatStatus");
const plannerChatLog = document.getElementById("plannerChatLog");
const plannerChatForm = document.getElementById("plannerChatForm");
const plannerChatInput = document.getElementById("plannerChatInput");
const plannerChatSubmit = document.getElementById("plannerChatSubmit");
const savedPlanOutput = document.getElementById("savedPlanOutput");
const planPreventModal = document.getElementById("planPreventModal");
const planPreventModalTitle = document.getElementById("planPreventModalTitle");
const planPreventModalBody = document.getElementById("planPreventModalBody");
const planPreventModalCloseBtn = document.getElementById("planPreventModalCloseBtn");

const programBreakdownBody = document.getElementById("programBreakdownBody");
const majorBreakdownBody = document.getElementById("majorBreakdownBody");
const levelDistributionBody = document.getElementById("levelDistributionBody");
const levelRulesBody = document.getElementById("levelRulesBody");

const state = {
  session: null,
  progress: null,
  studyPlan: null,
  savedStudyPlans: [],
  selectedSavedPlanId: null,
  planEditor: null,
  draggedCourseId: null,
  draggedFromTermKey: null,
  planMovePending: false,
  planEditorDirty: false,
  plannerChatPending: false,
  plannerChatMessages: [],
  searchQuery: "",
  lastPlanOptions: null
};

const PLAN_HOLDING_KEY = "__holding__";
const MAX_SAVED_PLAN_VERSIONS = 4;

function loadSession() {
  const raw = localStorage.getItem("uontool_session");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("uontool_session");
  window.location.href = "login.html";
}

function setMessage(kind, text) {
  statusMessage.className = `message message-${kind}`;
  statusMessage.textContent = text;
}

function clearMessage() {
  statusMessage.className = "message";
  statusMessage.textContent = "";
}

function setPlanValidation(kind, lines) {
  const messages = Array.isArray(lines) ? lines.filter(Boolean) : [lines].filter(Boolean);
  if (!messages.length) {
    planValidationBox.className = "message plan-validation-note";
    planValidationBox.textContent = "";
    return;
  }

  const panelTitle =
    kind === "bad"
      ? "Plan cannot be saved yet"
      : kind === "ok"
        ? "Study plan updated"
        : "Planner review notice";

  const panelSummary =
    kind === "bad"
      ? "Resolve the following issues before saving the study plan."
      : kind === "ok"
        ? "The current study plan has been saved successfully."
        : "You can keep editing the plan, but these items should be reviewed before the next save.";

  const itemCountLabel = `${messages.length} item${messages.length === 1 ? "" : "s"}`;
  const detailsMarkup =
    messages.length === 1
      ? `<p class="planner-alert-single">${escapeHtml(messages[0])}</p>`
      : `
          <details class="planner-alert-details" ${kind === "ok" ? "" : "open"}>
            <summary>View details</summary>
            <ul class="message-list planner-alert-list">
              ${messages.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ul>
          </details>
        `;

  planValidationBox.className = `message plan-validation-note message-${kind}`;
  planValidationBox.innerHTML = `
    <div class="planner-alert-shell">
      <div class="planner-alert-header">
        <div class="planner-alert-heading">
          <span class="planner-alert-kicker">${kind === "bad" ? "Save blocked" : kind === "ok" ? "Saved version" : "Review required"}</span>
          <strong class="planner-alert-title">${escapeHtml(panelTitle)}</strong>
        </div>
        <div class="planner-alert-actions">
          <span class="planner-alert-count">${escapeHtml(itemCountLabel)}</span>
          <button class="planner-alert-dismiss" type="button" data-role="dismiss-plan-validation" aria-label="Dismiss planner notice">Dismiss</button>
        </div>
      </div>
      <p class="planner-alert-summary">${escapeHtml(panelSummary)}</p>
      ${detailsMarkup}
    </div>
  `;
}

function clearPlanValidation() {
  planValidationBox.className = "message plan-validation-note";
  planValidationBox.textContent = "";
}

function closePlanPreventModal() {
  if (planPreventModal?.open) {
    planPreventModal.close();
  }
}

function getLatestSavedPlan() {
  return state.savedStudyPlans?.[0] ?? null;
}

function getSavedPlanById(planId) {
  return (state.savedStudyPlans || []).find((plan) => plan.id === planId) ?? null;
}

function syncSelectedSavedPlanId(preferredPlanId = state.selectedSavedPlanId) {
  if (!state.savedStudyPlans.length) {
    state.selectedSavedPlanId = null;
    return null;
  }

  const hasPreferredPlan = preferredPlanId
    ? state.savedStudyPlans.some((plan) => plan.id === preferredPlanId)
    : false;

  state.selectedSavedPlanId = hasPreferredPlan
    ? preferredPlanId
    : state.savedStudyPlans[0].id;

  return getSavedPlanById(state.selectedSavedPlanId);
}

function getActiveSavedPlan() {
  return syncSelectedSavedPlanId();
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}
function formatMovePreventMessages(lines) {
  const messages = Array.isArray(lines) ? lines.filter(Boolean) : [lines].filter(Boolean);
  return messages.length ? messages : ["The selected course move does not satisfy the academic rules."];
}

function showPlanPreventModal(lines, title = "Plan Update Not Allowed") {
  const messages = formatMovePreventMessages(lines);

  if (!planPreventModal || !planPreventModalBody || typeof planPreventModal.showModal !== "function") {
    window.alert([title, ...messages].join("\n\n"));
    return;
  }

  if (planPreventModalTitle) {
    planPreventModalTitle.textContent = title;
  }

  planPreventModalBody.innerHTML = messages.length === 1
    ? `<p>${escapeHtml(messages[0])}</p>`
    : `<ul class="message-list">${messages.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;

  if (!planPreventModal.open) {
    planPreventModal.showModal();
    return;
  }

  planPreventModal.focus();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatUnits(units) {
  return `${units} units`;
}

function formatStatus(status) {
  const mapping = {
    passed: "Passed",
    failed: "Failed",
    in_progress: "In Progress",
    planned: "Planned"
  };

  return mapping[status] || "Not Recorded";
}

function termLabel(term) {
  if (!term) {
    return "-";
  }

  return term === "SUMMER" ? "Summer" : term === "S1" ? "Semester 1" : "Semester 2";
}

function buildStudyTermLabel(termCode, year) {
  return `${termLabel(termCode)} ${year}`;
}

function comparePlanTerms(left, right) {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  if (left.termCode === right.termCode) {
    return 0;
  }

  return left.termCode === "S1" ? -1 : 1;
}

function nextPlanTerm(term) {
  return term.termCode === "S1"
    ? { termCode: "S2", year: term.year }
    : { termCode: "S1", year: term.year + 1 };
}

function previousPlanTerm(term) {
  return term.termCode === "S2"
    ? { termCode: "S1", year: term.year }
    : { termCode: "S2", year: term.year - 1 };
}

function applyPlanTermMetadata(editor) {
  if (!editor) {
    return editor;
  }

  editor.terms.sort(comparePlanTerms);
  editor.terms.forEach((term) => {
    term.label = buildStudyTermLabel(term.termCode, term.year);
  });

  if (editor.terms.length) {
    editor.startTerm = editor.terms[0].termCode;
    editor.startYear = editor.terms[0].year;
  }

  return editor;
}

function syncPlanControlValues(editor) {
  if (!editor) {
    return;
  }

  startTerm.value = editor.startTerm;
  startYear.value = String(editor.startYear);
  studyLoad.value = String(editor.maxCoursesPerTerm);
}

function getPlanTermToneClass(index) {
  return `plan-term-tone-${(index % 4) + 1}`;
}

function badge(label, variant = "info") {
  return `<span class="badge badge-${variant}">${escapeHtml(label)}</span>`;
}

function formatOfferedTerms(course) {
  if (!course?.hasOfferingData || !Array.isArray(course.offeredTerms) || !course.offeredTerms.length) {
    return "";
  }

  const labels = course.offeredTerms.map((term) => termLabel(term));
  return `Available: ${labels.join(", ")}`;
}

function formatOptionChoiceLabel(course) {
  const availabilityMeta = formatOfferedTerms(course);
  return `${course.code} - ${course.name}${availabilityMeta ? ` (${availabilityMeta})` : ""}`;
}

function renderMajorOptionSelector(course) {
  if (!course.majorOptionSlot) {
    return "";
  }

  const optionsMarkup = (course.optionChoices || [])
    .map(
      (option) => `<option value="${option.id}" ${option.id === course.selectedOptionCourseId ? "selected" : ""}>${escapeHtml(formatOptionChoiceLabel(option))}</option>`
    )
    .join("");

  return `
    <div class="option-select-wrap">
      <label class="field option-select-field">
        <span class="field-label">Approved Option Course</span>
        <select
          class="field-control option-select-control"
          data-role="major-option"
          data-slot-course-id="${course.optionSlotCourseId}"
          data-selected-value="${course.selectedOptionCourseId || ""}"
        >
          <option value="">Choose an approved option course</option>
          ${optionsMarkup}
        </select>
      </label>
      <p class="inline-note">${escapeHtml(
        course.selectedOptionCourseId
          ? `Selected for ${course.optionSlotName}. Changing this selection will refresh the plan.`
          : `Choose a course for ${course.optionSlotName}.`
      )}</p>
    </div>
  `;
}

function renderCourseLabel(course) {
  if (course.electiveSlot) {
    return `
      <span class="course-code">${escapeHtml(course.code)}</span>
      <span class="course-name">${escapeHtml(course.name)}</span>
      <span class="course-meta">Elective slot | ${course.units} units</span>
    `;
  }

  if (course.majorOptionSlot) {
    const availabilityMeta = formatOfferedTerms(course);
    const slotMeta = course.selectedOptionCourseId
      ? `Approved option | ${course.units} units${availabilityMeta ? ` | ${escapeHtml(availabilityMeta)}` : ""}`
      : `Option slot pending selection | ${course.units} units`;

    return `
      <span class="course-code">${escapeHtml(course.code)}</span>
      <span class="course-name">${escapeHtml(course.name)}</span>
      <span class="course-meta">${slotMeta}</span>
      <span class="course-note">${escapeHtml(course.optionSlotName || course.optionSlotCode || "Major option slot")}</span>
    `;
  }

  const availabilityMeta = formatOfferedTerms(course);

  return `
    <span class="course-code">${escapeHtml(course.code)}</span>
    <span class="course-name">${escapeHtml(course.name)}</span>
    <span class="course-meta">${course.level}-level | ${course.units} units${availabilityMeta ? ` | ${escapeHtml(availabilityMeta)}` : ""}</span>
  `;
}

function renderRequirementBadges(course) {
  const items = [];

  if (course.electiveSlot) {
    items.push(badge("Elective Slot"));
  }

  if (course.majorOptionSlot) {
    items.push(badge("Approved Option"));
  }

  if (course.inProgramBlocks?.length) {
    items.push(badge("Program Core"));
  }

  if (course.inMajorBlocks?.length) {
    items.push(badge("Major Requirement"));
  }

  if (course.sharedWithCore) {
    items.push(badge("Shared Core-Major", "warning"));
  }

  return items.join("");
}

function renderEmptyRow(colspan, text) {
  return `<tr class="empty-row"><td colspan="${colspan}">${escapeHtml(text)}</td></tr>`;
}

function getCoreBlock() {
  return state.progress?.programBlocks.find((block) => block.code === "CORE") || null;
}

function getMajorPrimaryBlock() {
  return state.progress?.majorBlocks[0] || null;
}

function getChecklistCourses() {
  return [
    ...(state.progress?.requiredCourses || []),
    ...(state.progress?.electiveSlots || [])
  ];
}

function getChecklistCourseBySlotCourseId(slotCourseId) {
  return getChecklistCourses().find((course) => course.majorOptionSlot && course.optionSlotCourseId === slotCourseId) || null;
}

function buildTermKey(term) {
  return `${term.year}-${term.termCode}`;
}

function clonePlanCourseItem(item) {
  return {
    ...item,
    warnings: [...(item.warnings || [])],
    validationIssues: [...(item.validationIssues || [])],
    course: { ...item.course }
  };
}

function clearPlanEditorValidation(editor) {
  if (!editor) {
    return editor;
  }

  editor.generalValidationIssues = [];
  editor.terms.forEach((term) => {
    term.validationIssues = [];
    term.courses.forEach((item) => {
      item.validationIssues = [];
    });
  });

  return editor;
}

function applyPlanLoadValidationAnnotations(editor) {
  if (!editor) {
    return editor;
  }

  for (const term of editor.terms) {
    if (term.courses.length <= editor.maxCoursesPerTerm) {
      continue;
    }

    const overloadMessage = `${term.label} exceeds the selected study load (${editor.maxCoursesPerTerm} course(s) per semester).`;
    term.validationIssues.push(overloadMessage);

    for (const item of term.courses) {
      item.validationIssues.push(overloadMessage);
    }
  }

  return editor;
}

function parseCourseValidationDetail(detail) {
  const match = String(detail || "").match(/^([A-Z0-9-]+)\s+in\s+(Semester\s[12]\s+\d{4})\s+is not valid:\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    courseCode: match[1],
    termLabel: match[2],
    reason: match[3]
  };
}

function parseTermValidationDetail(detail) {
  const match = String(detail || "").match(/^(Semester\s[12]\s+\d{4})\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    termLabel: match[1],
    reason: match[2]
  };
}

function applyPlanValidationAnnotations(editor, details = []) {
  if (!editor) {
    return editor;
  }

  for (const detail of details || []) {
    const courseIssue = parseCourseValidationDetail(detail);
    if (courseIssue) {
      const targetTerm = editor.terms.find((term) => term.label === courseIssue.termLabel);
      const targetItem = targetTerm?.courses.find((item) => item.course.code === courseIssue.courseCode);
      if (targetItem) {
        targetItem.validationIssues.push(courseIssue.reason);
        continue;
      }
    }

    const termIssue = parseTermValidationDetail(detail);
    if (termIssue) {
      const targetTerm = editor.terms.find((term) => term.label === termIssue.termLabel);
      if (targetTerm) {
        targetTerm.validationIssues.push(termIssue.reason);
        continue;
      }
    }
  }

  return editor;
}

function editorHasValidationIssues(editor) {
  if (!editor) {
    return false;
  }

  return (editor.generalValidationIssues || []).length > 0 || editor.terms.some((term) =>
    (term.validationIssues || []).length ||
    term.courses.some((item) => (item.validationIssues || []).length)
  );
}

function renderPlanIssueIndicator(issues, label = "Needs review", variant = "course") {
  if (!issues?.length) {
    return "";
  }

  const tooltipMarkup = issues.length === 1
    ? `<p class="plan-issue-tooltip-copy">${escapeHtml(issues[0])}</p>`
    : `<ul class="plan-issue-tooltip-list">${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>`;

  return `
    <div class="plan-issue-indicator plan-issue-indicator-${variant}" tabindex="0" aria-label="${escapeHtml(label)}">
      <span class="plan-issue-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 6.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 9V7a2 2 0 1 1 4 0v2Z"/>
        </svg>
      </span>
      <div class="plan-issue-tooltip" role="tooltip">
        <strong class="plan-issue-tooltip-title">${escapeHtml(label)}</strong>
        ${tooltipMarkup}
      </div>
    </div>
  `;
}

function initializePlanEditorFromStudyPlan(studyPlan) {
  if (!studyPlan) {
    return null;
  }

  const editor = {
    startTerm: studyPlan.startTerm,
    startYear: studyPlan.startYear,
    maxCoursesPerTerm: studyPlan.maxCoursesPerTerm,
    terms: studyPlan.terms.map((term) => ({
      termCode: term.termCode,
      year: term.year,
      label: term.label,
      validationIssues: [],
      courses: term.recommendedCourses.map(clonePlanCourseItem)
    })),
    holdingAreaCourses: [],
    generalValidationIssues: []
  };

  applyPlanTermMetadata(editor);
  clearPlanEditorValidation(editor);
  applyPlanLoadValidationAnnotations(editor);
  syncPlanControlValues(editor);
  return editor;
}

function clonePlanEditor(editor) {
  if (!editor) {
    return null;
  }

  return applyPlanTermMetadata({
    startTerm: editor.startTerm,
    startYear: editor.startYear,
    maxCoursesPerTerm: editor.maxCoursesPerTerm,
    terms: editor.terms.map((term) => ({
      termCode: term.termCode,
      year: term.year,
      label: term.label,
      validationIssues: [...(term.validationIssues || [])],
      courses: term.courses.map(clonePlanCourseItem)
    })),
    holdingAreaCourses: (editor.holdingAreaCourses || []).map(clonePlanCourseItem),
    generalValidationIssues: [...(editor.generalValidationIssues || [])]
  });
}

function normalizePlannerChatCourseItem(item) {
  if (item?.course) {
    return clonePlanCourseItem(item);
  }

  if (item && typeof item === "object") {
    return {
      warnings: [],
      validationIssues: [...(item.validationIssues || [])],
      course: { ...item }
    };
  }

  return {
    warnings: [],
    validationIssues: [],
    course: {
      id: Number(item) || 0,
      code: String(item ?? "COURSE"),
      name: "Course details unavailable",
      units: 0,
      level: ""
    }
  };
}

function normalizePlannerChatEditor(plan) {
  if (!plan) {
    return null;
  }

  const fallbackEditor = state.planEditor || {};
  const terms = (plan.terms || []).map((term) => {
    const rawCourses = Array.isArray(term.courses)
      ? term.courses
      : Array.isArray(term.recommendedCourses)
        ? term.recommendedCourses
        : [];

    return {
      termCode: term.termCode,
      year: term.year,
      label: term.label || buildStudyTermLabel(term.termCode, term.year),
      validationIssues: [...(term.validationIssues || [])],
      courses: rawCourses.map(normalizePlannerChatCourseItem)
    };
  });

  return applyPlanTermMetadata({
    startTerm: plan.startTerm || fallbackEditor.startTerm || terms[0]?.termCode || "S1",
    startYear: Number(plan.startYear || fallbackEditor.startYear || terms[0]?.year || startYear.value || 2026),
    maxCoursesPerTerm: Number(plan.maxCoursesPerTerm || fallbackEditor.maxCoursesPerTerm || studyLoad.value || 4),
    terms,
    holdingAreaCourses: (plan.holdingAreaCourses || []).map(normalizePlannerChatCourseItem),
    generalValidationIssues: [...(plan.generalValidationIssues || [])]
  });
}

function renderStudentMeta() {
  const { student } = state.progress;
  pageTitle.textContent = student.program.name;
  studentName.textContent = student.name;
  studentNumber.textContent = student.studentNumber;
  sidebarProgram.textContent = `${student.program.code} ${student.program.name}`;
  sidebarMajor.textContent = `${student.major.code} ${student.major.name}`;
}

function renderDashboardSummary() {
  const summary = state.progress.summary;
  const coreBlock = getCoreBlock();
  const majorBlock = getMajorPrimaryBlock();

  earnedUnitsMetric.textContent = formatUnits(summary.earnedUnits);
  remainingUnitsMetric.textContent = formatUnits(summary.remainingUnits);
  coreProgressMetric.textContent = `${coreBlock?.completedUnits || 0} / ${coreBlock?.requiredUnits || 0}`;
  majorProgressMetric.textContent = `${majorBlock?.completedUnits || 0} / ${majorBlock?.requiredUnits || 0}`;

  programSummaryBody.innerHTML = state.progress.programBlocks
    .map(
      (block) => `
        <tr>
          <td>${escapeHtml(block.name)}</td>
          <td>${formatUnits(block.completedUnits)}</td>
          <td>${formatUnits(block.remainingUnits)}</td>
        </tr>
      `
    )
    .join("");

  majorSummaryBody.innerHTML = state.progress.majorBlocks
    .map(
      (block) => `
        <tr>
          <td>${escapeHtml(block.name)}</td>
          <td>${formatUnits(block.completedUnits)}</td>
          <td>${formatUnits(block.remainingUnits)}</td>
        </tr>
      `
    )
    .join("");
}

function renderCourseRecords() {
  const query = state.searchQuery.toLowerCase();
  const rows = getChecklistCourses().filter((course) => {
    if (!query) {
      return true;
    }

    return (
      course.code.toLowerCase().includes(query) ||
      course.name.toLowerCase().includes(query)
    );
  });

  if (!rows.length) {
    courseRecordsBody.innerHTML = renderEmptyRow(3, "No courses or elective slots match the current filter.");
    return;
  }

  courseRecordsBody.innerHTML = rows
    .map((course) => {
      const record = course.record;
      const isChecked = record?.status === "passed" || course.isPassed;

      return `
        <tr data-course-id="${course.id}" data-slot-course-id="${course.optionSlotCourseId || ""}" data-record-id="${record?.id || ""}">
          <td>${renderCourseLabel(course)}</td>
          <td>
            <div class="badge-row">${renderRequirementBadges(course)}</div>
            ${renderMajorOptionSelector(course)}
          </td>
          <td>
            <input type="checkbox" data-role="passed" ${isChecked ? "checked" : ""} ${course.majorOptionSlot && !course.selectedOptionCourseId ? "disabled" : ""} />
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderRequirementBreakdown() {
  programBreakdownBody.innerHTML = state.progress.programBlocks
    .map(
      (block) => `
        <tr>
          <td>${escapeHtml(block.name)}</td>
          <td>${formatUnits(block.completedUnits)}</td>
          <td>${formatUnits(block.remainingUnits)}</td>
        </tr>
      `
    )
    .join("");

  majorBreakdownBody.innerHTML = state.progress.majorBlocks
    .map(
      (block) => `
        <tr>
          <td>${escapeHtml(block.name)}</td>
          <td>${formatUnits(block.completedUnits)}</td>
          <td>${formatUnits(block.remainingUnits)}</td>
        </tr>
      `
    )
    .join("");

  levelDistributionBody.innerHTML = state.progress.levelDistribution.length
    ? state.progress.levelDistribution
        .map(
          (entry) => `
            <tr>
              <td>${entry.level}-level</td>
              <td>${formatUnits(entry.units)}</td>
            </tr>
          `
        )
        .join("")
    : renderEmptyRow(2, "No passed courses have been recorded yet.");

  levelRulesBody.innerHTML = state.progress.levelRules
    .map((rule) => {
      const descriptor =
        rule.ruleOperator === "max"
          ? `Maximum ${formatUnits(rule.requiredUnits)} at ${rule.level}-level`
          : `Minimum ${formatUnits(rule.requiredUnits)} at ${rule.level}-level`;

      const status = rule.satisfied
        ? badge("Satisfied", "success")
        : badge(rule.ruleOperator === "max" ? "Exceeded" : "In Progress", rule.ruleOperator === "max" ? "danger" : "warning");

      const progress =
        rule.ruleOperator === "max"
          ? rule.unitsExceeded > 0
            ? `${formatUnits(rule.unitsExceeded)} above the maximum`
            : `${formatUnits(rule.unitsRemaining)} remaining within the limit`
          : `${formatUnits(rule.unitsRemaining)} still required`;

      return `
        <tr>
          <td>${escapeHtml(descriptor)}</td>
          <td>${status}</td>
          <td>${escapeHtml(progress)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderStudyPlan() {
  const editor = state.planEditor;

  if (!editor) {
    studyPlanOutput.className = "plan-stack empty-state";
    studyPlanOutput.textContent = "Generate a study plan to view semester-by-semester recommendations.";
    savePlanBtn.disabled = true;
    renderPlannerChat();
    return;
  }

  savePlanBtn.disabled = false;
  const holdingCount = editor.holdingAreaCourses?.length || 0;

  const termMarkup = editor.terms
    .map(
      (term, index) => `
        <article class="plan-term plan-term-editor ${getPlanTermToneClass(index)} ${term.validationIssues?.length ? "plan-term-invalid" : ""}">
          <div class="plan-term-header">
            <div class="plan-term-heading">
              <div class="plan-term-title-row">
                <h4 class="plan-term-title">${escapeHtml(term.label)}</h4>
                ${renderPlanIssueIndicator(term.validationIssues, `${term.label} requires review`, "term")}
              </div>
              <span class="plan-note">${term.courses.length} course(s)</span>
            </div>
            <div class="plan-term-actions">
              <button class="button button-secondary button-small plan-term-action" type="button" data-action="add-left" data-term-key="${escapeHtml(buildTermKey(term))}">Add Before</button>
              <button class="button button-secondary button-small plan-term-action" type="button" data-action="delete-term" data-term-key="${escapeHtml(buildTermKey(term))}">Delete</button>
              <button class="button button-secondary button-small plan-term-action" type="button" data-action="add-right" data-term-key="${escapeHtml(buildTermKey(term))}">Add After</button>
            </div>
          </div>

          <div class="plan-dropzone" data-term-key="${escapeHtml(buildTermKey(term))}">
            ${
              term.courses.length
                ? term.courses
                    .map(
                      (item) => `
                        <div
                          class="plan-course-card ${item.validationIssues?.length ? "plan-course-card-invalid" : ""}"
                          draggable="true"
                          data-course-id="${item.course.id}"
                          data-term-key="${escapeHtml(buildTermKey(term))}"
                        >
                          <div class="plan-course-card-body">
                            <div class="plan-course-card-main">
                              ${renderCourseLabel(item.course)}
                            </div>
                            ${renderPlanIssueIndicator(item.validationIssues, `${item.course.code} requires review`, "course")}
                          </div>
                        </div>
                      `
                    )
                    .join("")
                : '<div class="plan-dropzone-empty">Drag courses here</div>'
            }
          </div>
        </article>
      `
    )
    .join("");

  const holdingAreaMarkup = `
    <article class="plan-term plan-term-editor plan-term-holding">
      <div class="plan-term-header">
        <div class="plan-term-heading">
          <h4 class="plan-term-title">Temporary Holding Area</h4>
          <span class="plan-note">${holdingCount} unscheduled course(s)</span>
        </div>
      </div>
      <p class="plan-holding-copy">Use this area to park courses temporarily while you reorganize the plan. The study plan cannot be saved until this area is empty.</p>
      <div class="plan-dropzone plan-holding-dropzone" data-term-key="${PLAN_HOLDING_KEY}">
        ${
          holdingCount
            ? editor.holdingAreaCourses
                .map(
                  (item) => `
                    <div
                      class="plan-course-card"
                      draggable="true"
                      data-course-id="${item.course.id}"
                      data-term-key="${PLAN_HOLDING_KEY}"
                    >
                      <div class="plan-course-card-body">
                        <div class="plan-course-card-main">
                          ${renderCourseLabel(item.course)}
                        </div>
                      </div>
                    </div>
                  `
                )
                .join("")
            : '<div class="plan-dropzone-empty">Drop courses here if you are not ready to place them in a semester.</div>'
        }
      </div>
    </article>
  `;

  studyPlanOutput.className = "plan-stack";
  studyPlanOutput.innerHTML = `
    <div class="plan-editor-header">
      <p class="plan-note">
        Drag courses between semesters to adjust the recommended study plan. Courses or semesters marked with a red lock need review. Hover over the lock to see the reason.
      </p>
      <p class="plan-note">
        Use Add Before or Add After to insert an empty semester. Delete removes any semester and moves that semester's courses to the holding area while keeping all other semester labels unchanged.
      </p>
      <p class="plan-note">
        Study load: ${editor.maxCoursesPerTerm} course(s) per semester.
      </p>
    </div>
    <div class="plan-editor-layout"><div class="plan-editor-main"><div class="plan-editor-grid">${termMarkup}</div></div><aside class="plan-editor-sidebar">${holdingAreaMarkup}</aside></div>
  `;
  renderPlannerChat();
}

function renderPlannerChatMessage(entry) {
  const changesMarkup = entry.changes?.length
    ? `
        <ul class="planner-chat-list">
          ${entry.changes.map((change) => `
            <li>
              ${escapeHtml(change.courseLabel || change.courseCode || "Course")}
              ${change.from?.label || change.to?.label
                ? `: ${escapeHtml(change.from?.label || "-")} to ${escapeHtml(change.to?.label || "-")}`
                : ""}
            </li>
          `).join("")}
        </ul>
      `
    : "";

  const warningsMarkup = entry.warnings?.length
    ? `
        <ul class="planner-chat-list planner-chat-warnings">
          ${entry.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
        </ul>
      `
    : "";

  const intentMarkup = entry.parsedIntent
    ? `
        <details class="planner-chat-details">
          <summary>Parsed intent</summary>
          <pre>${escapeHtml(JSON.stringify(entry.parsedIntent, null, 2))}</pre>
        </details>
      `
    : "";

  return `
    <article class="planner-chat-message planner-chat-message-${entry.role}">
      <p>${escapeHtml(entry.text)}</p>
      ${changesMarkup}
      ${warningsMarkup}
      ${intentMarkup}
    </article>
  `;
}

function renderPlannerChat() {
  if (!plannerChatPanel) {
    return;
  }

  plannerChatPanel.hidden = !state.planEditor;
  if (!state.planEditor) {
    return;
  }

  plannerChatStatus.textContent = state.plannerChatPending ? "Working" : "Ready";
  plannerChatInput.disabled = state.plannerChatPending;
  plannerChatSubmit.disabled = state.plannerChatPending;

  plannerChatLog.innerHTML = state.plannerChatMessages.length
    ? state.plannerChatMessages.map(renderPlannerChatMessage).join("")
    : '<div class="planner-chat-empty">Try: "Move SENG2130 to S1 2028" or "Make S2 2027 lighter."</div>';

  plannerChatLog.scrollTop = plannerChatLog.scrollHeight;
}

function renderSavedPlan() {
  const activeSavedPlan = getActiveSavedPlan();
  downloadPdfBtn.disabled = !activeSavedPlan;

  if (!state.savedStudyPlans.length) {
    savedPlanOutput.innerHTML = `
      <article class="plan-term saved-plan-versions-shell">
        <div class="plan-term-header">
          <h4 class="plan-term-title">Saved Study Plan Versions</h4>
          <span class="plan-note">0 / ${MAX_SAVED_PLAN_VERSIONS} versions saved</span>
        </div>
        <p class="plan-note">No saved versions yet. Save a study plan to create version history.</p>
      </article>
    `;
    return;
  }

  const activeVersionIndex = state.savedStudyPlans.findIndex((plan) => plan.id === activeSavedPlan?.id);
  const versionOptionsMarkup = state.savedStudyPlans
    .map((savedPlan, versionIndex) => `
      <option value="${savedPlan.id}" ${savedPlan.id === activeSavedPlan?.id ? "selected" : ""}>
        ${escapeHtml(`Version ${versionIndex + 1} - Saved ${formatDateTime(savedPlan.updatedAt)}`)}
      </option>
    `)
    .join("");

  const termMarkup = (activeSavedPlan?.terms || [])
    .map(
      (term, index) => `
        <article class="plan-term saved-plan-term ${getPlanTermToneClass(index)}">
          <div class="plan-term-header">
            <h4 class="plan-term-title">${escapeHtml(term.label)}</h4>
            <span class="plan-note">${term.recommendedCourses.length} saved course(s)</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>
                ${
                  term.recommendedCourses.length
                    ? term.recommendedCourses
                        .map(
                          (item) => `
                            <tr>
                              <td>${renderCourseLabel(item.course)}</td>
                            </tr>
                          `
                        )
                        .join("")
                    : renderEmptyRow(1, "No courses saved in this semester.")
                }
              </tbody>
            </table>
          </div>
        </article>
      `
    )
    .join("");

  savedPlanOutput.innerHTML = `
    <article class="plan-term saved-plan-versions-shell">
      <div class="plan-term-header">
        <div class="plan-term-heading">
          <h4 class="plan-term-title">Saved Study Plan Versions</h4>
          <span class="plan-note">${state.savedStudyPlans.length} / ${MAX_SAVED_PLAN_VERSIONS} versions saved</span>
        </div>
        <div class="saved-plan-toolbar">
          <label class="field saved-plan-picker">
            <span class="field-label">Version</span>
            <select class="field-control" data-role="saved-plan-select">
              ${versionOptionsMarkup}
            </select>
          </label>
        </div>
      </div>
      <p class="plan-note">Newest version appears first. The oldest version is removed automatically after the fifth save.</p>
      <article class="plan-term saved-plan-version">
        <div class="plan-term-header">
          <div class="plan-term-heading">
            <h4 class="plan-term-title">Version ${activeVersionIndex + 1}</h4>
            <span class="plan-note">Saved ${escapeHtml(formatDateTime(activeSavedPlan?.updatedAt))}</span>
          </div>
          <div class="row-actions">
            <button
              class="button button-secondary button-small"
              type="button"
              data-role="saved-plan-action"
              data-action="download"
              data-plan-id="${activeSavedPlan?.id}"
            >
              Download PDF
            </button>
            <button
              class="button button-secondary button-small"
              type="button"
              data-role="saved-plan-action"
              data-action="delete"
              data-plan-id="${activeSavedPlan?.id}"
            >
              Delete Version
            </button>
          </div>
        </div>
        <p class="plan-note">Start: ${escapeHtml(buildStudyTermLabel(activeSavedPlan.startTerm, activeSavedPlan.startYear))} | Study load: ${escapeHtml(String(activeSavedPlan.maxCoursesPerTerm))} course(s) per semester.</p>
        <div class="plan-stack">
          ${termMarkup}
        </div>
      </article>
    </article>
  `;
}

function renderAll() {
  renderStudentMeta();
  renderDashboardSummary();
  renderCourseRecords();
  renderRequirementBreakdown();
  renderStudyPlan();
  renderSavedPlan();
}

async function loadBaseData() {
  const [progressResponse, savedPlansResponse] = await Promise.all([
    apiGetStudentProgress(state.session.id),
    apiGetSavedStudyPlans(state.session.id)
  ]);

  if (!progressResponse.ok) {
    throw new Error(progressResponse.error);
  }

  if (!savedPlansResponse.ok) {
    throw new Error(savedPlansResponse.error);
  }

  state.progress = progressResponse.data;
  state.savedStudyPlans = savedPlansResponse.data || [];
  syncSelectedSavedPlanId();
}

async function refreshView({ includePlan = true } = {}) {
  await loadBaseData();
  if (includePlan && state.lastPlanOptions) {
    const planResponse = await apiGetStudyPlan(state.session.id, state.lastPlanOptions);
    if (planResponse.ok) {
      state.studyPlan = planResponse.data;
      state.planEditor = initializePlanEditorFromStudyPlan(state.studyPlan);
      state.planEditorDirty = false;
    }
  } else if (!includePlan) {
    state.planEditor = null;
  }
  renderAll();
}

async function syncSinglePassedSelection(row) {
  const slotCourseId = Number(row.dataset.slotCourseId || 0);
  const courseId = Number(row.dataset.courseId);
  const course = slotCourseId
    ? getChecklistCourseBySlotCourseId(slotCourseId)
    : getChecklistCourses().find((candidate) => candidate.id === courseId);
  if (!course) {
    return;
  }

  const record = course.record;
  const isChecked = row.querySelector('input[data-role="passed"]').checked;

  if (isChecked && record?.status === "passed") {
    return;
  }

  if (!isChecked && !record?.id) {
    return;
  }

  let response;

  if (isChecked && record?.id) {
    response = await apiUpdateCourseRecord(state.session.id, record.id, {
      status: "passed",
      year: null,
      term: null,
      grade: null
    });
  } else if (isChecked) {
    response = await apiCreateCourseRecord(state.session.id, {
      courseId: course.id,
      status: "passed",
      year: null,
      term: null,
      grade: null
    });
  } else {
    response = await apiDeleteCourseRecord(state.session.id, record.id);
  }

  if (!response.ok) {
    throw new Error(response.error || "Failed to update the completed-course selection.");
  }
}

async function syncMajorOptionSelection(row, select) {
  const slotCourseId = Number(select.dataset.slotCourseId || row.dataset.slotCourseId || 0);
  if (!slotCourseId) {
    return;
  }

  const selectedCourseId = select.value ? Number(select.value) : null;
  const response = await apiUpdateMajorOptionSelection(state.session.id, slotCourseId, selectedCourseId);

  if (!response.ok) {
    throw new Error(response.error || "Failed to update the approved option selection.");
  }
}

async function generateStudyPlan() {
  const options = {
    startTerm: startTerm.value,
    startYear: Number(startYear.value || 2026),
    maxCoursesPerTerm: Number(studyLoad.value || 4)
  };

  try {
    generatePlanBtn.disabled = true;
    generatePlanBtn.textContent = "Generating...";

    await refreshView({ includePlan: false });

    const response = await apiGetStudyPlan(state.session.id, options);
    if (!response.ok) {
      setMessage("bad", response.error);
      return;
    }

    state.lastPlanOptions = options;
    state.studyPlan = response.data;
    state.planEditor = initializePlanEditorFromStudyPlan(response.data);
    state.planEditorDirty = false;
    state.plannerChatMessages = [];
    clearPlanValidation();
    renderStudyPlan();
    setMessage("ok", "Study plan generated.");
  } catch (error) {
    setMessage("bad", error.message || "Failed to generate the study plan.");
  } finally {
    generatePlanBtn.disabled = false;
    generatePlanBtn.textContent = "Generate Study Plan";
  }
}

async function submitPlannerChat(event) {
  event.preventDefault();

  if (!state.planEditor) {
    setMessage("note", "Generate a study plan before using planner chat.");
    return;
  }

  const message = plannerChatInput.value.trim();
  if (!message || state.plannerChatPending) {
    return;
  }

  state.plannerChatMessages.push({ role: "user", text: message });
  state.plannerChatPending = true;
  plannerChatInput.value = "";
  renderPlannerChat();

  try {
    const response = await apiPlannerChat({
      studentId: state.session.id,
      currentPlan: clonePlanEditor(state.planEditor),
      message
    });

    if (!response.ok) {
      throw new Error(response.error || "Planner chat failed.");
    }

    if (response.updatedPlan && !response.isWhatIf) {
      const nextEditor = normalizePlannerChatEditor(response.updatedPlan);
      if (nextEditor) {
        state.planEditor = nextEditor;
        state.planEditorDirty = true;
        clearPlanEditorValidation(state.planEditor);
        applyPlanLoadValidationAnnotations(state.planEditor);
        clearPlanValidation();
        syncPlanControlValues(state.planEditor);
        renderStudyPlan();
      }
    }

    state.plannerChatMessages.push({
      role: response.isWhatIf ? "preview" : "assistant",
      text: response.summary || "Planner chat completed.",
      parsedIntent: response.parsedIntent,
      changes: response.changes || [],
      warnings: response.warnings || []
    });

    setMessage(response.warnings?.length ? "note" : "ok", response.isWhatIf ? "What-if preview generated." : "Planner chat applied.");
  } catch (error) {
    state.plannerChatMessages.push({
      role: "error",
      text: error.message || "Planner chat failed."
    });
    setMessage("bad", error.message || "Planner chat failed.");
  } finally {
    state.plannerChatPending = false;
    renderPlannerChat();
  }
}

function getPlanCourseCollection(editor, key) {
  if (!editor) {
    return null;
  }

  if (key === PLAN_HOLDING_KEY) {
    return editor.holdingAreaCourses;
  }

  const term = editor.terms.find((candidate) => buildTermKey(candidate) === key);
  return term?.courses || null;
}

function applyCourseMove(editor, fromTermKey, toTermKey, courseId) {
  if (!editor || fromTermKey === toTermKey) {
    return false;
  }

  const sourceCourses = getPlanCourseCollection(editor, fromTermKey);
  const targetCourses = getPlanCourseCollection(editor, toTermKey);
  if (!sourceCourses || !targetCourses) {
    return false;
  }

  const courseIndex = sourceCourses.findIndex((item) => item.course.id === courseId);
  if (courseIndex < 0) {
    return false;
  }

  const [movedCourse] = sourceCourses.splice(courseIndex, 1);
  targetCourses.push(movedCourse);
  return true;
}

function buildStudyPlanPayload(editor = state.planEditor) {
  if (!editor) {
    return null;
  }

  return {
    startTerm: editor.startTerm,
    startYear: editor.startYear,
    maxCoursesPerTerm: editor.maxCoursesPerTerm,
    terms: editor.terms.map((term) => ({
      termCode: term.termCode,
      year: term.year,
      courseIds: term.courses.map((item) => item.course.id)
    }))
  };
}

function findPlanTermIndex(editor, termKey) {
  if (!editor) {
    return -1;
  }

  return editor.terms.findIndex((term) => buildTermKey(term) === termKey);
}

function insertEmptySemester(termKey, direction) {
  if (!state.planEditor) {
    return;
  }

  const candidateEditor = clonePlanEditor(state.planEditor);
  const termIndex = findPlanTermIndex(candidateEditor, termKey);
  if (termIndex < 0) {
    return;
  }

  const baseTerm = candidateEditor.terms[termIndex];
  const adjacentTerm = direction === "left" ? previousPlanTerm(baseTerm) : nextPlanTerm(baseTerm);
  const adjacentKey = `${adjacentTerm.year}-${adjacentTerm.termCode}`;
  const adjacentLabel = buildStudyTermLabel(adjacentTerm.termCode, adjacentTerm.year);

  if (findPlanTermIndex(candidateEditor, adjacentKey) >= 0) {
    showPlanPreventModal([`${adjacentLabel} is already in the study plan.`], "Semester Already Exists");
    return;
  }

  candidateEditor.terms.push({
    termCode: adjacentTerm.termCode,
    year: adjacentTerm.year,
    label: adjacentLabel,
    courses: []
  });

  applyPlanTermMetadata(candidateEditor);
  syncPlanControlValues(candidateEditor);
  clearPlanEditorValidation(candidateEditor);
  applyPlanLoadValidationAnnotations(candidateEditor);
  state.planEditor = candidateEditor;
  state.planEditorDirty = true;
  closePlanPreventModal();
  clearPlanValidation();
  renderStudyPlan();
  setMessage("ok", `${adjacentLabel} added to the study plan.`);
}

async function deleteEmptySemester(termKey) {
  if (!state.planEditor) {
    return;
  }

  const candidateEditor = clonePlanEditor(state.planEditor);
  const termIndex = findPlanTermIndex(candidateEditor, termKey);
  if (termIndex < 0) {
    return;
  }

  const term = candidateEditor.terms[termIndex];
  const label = buildStudyTermLabel(term.termCode, term.year);

  if (candidateEditor.terms.length === 1) {
    showPlanPreventModal(["At least one semester must remain in the study plan."], "Semester Cannot Be Deleted");
    return;
  }

  const movedCourses = term.courses.splice(0, term.courses.length);
  if (movedCourses.length) {
    candidateEditor.holdingAreaCourses.push(...movedCourses);
  }

  candidateEditor.terms.splice(termIndex, 1);

  applyPlanTermMetadata(candidateEditor);
  syncPlanControlValues(candidateEditor);
  clearPlanEditorValidation(candidateEditor);
  applyPlanLoadValidationAnnotations(candidateEditor);

  const payload = buildStudyPlanPayload(candidateEditor);
  if (payload) {
    try {
      state.planMovePending = true;
      const response = await apiValidateStudyPlan(state.session.id, payload, { scope: "drag" });
      if (!response.ok) {
        applyPlanValidationAnnotations(
          candidateEditor,
          response.details?.length ? response.details : [response.error || "Please review semester placements before saving the study plan."]
        );
      }
    } catch (error) {
      candidateEditor.generalValidationIssues = [error.message || "The updated plan could not be revalidated automatically."];
    } finally {
      state.planMovePending = false;
    }
  }

  state.planEditor = candidateEditor;
  state.planEditorDirty = true;
  closePlanPreventModal();
  clearPlanValidation();

  renderStudyPlan();
  setMessage(
    editorHasValidationIssues(candidateEditor) ? "note" : "ok",
    movedCourses.length
      ? `${label} removed. ${movedCourses.length} course(s) moved to the temporary holding area.`
      : `${label} removed from the study plan.`
  );
}

async function moveCourseBetweenTerms(fromTermKey, toTermKey, courseId) {
  if (!state.planEditor || state.planMovePending || fromTermKey === toTermKey) {
    return;
  }

  const candidateEditor = clonePlanEditor(state.planEditor);
  const moveApplied = applyCourseMove(candidateEditor, fromTermKey, toTermKey, courseId);
  if (!moveApplied) {
    return;
  }

  if (toTermKey === PLAN_HOLDING_KEY) {
    const payload = buildStudyPlanPayload(candidateEditor);
    clearPlanEditorValidation(candidateEditor);
    applyPlanLoadValidationAnnotations(candidateEditor);

    if (payload) {
      try {
        state.planMovePending = true;
        const response = await apiValidateStudyPlan(state.session.id, payload, { scope: "drag" });
        if (!response.ok) {
          applyPlanValidationAnnotations(
            candidateEditor,
            response.details?.length
              ? response.details
              : [response.error || "Please review the semester order before saving the study plan."]
          );
        }
      } catch {
        clearPlanEditorValidation(candidateEditor);
        applyPlanLoadValidationAnnotations(candidateEditor);
      } finally {
        state.planMovePending = false;
      }
    }

    state.planEditor = candidateEditor;
    state.planEditorDirty = true;
    closePlanPreventModal();
    clearPlanValidation();
    renderStudyPlan();
    return;
  }

  const payload = buildStudyPlanPayload(candidateEditor);
  const movingOutOfHoldingArea = fromTermKey === PLAN_HOLDING_KEY;
  const currentPlanHasIssues = editorHasValidationIssues(state.planEditor);

  try {
    state.planMovePending = true;
    const response = await apiValidateStudyPlan(state.session.id, payload, { scope: "drag" });
    if (!response.ok) {
      if (movingOutOfHoldingArea || currentPlanHasIssues) {
        clearPlanEditorValidation(candidateEditor);
        applyPlanLoadValidationAnnotations(candidateEditor);
        applyPlanValidationAnnotations(
          candidateEditor,
          response.details?.length
            ? response.details
            : [response.error || "Please review the semester order before saving the study plan."]
        );
        state.planEditor = candidateEditor;
        state.planEditorDirty = true;
        closePlanPreventModal();
        clearPlanValidation();
        renderStudyPlan();
        setMessage("note", "Plan updated. Review any red lock markers before saving.");
        return;
      }

      clearPlanValidation();
      showPlanPreventModal(response.details?.length ? response.details : [response.error || "The selected move is not valid."], "Course Move Not Allowed");
      return;
    }

    state.planEditor = candidateEditor;
    state.planEditorDirty = true;
    clearPlanEditorValidation(state.planEditor);
    applyPlanLoadValidationAnnotations(state.planEditor);
    closePlanPreventModal();
    clearPlanValidation();
    renderStudyPlan();
  } catch (error) {
    clearPlanValidation();
    showPlanPreventModal([error.message || "The selected move could not be validated."], "Course Move Not Allowed");
  } finally {
    state.planMovePending = false;
  }
}

async function saveCurrentPlan() {
  if (state.planEditor?.holdingAreaCourses?.length) {
    setPlanValidation("bad", [
      `Move ${state.planEditor.holdingAreaCourses.length} unscheduled course(s) out of the temporary holding area before saving the study plan.`
    ]);
    return;
  }

  const payload = buildStudyPlanPayload();
  if (!payload) {
    return;
  }

  try {
    savePlanBtn.disabled = true;
    savePlanBtn.textContent = "Saving...";
    clearPlanValidation();

    const response = await apiSaveStudyPlan(state.session.id, payload);
    if (!response.ok) {
      clearPlanEditorValidation(state.planEditor);
      applyPlanLoadValidationAnnotations(state.planEditor);
      applyPlanValidationAnnotations(
        state.planEditor,
        response.details?.length ? response.details : [response.error || "The study plan could not be saved."]
      );
      renderStudyPlan();
      setMessage("bad", "Review the marked semesters and courses before saving.");
      return;
    }

    const versionsResponse = await apiGetSavedStudyPlans(state.session.id);
    if (!versionsResponse.ok) {
      throw new Error(versionsResponse.error || "The saved versions list could not be refreshed.");
    }

    state.savedStudyPlans = versionsResponse.data || [];
    state.selectedSavedPlanId = state.savedStudyPlans[0]?.id ?? null;
    state.planEditorDirty = false;
    clearPlanEditorValidation(state.planEditor);
    applyPlanLoadValidationAnnotations(state.planEditor);
    setPlanValidation("ok", [`Study plan saved successfully. ${state.savedStudyPlans.length} / ${MAX_SAVED_PLAN_VERSIONS} versions stored.`]);
    renderStudyPlan();
    renderSavedPlan();
    setMessage("ok", "Study plan saved as a new version.");
  } catch (error) {
    setPlanValidation("bad", [error.message || "The study plan could not be saved."]);
  } finally {
    savePlanBtn.disabled = false;
    savePlanBtn.textContent = "Save Plan";
  }
}

function buildPrintablePlanHtml(savedPlan) {
  const student = state.progress?.student;
  const termMarkup = savedPlan.terms
    .map(
      (term, index) => `
        <section class="print-term ${getPlanTermToneClass(index)}">
          <h2>${escapeHtml(term.label)}</h2>
          <table>
            <thead>
              <tr>
                <th>Course</th>
              </tr>
            </thead>
            <tbody>
              ${term.recommendedCourses.length
                ? term.recommendedCourses
                    .map(
                      (item) => `
                        <tr>
                          <td>
                            <strong>${escapeHtml(item.course.code)}</strong><br />
                            ${escapeHtml(item.course.name)}<br />
                            <span>${item.course.electiveSlot ? "Elective slot" : `${item.course.level}-level`} | ${item.course.units} units</span>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : '<tr><td><span>No courses scheduled in this semester.</span></td></tr>'}
            </tbody>
          </table>
        </section>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Saved Study Plan</title>
        <style>
          body { font-family: "Public Sans", "Segoe UI", Arial, sans-serif; color: #172433; margin: 32px; }
          h1, h2 { font-family: "Public Sans", "Segoe UI", Arial, sans-serif; margin: 0 0 12px; letter-spacing: -0.02em; }
          h1 { font-size: 28px; font-weight: 800; }
          h2 { font-size: 18px; font-weight: 700; color: #16324a; }
          p { margin: 0 0 8px; color: #5f6f82; }
          .print-term { margin-top: 24px; border-top: 3px solid #2f5b86; padding-top: 10px; }
          .print-term.plan-term-tone-2 { border-top-color: #496755; }
          .print-term.plan-term-tone-3 { border-top-color: #7b5e41; }
          .print-term.plan-term-tone-4 { border-top-color: #506578; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d6dbe2; padding: 10px 12px; text-align: left; vertical-align: top; }
          th { background: #edf2f7; color: #16324a; text-transform: uppercase; font-size: 12px; letter-spacing: 0.04em; }
          span { color: #607181; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Saved Study Plan</h1>
        <p>${escapeHtml(student?.name || "Student")}</p>
        <p>${escapeHtml(student?.program?.name || "")} - ${escapeHtml(student?.major?.name || "")}</p>
        <p>Study load: ${escapeHtml(String(savedPlan.maxCoursesPerTerm))} course(s) per semester</p>
        ${termMarkup}
      </body>
    </html>
  `;
}

function downloadSavedPlanPdf(savedPlan = getActiveSavedPlan()) {
  if (!savedPlan) {
    return;
  }

  const printWindow = window.open("", "_blank", "width=960,height=780");
  if (!printWindow) {
    setPlanValidation("bad", ["The PDF window could not be opened. Please allow pop-ups and try again."]);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintablePlanHtml(savedPlan));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

async function init() {
  state.session = loadSession();
  if (!state.session?.id) {
    window.location.href = "login.html";
    return;
  }

  logoutBtn.addEventListener("click", logout);

  planPreventModalCloseBtn?.addEventListener("click", closePlanPreventModal);
  planPreventModal?.addEventListener("click", (event) => {
    if (event.target === planPreventModal) {
      closePlanPreventModal();
    }
  });

  courseSearch.addEventListener("input", () => {
    state.searchQuery = courseSearch.value.trim();
    renderCourseRecords();
  });

  courseRecordsBody.addEventListener("change", async (event) => {
    const optionSelect = event.target.closest('select[data-role="major-option"]');
    if (optionSelect) {
      clearMessage();
      clearPlanValidation();
      closePlanPreventModal();
      const row = optionSelect.closest("tr");
      const previousValue = optionSelect.dataset.selectedValue || "";
      row.style.opacity = "0.65";

      try {
        await syncMajorOptionSelection(row, optionSelect);
        await refreshView({ includePlan: Boolean(state.lastPlanOptions) });
        setMessage("ok", state.lastPlanOptions ? "Approved option updated. Study plan refreshed." : "Approved option updated.");
      } catch (error) {
        optionSelect.value = previousValue;
        setMessage("bad", error.message || "Failed to update the approved option selection.");
      } finally {
        row.style.opacity = "";
      }
      return;
    }

    const input = event.target.closest('input[data-role="passed"]');
    if (!input) {
      return;
    }

    clearMessage();
    const row = input.closest("tr");
    row.style.opacity = "0.65";

    try {
      await syncSinglePassedSelection(row);
      await refreshView({ includePlan: Boolean(state.lastPlanOptions) });
      setMessage("ok", "Completed courses updated.");
    } catch (error) {
      input.checked = !input.checked;
      setMessage("bad", error.message || "Failed to update completed courses.");
    } finally {
      row.style.opacity = "";
    }
  });

  generatePlanBtn.addEventListener("click", async () => {
    clearMessage();
    closePlanPreventModal();
    await generateStudyPlan();
  });

  savePlanBtn.addEventListener("click", async () => {
    clearMessage();
    closePlanPreventModal();
    await saveCurrentPlan();
  });

  downloadPdfBtn.addEventListener("click", () => {
    clearMessage();
    closePlanPreventModal();
    downloadSavedPlanPdf();
  });

  plannerChatForm?.addEventListener("submit", submitPlannerChat);

  savedPlanOutput.addEventListener("click", async (event) => {
    const actionButton = event.target.closest('button[data-role="saved-plan-action"]');
    if (!actionButton) {
      return;
    }

    const planId = Number(actionButton.dataset.planId || 0);
    if (!planId) {
      return;
    }

    const action = actionButton.dataset.action;
    if (action === "download") {
      const targetPlan = getSavedPlanById(planId);
      if (targetPlan) {
        downloadSavedPlanPdf(targetPlan);
      }
      return;
    }

    if (action === "delete") {
      clearMessage();
      closePlanPreventModal();
      const response = await apiDeleteSavedStudyPlanVersion(state.session.id, planId);
      if (!response.ok) {
        setMessage("bad", response.error || "Failed to delete the saved version.");
        return;
      }

      state.savedStudyPlans = response.data || [];
      syncSelectedSavedPlanId();
      renderSavedPlan();
      setMessage("ok", "Saved version deleted.");
    }
  });

  savedPlanOutput.addEventListener("change", (event) => {
    const versionSelect = event.target.closest('select[data-role="saved-plan-select"]');
    if (!versionSelect) {
      return;
    }

    state.selectedSavedPlanId = Number(versionSelect.value || 0) || null;
    renderSavedPlan();
  });

  planValidationBox.addEventListener("click", (event) => {
    const dismissButton = event.target.closest('button[data-role="dismiss-plan-validation"]');
    if (!dismissButton) {
      return;
    }

    clearPlanValidation();
  });

  studyPlanOutput.addEventListener("click", async (event) => {
    const actionButton = event.target.closest(".plan-term-action");
    if (!actionButton) {
      return;
    }

    clearMessage();
    clearPlanValidation();
    const termKey = actionButton.dataset.termKey;
    const action = actionButton.dataset.action;

    if (action === "add-left") {
      insertEmptySemester(termKey, "left");
      return;
    }

    if (action === "add-right") {
      insertEmptySemester(termKey, "right");
      return;
    }

    if (action === "delete-term") {
      await deleteEmptySemester(termKey);
    }
  });

  studyPlanOutput.addEventListener("dragstart", (event) => {
    if (state.planMovePending) {
      event.preventDefault();
      return;
    }

    const card = event.target.closest(".plan-course-card");
    if (!card) {
      return;
    }

    state.draggedCourseId = Number(card.dataset.courseId);
    state.draggedFromTermKey = card.dataset.termKey;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(state.draggedCourseId));
  });

  studyPlanOutput.addEventListener("dragover", (event) => {
    const dropzone = event.target.closest(".plan-dropzone");
    if (!dropzone || !state.draggedCourseId) {
      return;
    }

    event.preventDefault();
    dropzone.classList.add("is-drop-target");
  });

  studyPlanOutput.addEventListener("dragleave", (event) => {
    const dropzone = event.target.closest(".plan-dropzone");
    if (!dropzone) {
      return;
    }

    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove("is-drop-target");
    }
  });

  studyPlanOutput.addEventListener("drop", async (event) => {
    const dropzone = event.target.closest(".plan-dropzone");
    if (!dropzone || !state.draggedCourseId || !state.draggedFromTermKey) {
      return;
    }

    event.preventDefault();
    dropzone.classList.remove("is-drop-target");
    const draggedCourseId = state.draggedCourseId;
    const draggedFromTermKey = state.draggedFromTermKey;
    const targetTermKey = dropzone.dataset.termKey;
    state.draggedCourseId = null;
    state.draggedFromTermKey = null;
    await moveCourseBetweenTerms(draggedFromTermKey, targetTermKey, draggedCourseId);
  });

  studyPlanOutput.addEventListener("dragend", () => {
    studyPlanOutput.querySelectorAll(".plan-dropzone").forEach((dropzone) => {
      dropzone.classList.remove("is-drop-target");
    });
    studyPlanOutput.querySelectorAll(".plan-course-card").forEach((card) => {
      card.classList.remove("is-dragging");
    });
    state.draggedCourseId = null;
    state.draggedFromTermKey = null;
  });

  try {
    await refreshView({ includePlan: false });
  } catch (error) {
    setMessage("bad", error.message || "Failed to load the advising dashboard.");
  }
}

init();



