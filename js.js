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

const periodDuration =
    timeToMinutes(item.end) - timeToMinutes(item.start);

if (item.completed && periodDuration > 120) {
    showMotivationGreeting(item);
}

saveAll();
renderSessions();
updateStats();
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

                checkPeriodReminders();
            } else {
                alert("Notification permission was not allowed.");
            }
        } catch (error) {
            console.error(error);
            alert("The browser could not enable notifications.");
        }
    });

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {
        notificationButton.textContent =
            "🔔 Reminders enabled";
    }
});

/* =========================================================
   BROWSER REMINDERS
   ========================================================= */

const REMINDER_LOG_KEY = "alTimetableReminderLogV1";

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sendBrowserNotification(title, body, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, { body, tag });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error("Notification could not be displayed:", error);
  }
}

function checkPeriodReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = localDateKey(now);
  const reminderLog = safeParse(localStorage.getItem(REMINDER_LOG_KEY), {});
  let logChanged = false;

  sessions.forEach(session => {
    if (Number(session.day) !== todayIndex) return;

    const startMinutes = timeToMinutes(session.start);
    const endMinutes = timeToMinutes(session.end);
    const minutesUntilStart = startMinutes - currentMinutes;
    const startKey = `${todayKey}:starting:${session.id}`;
    const missedKey = `${todayKey}:missed:${session.id}`;

    if (minutesUntilStart > 0 && minutesUntilStart <= 5 && !reminderLog[startKey]) {
      sendBrowserNotification(
        "Period starting soon",
        `${session.title} starts in ${minutesUntilStart} minute${minutesUntilStart === 1 ? "" : "s"}.`,
        startKey
      );
      reminderLog[startKey] = true;
      logChanged = true;
    }

    if (currentMinutes > endMinutes && !session.completed && !reminderLog[missedKey]) {
      sendBrowserNotification(
        "Period not completed",
        `You did not mark “${session.title}” as completed.`,
        missedKey
      );
      reminderLog[missedKey] = true;
      logChanged = true;
    }
  });

  if (logChanged) {
    localStorage.setItem(REMINDER_LOG_KEY, JSON.stringify(reminderLog));
  }
}

checkPeriodReminders();
setInterval(checkPeriodReminders, 30000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkPeriodReminders();
});

/* =========================================================
   MOTIVATIONAL POPUP FOR PERIODS LONGER THAN TWO HOURS
   Styling is applied here so no extra CSS is required.
   ========================================================= */

function showMotivationGreeting(session) {
  const messages = [
    "Excellent work! You completed a powerful study session.",
    "Amazing focus! Keep building that momentum.",
    "Great job! Your hard work is paying off.",
    "Long session completed! Be proud of your progress.",
    "You stayed focused and finished strong!"
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];
  document.querySelector(".motivation-popup")?.remove();

  const popup = document.createElement("aside");
  popup.className = "motivation-popup";
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");

  Object.assign(popup.style, {
    position: "fixed",
    right: "18px",
    bottom: "38px",
    zIndex: "2147483647",
    width: "min(360px, calc(100vw - 28px))",
    padding: "18px 42px 18px 18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    color: "#ffffff",
    background: "linear-gradient(135deg, rgba(20,43,72,.98), rgba(28,27,65,.98))",
    border: "1px solid rgba(96,165,250,.4)",
    borderRadius: "17px",
    boxShadow: "0 20px 55px rgba(0,0,0,.55), 0 0 30px rgba(79,140,255,.18)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    overflow: "hidden",
    fontFamily: "Inter, Arial, sans-serif",
    boxSizing: "border-box"
  });

  const icon = document.createElement("div");
  icon.textContent = "🏆";
  Object.assign(icon.style, {
    minWidth: "52px",
    height: "52px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background: "linear-gradient(135deg, #fbbf24, #f97316)",
    fontSize: "27px"
  });

  const content = document.createElement("div");
  content.style.minWidth = "0";

  const title = document.createElement("strong");
  title.textContent = "Study goal completed!";
  Object.assign(title.style, {
    display: "block",
    marginBottom: "5px",
    color: "#93c5fd",
    fontSize: "15px"
  });

  const description = document.createElement("p");
  description.textContent = message;
  Object.assign(description.style, {
    margin: "0 0 6px",
    color: "#f1f5f9",
    fontSize: "13px",
    lineHeight: "1.4"
  });

  const information = document.createElement("small");
  information.textContent = `${session.title} · ${formatTime(session.start)}–${formatTime(session.end)}`;
  Object.assign(information.style, {
    display: "block",
    color: "#94a3b8",
    fontSize: "10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close message");
  Object.assign(closeButton.style, {
    position: "absolute",
    top: "7px",
    right: "9px",
    width: "27px",
    height: "27px",
    padding: "0",
    border: "none",
    borderRadius: "8px",
    background: "rgba(255,255,255,.07)",
    color: "#b7c5d9",
    fontSize: "19px",
    lineHeight: "27px",
    cursor: "pointer"
  });

  const progress = document.createElement("div");
  Object.assign(progress.style, {
    position: "absolute",
    left: "0",
    bottom: "0",
    width: "100%",
    height: "3px",
    background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
    transformOrigin: "left"
  });

  content.append(title, description, information);
  popup.append(icon, content, closeButton, progress);
  document.body.appendChild(popup);

  popup.animate([
    { opacity: 0, transform: "translateX(120%) scale(.85)" },
    { opacity: 1, transform: "translateX(0) scale(1)" }
  ], {
    duration: 550,
    easing: "cubic-bezier(.34,1.56,.64,1)",
    fill: "forwards"
  });

  icon.animate([
    { transform: "translateY(0) rotate(-4deg)" },
    { transform: "translateY(-5px) rotate(4deg)" },
    { transform: "translateY(0) rotate(-4deg)" }
  ], { duration: 1100, iterations: Infinity });

  progress.animate([
    { transform: "scaleX(1)" },
    { transform: "scaleX(0)" }
  ], { duration: 7000, easing: "linear", fill: "forwards" });

  let closeTimer = setTimeout(closePopup, 7000);

  closeButton.addEventListener("click", () => {
    clearTimeout(closeTimer);
    closePopup();
  });

  function closePopup() {
    if (!popup.isConnected) return;
    const animation = popup.animate([
      { opacity: 1, transform: "translateX(0) scale(1)" },
      { opacity: 0, transform: "translateX(120%) scale(.9)" }
    ], { duration: 400, easing: "ease-in", fill: "forwards" });
    animation.onfinish = () => popup.remove();
  }
}
