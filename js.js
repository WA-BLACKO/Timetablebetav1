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

      if (item.completed) {
        playGardenGrowthAura();
      } else {
        showFallingLeaves();
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
  updateStudyGarden();
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

/* =========================================================
   STUDY GARDEN
   Each user's tree growth is calculated from their own periods.
   No extra HTML or CSS files are needed for this feature.
   ========================================================= */

function getGrowthStage(percent, hasPeriods = true) {
  if (!hasPeriods) return { icon: "🌰", name: "Rest day", color: "#94a3b8" };
  if (percent === 0) return { icon: "🌰", name: "Seed", color: "#b68a5a" };
  if (percent <= 20) return { icon: "🌱", name: "Sprout", color: "#86efac" };
  if (percent <= 40) return { icon: "🪴", name: "Small plant", color: "#4ade80" };
  if (percent <= 60) return { icon: "🌿", name: "Young plant", color: "#34d399" };
  if (percent <= 80) return { icon: "🌳", name: "Growing tree", color: "#22c55e" };
  if (percent < 100) return { icon: "🌲", name: "Healthy tree", color: "#16a34a" };
  return { icon: "🌳", name: "Full tree", color: "#bef264" };
}

function getDayGardenSummary(dayIndex) {
  const periods = sessions.filter(session => Number(session.day) === dayIndex);
  const completed = periods.filter(session => session.completed).length;
  const total = periods.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { dayIndex, total, completed, percent, stage: getGrowthStage(percent, total > 0) };
}

function getWeekGardenSummary() {
  const total = sessions.length;
  const completed = sessions.filter(session => session.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const daily = DAYS.map((_, index) => getDayGardenSummary(index));
  const activeDays = daily.filter(day => day.total > 0);
  const strongest = activeDays.length
    ? activeDays.reduce((best, day) => day.percent > best.percent ? day : best)
    : null;
  return { total, completed, percent, daily, strongest, stage: getGrowthStage(percent, total > 0) };
}

function createGardenButton() {
  let button = document.getElementById("studyGardenButton");
  if (button) return button;

  button = document.createElement("button");
  button.id = "studyGardenButton";
  button.type = "button";
  button.title = "Open My Study Garden";
  button.setAttribute("aria-label", "Open My Study Garden");

  Object.assign(button.style, {
    position: "fixed",
    right: "18px",
    bottom: "38px",
    zIndex: "9998",
    width: "68px",
    height: "68px",
    padding: "0",
    border: "1px solid rgba(134,239,172,.45)",
    borderRadius: "22px",
    background: "linear-gradient(145deg, rgba(19,68,50,.97), rgba(10,36,39,.98))",
    boxShadow: "0 16px 35px rgba(0,0,0,.36)",
    color: "#ffffff",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontFamily: "Inter, Arial, sans-serif",
    overflow: "hidden"
  });

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-3px) scale(1.04)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0) scale(1)";
  });
  button.addEventListener("click", openStudyGarden);

  document.body.appendChild(button);
  return button;
}

function updateStudyGarden() {
  if (!profile || !Array.isArray(sessions)) return;

  const button = createGardenButton();
  const summary = getWeekGardenSummary();
  const icon = summary.stage.icon;

  button.innerHTML = `
    <span style="font-size:31px; line-height:1; filter:drop-shadow(0 4px 6px rgba(0,0,0,.32));">${icon}</span>
    <span style="position:absolute; right:5px; bottom:5px; min-width:24px; padding:2px 4px; border-radius:8px; background:rgba(0,0,0,.42); color:#d9ffe9; font-size:9px; font-weight:800;">${summary.percent}%</span>
  `;
  button.title = `My Study Garden — ${summary.percent}% weekly growth`;
}

