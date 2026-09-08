"use strict";

const STREAMS = {
  bio: {
    name: "Biological Science",
    short: "Bio",
    icon: "⌁",
    baskets: [
      { label: "Basket 1", choices: ["Physics", "Agricultural Science"] },
      { label: "Basket 2", choices: ["Chemistry", "ICT", "Business Studies"] },
      { label: "Main subject", fixed: "Biology" }
    ]
  },
  maths: {
    name: "Physical Science",
    short: "Maths",
    icon: "∑",
    baskets: [
      { label: "Main subject", fixed: "Physics" },
      { label: "Basket 2", choices: ["Chemistry", "ICT", "Business Studies"] },
      { label: "Main subject", fixed: "Combined Mathematics" }
    ]
  },
  tech: {
    name: "Technology",
    short: "Technology",
    icon: "⚙",
    baskets: [
      { label: "Main subject", fixed: "Science for Technology" },
      { label: "Basket 2", choices: ["Engineering Technology", "Bio Systems Technology"] },
      { label: "Basket 3", choices: ["ICT", "Agricultural Science"] }
    ]
  },
  commerce: {
    name: "Commerce",
    short: "Commerce",
    icon: "↗",
    baskets: [
      { label: "Main subject", fixed: "Economics" },
      { label: "Main subject", fixed: "Accounting" },
      { label: "Basket 3", choices: ["Business Studies", "Business Statistics", "ICT", "English Literature"] }
    ]
  },
  arts: {
    name: "Arts",
    short: "Arts",
    icon: "✦",
    baskets: [
      { label: "Basket 1", choices: ["Logic", "Home Science", "Communication & Media Studies"] },
      { label: "Basket 2", choices: ["Economics", "Christianity", "History"] },
      { label: "Basket 3", choices: ["Business Statistics", "Business Studies", "Geography", "ICT", "English Literature", "Political Science"] }
    ]
  }
};

