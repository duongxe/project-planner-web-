import { apiLogin } from "./api.js";

const form = document.getElementById("loginForm");
const studentIdInput = document.getElementById("studentId");
const msg = document.getElementById("loginMessage");
const clearBtn = document.getElementById("clearSessionBtn");

function showMessage(kind, text) {
  msg.className = `message message-${kind}`;
  msg.textContent = text;
}

function clearMessage() {
  msg.className = "message";
  msg.textContent = "";
}

function saveSession(profile) {
  localStorage.setItem("uontool_session", JSON.stringify(profile));
}

function hasSession() {
  const raw = localStorage.getItem("uontool_session");
  if (!raw) {
    return false;
  }

  try {
    const session = JSON.parse(raw);
    return Boolean(session?.id);
  } catch {
    return false;
  }
}

if (hasSession()) {
  window.location.href = "planner.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const studentId = studentIdInput.value.trim();
  if (!studentId) {
    showMessage("bad", "Please enter a student ID.");
    return;
  }

  const response = await apiLogin(studentId);
  if (!response.ok) {
    showMessage("bad", response.error);
    return;
  }

  saveSession(response.data);
  showMessage("ok", "Student profile loaded. Redirecting to the advising dashboard.");
  setTimeout(() => {
    window.location.href = "planner.html";
  }, 250);
});

clearBtn.addEventListener("click", () => {
  localStorage.removeItem("uontool_session");
  clearMessage();
  showMessage("ok", "Stored session cleared.");
});