function playGardenGrowthAura() {
  const button = document.getElementById("studyGardenButton");
  if (!button) return;

  button.animate([
    { boxShadow: "0 16px 35px rgba(0,0,0,.36), 0 0 0 0 rgba(74,222,128,0)" },
    { boxShadow: "0 16px 35px rgba(0,0,0,.36), 0 0 0 15px rgba(74,222,128,.34), 0 0 42px rgba(74,222,128,.9)" },
    { boxShadow: "0 16px 35px rgba(0,0,0,.36), 0 0 0 24px rgba(74,222,128,0)" }
  ], { duration: 900, easing: "ease-out" });

  button.animate([
    { transform: "scale(1) rotate(0deg)" },
    { transform: "scale(1.16) rotate(-5deg)" },
    { transform: "scale(1) rotate(0deg)" }
  ], { duration: 700, easing: "cubic-bezier(.34,1.56,.64,1)" });
}

function showFallingLeaves() {
  const button = document.getElementById("studyGardenButton");
  if (!button) return;
  const buttonBox = button.getBoundingClientRect();

  for (let index = 0; index < 7; index++) {
    const leaf = document.createElement("span");
    leaf.textContent = index % 2 ? "🍂" : "🍃";
    Object.assign(leaf.style, {
      position: "fixed",
      left: `${buttonBox.left + 18 + Math.random() * 30}px`,
      top: `${buttonBox.top + 20}px`,
      zIndex: "10001",
      fontSize: `${12 + Math.random() * 8}px`,
      pointerEvents: "none"
    });
    document.body.appendChild(leaf);

    const drift = (Math.random() - .5) * 130;
    const animation = leaf.animate([
      { opacity: 1, transform: "translate(0,0) rotate(0deg)" },
      { opacity: 0, transform: `translate(${drift}px, ${95 + Math.random() * 65}px) rotate(${150 + Math.random() * 240}deg)` }
    ], { duration: 950 + Math.random() * 450, easing: "cubic-bezier(.2,.7,.3,1)" });
    animation.onfinish = () => leaf.remove();
  }
}