const SUBJECT_COLORS = ["#4f8cff", "#9b6cff", "#2dd4a7", "#ff9e64", "#ef6fff", "#22c6e8"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const START_HOUR = 0;
const END_HOUR = 24;
const STORAGE_PROFILE = "alTimetableProfileV1";
const STORAGE_SESSIONS = "alTimetableSessionsV1";

const $ = (selector) => document.querySelector(selector);
const setupScreen = $("#setupScreen");
const streamGrid = $("#streamGrid");
const subjectForm = $("#subjectForm");
const basketList = $("#basketList");
const app = $("#app");
const subjectList = $("#subjectList");
const timetable = $("#timetable");
const sessionModal = $("#sessionModal");
const sessionForm = $("#sessionForm");

let profile = safeParse(localStorage.getItem(STORAGE_PROFILE), null);
let sessions = safeParse(localStorage.getItem(STORAGE_SESSIONS), []);
let selectedStream = profile?.stream || null;
let editingId = null;
let toastTimer = null;

function safeParse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"})[char]);
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveAll() {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
  localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderStreamCards() {
  streamGrid.innerHTML = Object.entries(STREAMS).map(([key, stream]) => `
    <button type="button" class="stream-card ${selectedStream === key ? "selected" : ""}" data-stream="${key}" role="radio" aria-checked="${selectedStream === key}">
      <span class="stream-icon">${stream.icon}</span>
      <strong>${stream.short}</strong>
      <small>${stream.name}</small>
    </button>`).join("");
}

function chooseStream(key, retainSelections = false) {
  selectedStream = key;
  renderStreamCards();
  renderBaskets(retainSelections ? profile?.subjects : []);
  streamGrid.hidden = true;
  subjectForm.hidden = false;
}

function renderBaskets(previous = []) {
  const stream = STREAMS[selectedStream];
  $("#basketTitle").textContent = `${stream.short} stream subjects`;
  basketList.innerHTML = stream.baskets.map((basket, index) => {
    const content = basket.fixed
      ? `<span class="fixed-subject">${basket.fixed}</span>`
      : `<div class="radio-grid">${basket.choices.map(subject => `
          <label class="subject-option">
            <input type="radio" name="basket-${index}" value="${escapeHtml(subject)}" ${previous.includes(subject) ? "checked" : ""}>
            <span>${subject}</span>
          </label>`).join("")}</div>`;
    return `<section class="basket">
      <div class="basket-head"><strong>${basket.label}</strong>${basket.fixed ? '<span class="fixed-badge">FIXED</span>' : '<span class="fixed-badge">CHOOSE ONE</span>'}</div>
      ${content}
    </section>`;
  }).join("");
}

function getSelectedSubjects() {
  return STREAMS[selectedStream].baskets.map((basket, index) => {
    if (basket.fixed) return basket.fixed;
    return subjectForm.querySelector(`input[name="basket-${index}"]:checked`)?.value || null;
  });
}

function openSetup(editing = false) {
  setupScreen.hidden = false;
  app.hidden = true;
  $("#setupError").textContent = "";
  selectedStream = editing && profile ? profile.stream : null;
  renderStreamCards();
  if (editing && selectedStream) {
    streamGrid.hidden = true;
    subjectForm.hidden = false;
    renderBaskets(profile.subjects);
  } else {
    streamGrid.hidden = false;
    subjectForm.hidden = true;
  }
}

function finishSetup(event) {
  event.preventDefault();
  const subjects = getSelectedSubjects();
  if (subjects.some(subject => !subject)) {
    $("#setupError").textContent = "Choose one subject from every optional basket.";
    return;
  }
  const previousSubjects = profile?.subjects || [];
  profile = { stream: selectedStream, subjects };
  if (previousSubjects.length) {
    sessions = sessions.filter(item => subjects.includes(item.subject));
  }
  saveAll();
  setupScreen.hidden = true;
  app.hidden = false;
  renderApp();
  showToast("Your subjects are ready");
}

function subjectColor(subject) {
  const index = Math.max(0, profile.subjects.indexOf(subject));
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function renderApp() {
  const stream = STREAMS[profile.stream];
  $("#profileSummary").textContent = `${stream.name} · ${profile.subjects.join(" · ")}`;
  subjectList.innerHTML = profile.subjects.map((subject, index) => `
    <button class="subject-chip" type="button" draggable="true" data-subject="${escapeHtml(subject)}" style="--subject:${SUBJECT_COLORS[index % SUBJECT_COLORS.length]}">
      <strong>${subject}</strong><small>Drag or tap to add</small>
    </button>`).join("");
  buildTimetable();
  renderSessions();
  updateStats();
  wireSubjectChips();
}

function buildTimetable() {
  timetable.innerHTML = '<div class="corner">TIME</div>';
  DAYS.forEach((day, index) => {
    const head = document.createElement("div");
    head.className = "day-head";
    head.style.gridColumn = index + 2;
    head.style.gridRow = 1;
    head.innerHTML = `${day.slice(0, 3)}<span>${day}</span>`;
    timetable.appendChild(head);
  });

  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    const row = hour - START_HOUR + 2;
    const time = document.createElement("div");
    time.className = "time-label";
    time.style.gridColumn = 1;
    time.style.gridRow = row;
    time.textContent = formatHour(hour);
    timetable.appendChild(time);

    DAYS.forEach((_, day) => {
      const cell = document.createElement("div");
      cell.className = "time-cell";
      cell.dataset.day = day;
      cell.dataset.hour = hour;
      cell.style.gridColumn = day + 2;
      cell.style.gridRow = row;
      cell.addEventListener("dragover", event => { event.preventDefault(); cell.classList.add("drag-over"); });
      cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
      cell.addEventListener("drop", event => handleDrop(event, cell));
      cell.addEventListener("dblclick", () => openSessionModal(null, { day, start: `${String(hour).padStart(2,"0")}:00` }));
      timetable.appendChild(cell);
    });
  }

  DAYS.forEach((_, day) => {
    const layer = document.createElement("div");
    layer.className = "session-layer";
    layer.dataset.layerDay = day;
    layer.style.gridColumn = day + 2;
    layer.style.gridRow = `2 / ${END_HOUR - START_HOUR + 2}`;
    timetable.appendChild(layer);
  });
}

function wireSubjectChips() {
  document.querySelectorAll(".subject-chip").forEach(chip => {
    chip.addEventListener("dragstart", event => {
      event.dataTransfer.setData("application/x-subject", chip.dataset.subject);
      event.dataTransfer.effectAllowed = "copy";
    });
    chip.addEventListener("click", () => openSessionModal(null, { subject: chip.dataset.subject }));
  });
}

function renderSessions() {
  document.querySelectorAll(".session-layer").forEach(layer => layer.innerHTML = "");
  sessions.forEach(item => {
    const layer = document.querySelector(`[data-layer-day="${item.day}"]`);
    if (!layer) return;
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);
    const top = ((start - START_HOUR * 60) / 60) * 76;
    const height = Math.max(42, ((end - start) / 60) * 76 - 4);
    const card = document.createElement("article");
    card.className = `session-card ${item.completed ? "completed" : ""}`;
    card.draggable = true;
    card.dataset.id = item.id;
    card.style.top = `${top}px`;
    card.style.height = `${height}px`;
    card.style.setProperty("--subject", subjectColor(item.subject));
    card.innerHTML = `
      <strong class="session-title">${escapeHtml(item.title)}</strong>
      <span class="session-meta">${escapeHtml(shortSubject(item.subject))} · ${formatTime(item.start)}–${formatTime(item.end)}</span>
      ${item.notes ? `<span class="session-note">${escapeHtml(item.notes)}</span>` : ""}
      <button class="complete-button" type="button" aria-label="${item.completed ? "Mark incomplete" : "Mark complete"}">✓</button>`;
    card.addEventListener("click", event => {
      if (event.target.closest(".complete-button")) return;
      openSessionModal(item.id);
    });
    card.querySelector(".complete-button").addEventListener("click", event => {
      event.stopPropagation();
      item.completed = !item.completed;
      saveAll(); renderSessions(); updateStats();
    });
    card.addEventListener("dragstart", event => {
      event.dataTransfer.setData("application/x-session", item.id);
      event.dataTransfer.effectAllowed = "move";
    });
    layer.appendChild(card);
  });
}

function handleDrop(event, cell) {
  event.preventDefault();
  cell.classList.remove("drag-over");
  const subject = event.dataTransfer.getData("application/x-subject");
  const sessionId = event.dataTransfer.getData("application/x-session");
  const day = Number(cell.dataset.day);
  const hour = Number(cell.dataset.hour);

  if (subject) {
    const droppedStart = `${String(hour).padStart(2,"0")}:00`;
    sessions.push({ id: uid(), subject, title: `${shortSubject(subject)} study`, day, start: droppedStart, end: addMinutes(droppedStart, 60), notes: "", completed: false });
    saveAll(); renderSessions(); updateStats(); showToast("Period added — tap it to edit");
  } else if (sessionId) {
    const item = sessions.find(session => session.id === sessionId);
    if (!item) return;
    const duration = timeToMinutes(item.end) - timeToMinutes(item.start);
    const newEnd = Math.min(hour * 60 + duration, 23 * 60 + 59);
    item.day = day;
    item.start = minutesToTime(hour * 60);
    item.end = minutesToTime(newEnd);
    saveAll(); renderSessions(); showToast("Period moved");
  }
}

function openSessionModal(id = null, defaults = {}) {
  editingId = id;
  const item = id ? sessions.find(session => session.id === id) : null;
  const selectedSubject = item?.subject || defaults.subject || profile.subjects[0];
  $("#modalTitle").textContent = item ? "Edit period" : "Add a period";
  $("#sessionSubject").innerHTML = profile.subjects.map(subject => `<option value="${escapeHtml(subject)}" ${subject === selectedSubject ? "selected" : ""}>${subject}</option>`).join("");
  $("#sessionDay").innerHTML = DAYS.map((day, index) => `<option value="${index}" ${(item?.day ?? defaults.day ?? 0) === index ? "selected" : ""}>${day}</option>`).join("");
  $("#sessionTitle").value = item?.title || (defaults.subject ? `${shortSubject(defaults.subject)} study` : "Study session");
  $("#sessionStart").value = item?.start || defaults.start || "16:00";
  $("#sessionEnd").value = item?.end || addMinutes(defaults.start || "16:00", 60);
  $("#sessionNotes").value = item?.notes || "";
  $("#sessionError").textContent = "";
  $("#deleteSessionBtn").hidden = !item;
  sessionModal.hidden = false;
  setTimeout(() => $("#sessionTitle").focus(), 30);
}

function closeSessionModal() {
  sessionModal.hidden = true;
  editingId = null;
  sessionForm.reset();
}

function saveSession(event) {
  event.preventDefault();
  const start = $("#sessionStart").value;
  const end = $("#sessionEnd").value;
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    $("#sessionError").textContent = "End time must be later than the start time.";
    return;
  }
  if (timeToMinutes(start) < START_HOUR * 60 || timeToMinutes(end) > END_HOUR * 60) {
    $("#sessionError").textContent = "Choose a time between 12:00 AM and 11:59 PM.";
    return;
  }
  const data = {
    subject: $("#sessionSubject").value,
    title: $("#sessionTitle").value.trim(),
    day: Number($("#sessionDay").value),
    start,
    end,
    notes: $("#sessionNotes").value.trim()
  };
  const wasEditing = Boolean(editingId);
  if (editingId) Object.assign(sessions.find(item => item.id === editingId), data);
  else sessions.push({ id: uid(), ...data, completed: false });
  saveAll(); closeSessionModal(); renderSessions(); updateStats(); showToast(wasEditing ? "Period updated" : "Period added");
}

