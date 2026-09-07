const BASE = "http://localhost:3001/api";

async function jfetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return data || { ok: false, error: `Request failed with status ${res.status}.` };
  }

  return data || { ok: false, error: "Invalid JSON response" };
}

export async function apiLogin(studentId) {
  return jfetch(`${BASE}/login`, {
    method: "POST",
    body: JSON.stringify({ studentId })
  });
}

export async function apiGetPrograms() {
  return jfetch(`${BASE}/programs`, { method: "GET" });
}

export async function apiGetProgram(programId) {
  return jfetch(`${BASE}/programs/${encodeURIComponent(programId)}`, { method: "GET" });
}

export async function apiGetMajor(majorId) {
  return jfetch(`${BASE}/majors/${encodeURIComponent(majorId)}`, { method: "GET" });
}

export async function apiGetCourse(courseId) {
  return jfetch(`${BASE}/courses/${encodeURIComponent(courseId)}`, { method: "GET" });
}

export async function apiGetStudentProgress(studentId) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/progress`, { method: "GET" });
}

export async function apiGetEligibleCourses(studentId, term = "") {
  const query = term ? `?term=${encodeURIComponent(term)}` : "";
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/eligible-courses${query}`, {
    method: "GET"
  });
}

export async function apiGetStudyPlan(studentId, { startTerm, startYear, maxCoursesPerTerm }) {
  const params = new URLSearchParams({
    startTerm,
    startYear: String(startYear),
    maxCoursesPerTerm: String(maxCoursesPerTerm)
  });

  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/study-plan?${params}`, {
    method: "GET"
  });
}

export async function apiGetSavedStudyPlans(studentId) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/saved-study-plans`, {
    method: "GET"
  });
}

export async function apiGetSavedStudyPlan(studentId) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/saved-study-plan`, {
    method: "GET"
  });
}

export async function apiSaveStudyPlan(studentId, payload) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/saved-study-plan`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function apiDeleteSavedStudyPlanVersion(studentId, planId) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/saved-study-plan/${encodeURIComponent(planId)}`, {
    method: "DELETE"
  });
}

export async function apiValidateStudyPlan(studentId, payload, { scope = "save" } = {}) {
  const params = new URLSearchParams({ scope });
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/saved-study-plan/validate?${params}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function apiPlannerChat({ studentId, currentPlan, message }) {
  return jfetch(`${BASE}/planner/chat`, {
    method: "POST",
    body: JSON.stringify({
      studentId,
      currentPlan,
      message
    })
  });
}

export async function apiCreateCourseRecord(studentId, payload) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/course-records`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function apiUpdateCourseRecord(studentId, recordId, payload) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/course-records/${encodeURIComponent(recordId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function apiDeleteCourseRecord(studentId, recordId) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/course-records/${encodeURIComponent(recordId)}`, {
    method: "DELETE"
  });
}

export async function apiUpdateMajorOptionSelection(studentId, slotCourseId, selectedCourseId) {
  return jfetch(`${BASE}/students/${encodeURIComponent(studentId)}/major-option-selections/${encodeURIComponent(slotCourseId)}`, {
    method: "PUT",
    body: JSON.stringify({ selectedCourseId })
  });
}