function openStudyGarden() {
  document.getElementById("studyGardenWorkspace")?.remove();
  const summary = getWeekGardenSummary();

  const overlay = document.createElement("div");
  overlay.id = "studyGardenWorkspace";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10010",
    display: "grid",
    placeItems: "center",
    padding: "18px",
    overflowY: "auto",
    background: "rgba(2,10,17,.72)",
    backdropFilter: "blur(11px)",
    WebkitBackdropFilter: "blur(11px)",
    fontFamily: "Inter, Arial, sans-serif"
  });

  const panel = document.createElement("section");
  Object.assign(panel.style, {
    position: "relative",
    width: "min(1080px, 100%)",
    maxHeight: "calc(100vh - 36px)",
    overflowY: "auto",
    padding: "clamp(20px, 4vw, 38px)",
    border: "1px solid rgba(167,243,208,.22)",
    borderRadius: "27px",
    background: "linear-gradient(145deg, #102f32 0%, #0b1f2c 52%, #111c36 100%)",
    boxShadow: "0 34px 100px rgba(0,0,0,.55)",
    color: "#f4fff8",
    overflow: "hidden"
  });

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close Study Garden");
  Object.assign(close.style, {
    position: "absolute",
    top: "16px",
    right: "18px",
    zIndex: "3",
    width: "38px",
    height: "38px",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: "12px",
    background: "rgba(255,255,255,.07)",
    color: "#ffffff",
    fontSize: "24px",
    cursor: "pointer"
  });
  close.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });

  const header = document.createElement("div");
  header.innerHTML = `
    <p style="margin:0 0 7px; color:#86efac; font-size:11px; font-weight:800; letter-spacing:.16em;">MY STUDY GARDEN</p>
    <h2 style="margin:0; font-size:clamp(25px,4vw,38px); letter-spacing:-.04em;">Your week is growing</h2>
    <p style="max-width:610px; margin:10px 0 0; color:#b7cec8; line-height:1.55;">Every tree grows from your own planned periods. Complete a period to nourish your garden.</p>
  `;

  const summaryCard = document.createElement("div");
  Object.assign(summaryCard.style, {
    margin: "25px 0 20px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    border: "1px solid rgba(134,239,172,.2)",
    borderRadius: "18px",
    background: "rgba(4,25,29,.42)"
  });
  summaryCard.innerHTML = `
    <div style="font-size:48px; line-height:1;">${summary.stage.icon}</div>
    <div style="flex:1;">
      <strong style="display:block; font-size:17px; color:${summary.stage.color};">${summary.stage.name}</strong>
      <span style="display:block; margin-top:4px; color:#c3d7d0; font-size:13px;">${summary.completed} of ${summary.total} planned periods completed</span>
      <div style="height:8px; margin-top:12px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.09);"><span style="display:block; width:${summary.percent}%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#4ade80,#bef264);"></span></div>
    </div>
    <strong style="font-size:26px; color:#dcfce7;">${summary.percent}%</strong>
  `;

  const grid = document.createElement("div");
  Object.assign(grid.style, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px"
  });

  summary.daily.forEach(day => {
    const tree = document.createElement("article");
    Object.assign(tree.style, {
      minHeight: "176px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      border: "1px solid rgba(255,255,255,.1)",
      borderRadius: "17px",
      background: "linear-gradient(160deg, rgba(21,70,55,.52), rgba(15,35,50,.62))",
      overflow: "hidden"
    });

    const treeIcon = document.createElement("div");
    treeIcon.textContent = day.stage.icon;
    Object.assign(treeIcon.style, {
      fontSize: `${40 + Math.round(day.percent * .32)}px`,
      lineHeight: "1",
      alignSelf: "center",
      filter: "drop-shadow(0 8px 10px rgba(0,0,0,.25))"
    });
    treeIcon.animate([
      { transform: "rotate(-2deg) translateY(0)" },
      { transform: "rotate(3deg) translateY(-3px)" },
      { transform: "rotate(-2deg) translateY(0)" }
    ], { duration: 2500 + day.dayIndex * 110, iterations: Infinity, easing: "ease-in-out" });

    const label = document.createElement("div");
    label.innerHTML = `
      <strong style="display:block; font-size:14px;">${DAYS[day.dayIndex]}</strong>
      <span style="display:block; margin-top:3px; color:${day.stage.color}; font-size:12px;">${day.stage.name} · ${day.percent}%</span>
      <small style="display:block; margin-top:6px; color:#a7c0ba; font-size:11px;">${day.completed}/${day.total} periods completed</small>
    `;

    tree.append(treeIcon, label);
    grid.appendChild(tree);
  });

  const report = document.createElement("section");
  Object.assign(report.style, {
    marginTop: "20px",
    padding: "18px",
    border: "1px solid rgba(147,197,253,.22)",
    borderRadius: "18px",
    background: "rgba(18,31,65,.45)"
  });
  report.innerHTML = `
    <p style="margin:0 0 6px; color:#93c5fd; font-size:11px; font-weight:800; letter-spacing:.15em;">WEEKLY REPORT</p>
    <h3 style="margin:0; font-size:19px;">${summary.percent === 100 && summary.total ? "Full garden achieved!" : "Your current weekly progress"}</h3>
    <p style="margin:8px 0 0; color:#bfd0de; line-height:1.55; font-size:13px;">${summary.strongest ? `${DAYS[summary.strongest.dayIndex]} is your strongest day at ${summary.strongest.percent}% completion.` : "Add periods to your timetable to begin growing your garden."}</p>
  `;

  panel.append(close, header, summaryCard, grid, report);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  addGardenWeather(panel);
}