function deleteSession() {
  if (!editingId) return;
  sessions = sessions.filter(item => item.id !== editingId);
  saveAll(); closeSessionModal(); renderSessions(); updateStats(); showToast("Period deleted");
}

function updateStats() {
  const completed = sessions.filter(item => item.completed).length;
  const percent = sessions.length ? Math.round(completed / sessions.length * 100) : 0;
  $("#totalPeriods").textContent = sessions.length;
  $("#completedPeriods").textContent = completed;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
}

function resetCompletion() {
  sessions.forEach(item => item.completed = false);
  saveAll(); renderSessions(); updateStats(); showToast("Weekly completion reset");
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const safe = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${String(Math.floor(safe / 60)).padStart(2,"0")}:${String(safe % 60).padStart(2,"0")}`;
}

function addMinutes(time, amount) { return minutesToTime(timeToMinutes(time) + amount); }
function formatHour(hour) { return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`; }
function formatTime(time) { const [h, m] = time.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h < 12 ? "AM" : "PM"}`; }
function shortSubject(subject) {
  const abbreviations = { "Science for Technology": "SFT", "Engineering Technology": "ET", "Bio Systems Technology": "BST", "Combined Mathematics": "Combined Maths", "Agricultural Science": "Agriculture", "Communication & Media Studies": "Media", "Business Statistics": "Business Stats", "English Literature": "English Lit" };
  return abbreviations[subject] || subject;
}

streamGrid.addEventListener("click", event => {
  const card = event.target.closest("[data-stream]");
  if (card) chooseStream(card.dataset.stream);
});
subjectForm.addEventListener("submit", finishSetup);
$("#changeStreamBtn").addEventListener("click", () => { subjectForm.hidden = true; streamGrid.hidden = false; selectedStream = null; renderStreamCards(); });
$("#editSubjectsBtn").addEventListener("click", () => openSetup(true));
$("#addSessionBtn").addEventListener("click", () => openSessionModal());
$("#resetAttendanceBtn").addEventListener("click", resetCompletion);
sessionForm.addEventListener("submit", saveSession);
$("#deleteSessionBtn").addEventListener("click", deleteSession);
document.querySelectorAll("[data-close-modal]").forEach(element => element.addEventListener("click", closeSessionModal));
document.addEventListener("keydown", event => { if (event.key === "Escape" && !sessionModal.hidden) closeSessionModal(); });

if (profile?.stream && Array.isArray(profile.subjects) && profile.subjects.length === 3) {
  setupScreen.hidden = true;
  app.hidden = false;
  renderApp();
} else {
  profile = null;
  openSetup();
}

document.addEventListener("DOMContentLoaded", () => {
    const notificationButton =
        document.getElementById("enableNotificationsBtn");

    if (!notificationButton) {
        console.error("Reminder button was not found.");
        return;
    }

    notificationButton.addEventListener("click", async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support notifications.");
            return;
        }

        if (Notification.permission === "denied") {
            alert(
                "Notifications are blocked. Open your browser's Site Settings, allow notifications, and reload the page."
            );
            return;
        }

        try {
            const permission =
                await Notification.requestPermission();

            if (permission === "granted") {
                notificationButton.textContent =
                    "🔔 Reminders enabled";

                new Notification("Reminders enabled", {
                    body: "Your timetable notifications are now active.",
                    tag: "reminders-enabled"
                });
            } else {
                alert("Notification permission was not allowed.");
            }
        } catch (error) {
            console.error(error);
            alert("The browser could not enable notifications.");
        }
    });

    if (Notification.permission === "granted") {
        notificationButton.textContent =
            "🔔 Reminders enabled";
    }
});