function addGardenWeather(panel) {
  const cloud = document.createElement("span");
  cloud.textContent = "☁️";
  Object.assign(cloud.style, {
    position: "absolute",
    top: "72px",
    left: "-45px",
    opacity: ".25",
    fontSize: "42px",
    pointerEvents: "none"
  });
  panel.appendChild(cloud);
  cloud.animate([
    { transform: "translateX(0)" },
    { transform: "translateX(1150px)" }
  ], { duration: 18000, iterations: Infinity, easing: "linear" });

  for (let index = 0; index < 12; index++) {
    const rain = document.createElement("span");
    rain.textContent = "│";
    Object.assign(rain.style, {
      position: "absolute",
      top: "84px",
      left: `${Math.random() * 90 + 5}%`,
      color: "rgba(125,211,252,.48)",
      fontSize: "15px",
      pointerEvents: "none"
    });
    panel.appendChild(rain);
    rain.animate([
      { opacity: 0, transform: "translateY(0)" },
      { opacity: .8, transform: "translateY(35px)" },
      { opacity: 0, transform: "translateY(64px)" }
    ], { duration: 1300 + Math.random() * 900, delay: Math.random() * 1200, iterations: Infinity, easing: "linear" });
  }
}
/* =========================================================
   GARDEN PATROL — random funny animation every 15 minutes
   ========================================================= */

const GARDEN_SCENE_DELAY = 15 * 60 * 1000;
let lastGardenScene = -1;

function animateActor(element, frames, duration = 1200, options = {}) {
    return element.animate(frames, {
        duration,
        easing: "ease-in-out",
        fill: "forwards",
        ...options
    });
}

function createGardenActor(icon, styles = {}) {
    const actor = document.createElement("span");
    actor.textContent = icon;

    Object.assign(actor.style, {
        position: "absolute",
        fontSize: "30px",
        zIndex: "2",
        userSelect: "none",
        ...styles
    });

    return actor;
}

function playRandomGardenScene() {
    if (document.hidden) return;

    let sceneIndex;

    do {
        sceneIndex = Math.floor(Math.random() * 15);
    } while (sceneIndex === lastGardenScene);

    lastGardenScene = sceneIndex;

    document.querySelector(".garden-patrol-scene")?.remove();

    const scene = document.createElement("div");
    scene.className = "garden-patrol-scene";

    Object.assign(scene.style, {
        position: "fixed",
        right: "20px",
        bottom: "118px",
        width: "280px",
        height: "155px",
        zIndex: "9997",
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: "20px",
        border: "1px solid rgba(134, 239, 172, 0.25)",
        background:
            "linear-gradient(180deg, rgba(30,85,100,0.92), rgba(12,47,43,0.96))",
        boxShadow: "0 18px 45px rgba(0,0,0,0.36)",
        fontFamily: "Arial, sans-serif"
    });

    const title = document.createElement("div");
    title.textContent = "Garden Patrol";
    Object.assign(title.style, {
        position: "absolute",
        top: "10px",
        left: "13px",
        zIndex: "5",
        color: "#dcfce7",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "1px",
        textTransform: "uppercase"
    });

    const ground = document.createElement("div");
    Object.assign(ground.style, {
        position: "absolute",
        left: "0",
        right: "0",
        bottom: "0",
        height: "42px",
        background:
            "linear-gradient(180deg, #397d4f, #1e513a)",
        borderTop: "1px solid rgba(190, 242, 100, 0.25)"
    });

    const tree = createGardenActor("🌳", {
        left: "18px",
        bottom: "18px",
        fontSize: "66px",
        zIndex: "3"
    });

    const botOne = createGardenActor("🤖", {
        left: "105px",
        bottom: "20px"
    });

    const botTwo = createGardenActor("🤖", {
        left: "140px",
        bottom: "20px",
        fontSize: "25px"
    });

    const troublemaker = createGardenActor("🐛", {
        right: "26px",
        bottom: "21px",
        fontSize: "32px"
    });

    scene.append(title, ground, tree, botOne, botTwo, troublemaker);
    document.body.appendChild(scene);

    const scenes = [
        () => {
            title.textContent = "Patrol chase!";
            animateActor(botOne, [
                { transform: "translateX(0)" },
                { transform: "translateX(115px)" }
            ], 1700);

            animateActor(troublemaker, [
                { transform: "translateX(0)" },
                { transform: "translateX(90px)" }
            ], 1700);
        },

        () => {
            title.textContent = "Oops! Bot slipped!";
            animateActor(botOne, [
                { transform: "rotate(0deg)" },
                { transform: "translateY(28px) rotate(115deg)" },
                { transform: "translateY(28px) rotate(90deg)" }
            ], 1200);
        },

        () => {
            title.textContent = "The bug slipped!";
            animateActor(troublemaker, [
                { transform: "rotate(0deg)" },
                { transform: "translateX(-28px) translateY(28px) rotate(-150deg)" }
            ], 1100);
        },

        () => {
            title.textContent = "Leaf net deployed!";
            const net = createGardenActor("🥅", {
                left: "150px",
                bottom: "18px",
                fontSize: "35px"
            });

            scene.appendChild(net);

            animateActor(net, [
                { transform: "scale(0.2)", opacity: 0 },
                { transform: "scale(1)", opacity: 1 }
            ], 500);

            animateActor(troublemaker, [
                { transform: "translateY(0)" },
                { transform: "translateY(-55px) translateX(35px)" }
            ], 1100);
        },

        () => {
            title.textContent = "Balloon escape!";
            const balloon = createGardenActor("🎈", {
                right: "18px",
                bottom: "44px",
                fontSize: "32px"
            });

            scene.appendChild(balloon);

            animateActor(troublemaker, [
                { transform: "translate(0,0)" },
                { transform: "translate(-160px,-130px)" }
            ], 1800);

            animateActor(balloon, [
                { transform: "translate(0,0)" },
                { transform: "translate(-160px,-130px)" }
            ], 1800);
        },

        () => {
            title.textContent = "Rain dance!";
            const cloud = createGardenActor("☁️", {
                left: "95px",
                top: "25px",
                fontSize: "42px"
            });

            const rain = createGardenActor("💧💧💧", {
                left: "104px",
                top: "62px",
                fontSize: "16px"
            });

            scene.append(cloud, rain);

            animateActor(botOne, [
                { transform: "translateY(0) rotate(-12deg)" },
                { transform: "translateY(-13px) rotate(12deg)" },
                { transform: "translateY(0) rotate(-12deg)" }
            ], 800, { iterations: 3 });

            animateActor(botTwo, [
                { transform: "translateY(0) rotate(12deg)" },
                { transform: "translateY(-10px) rotate(-12deg)" },
                { transform: "translateY(0) rotate(12deg)" }
            ], 800, { iterations: 3 });
        },

        () => {
            title.textContent = "Tree got a drink!";
            const cloud = createGardenActor("☁️", {
                left: "18px",
                top: "13px",
                fontSize: "38px"
            });

            const water = createGardenActor("💦", {
                left: "39px",
                top: "51px",
                fontSize: "22px"
            });

            scene.append(cloud, water);

            animateActor(tree, [
                { transform: "scale(1)" },
                { transform: "scale(1.18)" },
                { transform: "scale(1)" }
            ], 1400);
        },

        () => {
            title.textContent = "Wrong target, bot!";
            const wateringCan = createGardenActor("🚿", {
                left: "95px",
                bottom: "50px",
                fontSize: "27px"
            });

            scene.appendChild(wateringCan);

            animateActor(botOne, [
                { transform: "rotate(0deg)" },
                { transform: "rotate(18deg)" },
                { transform: "rotate(0deg)" }
            ], 1100);
        },

        () => {
            title.textContent = "Leaf surprise!";
            const leaf = createGardenActor("🍃", {
                left: "45px",
                top: "24px",
                fontSize: "27px"
            });

            scene.appendChild(leaf);

            animateActor(leaf, [
                { transform: "translate(0,0) rotate(0deg)" },
                { transform: "translate(160px,95px) rotate(260deg)" }
            ], 1300);

            animateActor(troublemaker, [
                { transform: "translateX(0)" },
                { transform: "translateX(22px) rotate(25deg)" }
            ], 1300);
        },

        () => {
            title.textContent = "Bot bump!";
            animateActor(botOne, [
                { transform: "translateX(0)" },
                { transform: "translateX(30px)" },
                { transform: "translateX(0)" }
            ], 900);

            animateActor(botTwo, [
                { transform: "translateX(0)" },
                { transform: "translateX(-25px)" },
                { transform: "translateX(0)" }
            ], 900);
        },

        () => {
            title.textContent = "Is that a flower?";
            troublemaker.textContent = "🌻";

            setTimeout(() => {
                troublemaker.textContent = "🐛";

                animateActor(troublemaker, [
                    { transform: "scale(1)" },
                    { transform: "scale(1.35)" },
                    { transform: "scale(1)" }
                ], 700);
            }, 1400);
        },

        () => {
            title.textContent = "Butterfly distraction!";
            const butterfly = createGardenActor("🦋", {
                left: "120px",
                top: "38px",
                fontSize: "25px"
            });

            scene.appendChild(butterfly);

            animateActor(butterfly, [
                { transform: "translate(0,0)" },
                { transform: "translate(110px,-25px)" },
                { transform: "translate(55px,20px)" }
            ], 1800);

            animateActor(botTwo, [
                { transform: "translateX(0)" },
                { transform: "translateX(80px)" }
            ], 1800);
        },

        () => {
            title.textContent = "Fence repair!";
            const fence = createGardenActor("🪵", {
                left: "72px",
                bottom: "24px",
                fontSize: "32px"
            });

            scene.appendChild(fence);

            animateActor(botOne, [
                { transform: "rotate(0deg)" },
                { transform: "rotate(-15deg)" },
                { transform: "rotate(0deg)" }
            ], 600, { iterations: 3 });
        },

        () => {
            title.textContent = "Flower power!";
            const flowers = createGardenActor("🌸🌼", {
                left: "30px",
                bottom: "70px",
                fontSize: "22px"
            });

            scene.appendChild(flowers);

            animateActor(flowers, [
                { opacity: 0, transform: "translateY(20px) scale(0.2)" },
                { opacity: 1, transform: "translateY(-20px) scale(1.2)" },
                { opacity: 1, transform: "translateY(-10px) scale(1)" }
            ], 1500);
        },

        () => {
            title.textContent = "Garden celebration!";
            [botOne, botTwo, troublemaker].forEach((actor, index) => {
                animateActor(actor, [
                    { transform: "translateY(0) rotate(-10deg)" },
                    { transform: "translateY(-20px) rotate(10deg)" },
                    { transform: "translateY(0) rotate(-10deg)" }
                ], 700 + index * 80, { iterations: 3 });
            });

            animateActor(tree, [
                { filter: "drop-shadow(0 0 0 rgba(190,242,100,0))" },
                { filter: "drop-shadow(0 0 18px rgba(190,242,100,1))" },
                { filter: "drop-shadow(0 0 0 rgba(190,242,100,0))" }
            ], 1800);
        }
    ];

    scenes[sceneIndex]();

    animateActor(scene, [
        { opacity: 0, transform: "translateY(20px) scale(0.92)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
    ], 450);

    setTimeout(() => {
        const closingAnimation = animateActor(scene, [
            { opacity: 1, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(20px) scale(0.92)" }
        ], 450);

        closingAnimation.onfinish = () => scene.remove();
    }, 11000);
}


setTimeout(playRandomGardenScene, 1200);


setInterval(playRandomGardenScene, GARDEN_SCENE_DELAY);
