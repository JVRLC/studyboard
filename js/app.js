let tasks = Store.load();
let editingId = null;
let newStatus = "todo";

const dialog = document.getElementById("task-dialog");
const form = document.getElementById("task-form");

const filters = { subject: "", priority: "", query: "" };
const searchInput = document.getElementById("search");
const prioritySeg = document.getElementById("priority-filter");

function setSubject(subject) {
  filters.subject = subject;
  draw();
}

function visibleTasks() {
  const q = filters.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!filters.subject || t.subject === filters.subject) &&
      (!filters.priority || t.priority === filters.priority) &&
      (!q || `${t.title} ${t.subject} ${t.notes}`.toLowerCase().includes(q))
  );
}

function draw() {
  if (filters.subject && !tasks.some((t) => t.subject === filters.subject)) filters.subject = "";
  UI.renderSubjects(tasks, filters.subject, setSubject);
  UI.renderOverview(tasks);
  UI.render(visibleTasks(), handlers);
  for (const btn of prioritySeg.querySelectorAll("button")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.priority === filters.priority));
  }
}

function refresh() {
  if (!Store.save(tasks)) {
    alert("Sauvegarde impossible : le stockage du navigateur est indisponible ou plein.");
  }
  draw();
}

function stopTimer(task) {
  if (!task.timerStart) return;
  task.spent = UI.elapsed(task);
  task.timerStart = null;
}

function openDialog(task, status = "todo") {
  editingId = task ? task.id : null;
  newStatus = status;
  document.getElementById("dialog-title").textContent = task ? "Modifier la tâche" : "Nouvelle tâche";
  form.reset();
  if (task) {
    form.elements.title.value = task.title;
    form.elements.subject.value = task.subject === "Général" ? "" : task.subject;
    form.elements.deadline.value = task.deadline;
    form.elements.priority.value = task.priority;
    form.elements.notes.value = task.notes;
  }
  dialog.showModal();
}

const handlers = {
  move(id, direction) {
    const task = tasks.find((t) => t.id === id);
    const next = UI.columns.indexOf(task.status) + direction;
    if (next < 0 || next >= UI.columns.length) return;
    task.status = UI.columns[next];
    if (task.status === "done") stopTimer(task);
    refresh();
  },

  moveTo(id, status) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status || !UI.columns.includes(status)) return;
    task.status = status;
    if (status === "done") stopTimer(task);
    refresh();
  },

  toggleTimer(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === "done") return;
    if (task.timerStart) {
      stopTimer(task);
    } else {
      tasks.forEach(stopTimer); // one study session at a time
      task.timerStart = Date.now();
    }
    refresh();
  },

  edit(id) {
    openDialog(tasks.find((t) => t.id === id));
  },

  remove(id) {
    if (!confirm("Supprimer cette tâche ?")) return;
    tasks = tasks.filter((t) => t.id !== id);
    refresh();
  },
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const title = data.get("title").trim();
  if (!title) {
    form.elements.title.value = "";
    form.elements.title.focus();
    return;
  }
  const fields = {
    title,
    subject: data.get("subject").trim() || "Général",
    deadline: data.get("deadline"),
    priority: data.get("priority"),
    notes: data.get("notes").trim(),
  };

  if (editingId) {
    Object.assign(tasks.find((t) => t.id === editingId), fields);
  } else {
    // crypto.randomUUID needs a secure context, so build a simple id instead.
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    tasks.push({ id, status: newStatus, spent: 0, timerStart: null, ...fields });
  }
  dialog.close();
  refresh();
});

// Close when clicking the backdrop (a click whose target is the dialog itself).
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Keep several tabs in sync.
window.addEventListener("storage", (event) => {
  if (event.key !== Store.key) return;
  tasks = Store.load();
  draw();
});

document.getElementById("add-btn").addEventListener("click", () => openDialog(null));
document.querySelectorAll(".col-add").forEach((btn) =>
  btn.addEventListener("click", () => openDialog(null, btn.dataset.add))
);
document.getElementById("cancel-btn").addEventListener("click", () => dialog.close());

searchInput.addEventListener("input", () => { filters.query = searchInput.value; draw(); });

// Keyboard shortcuts: "n" = new task, "/" = search.
document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || dialog.open) return;
  if (event.target.closest("input, textarea, select")) return;
  if (event.key === "n") { event.preventDefault(); openDialog(null); }
  if (event.key === "/") { event.preventDefault(); searchInput.focus(); }
});

// Live clock for the running timer (updates text in place so drag & drop is not disturbed).
setInterval(() => {
  let running = false;
  for (const task of tasks) {
    if (!task.timerStart) continue;
    running = true;
    const node = document.querySelector(`.time[data-id="${task.id}"]`);
    if (node) node.textContent = UI.formatTime(UI.elapsed(task));
  }
  if (running) UI.renderStudyTime(tasks);
}, 250);

prioritySeg.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-priority]");
  if (!btn) return;
  filters.priority = btn.dataset.priority;
  draw();
});

// Theme: follows the system until the user picks one.
const root = document.documentElement;
document.getElementById("theme-btn").addEventListener("click", () => {
  const dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("studyboard.theme", root.dataset.theme); } catch {}
});

const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
document.getElementById("today").textContent = today[0].toUpperCase() + today.slice(1);

// Drag & drop between columns.
const board = document.querySelector(".board");
board.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".card");
  if (!card) return;
  event.dataTransfer.setData("text/plain", card.dataset.id);
  event.dataTransfer.effectAllowed = "move";
  card.classList.add("dragging");
});
board.addEventListener("dragend", () => {
  document.querySelectorAll(".dragging, .drag-over").forEach((n) => n.classList.remove("dragging", "drag-over"));
});
board.addEventListener("dragover", (event) => {
  const column = event.target.closest(".column");
  if (!column) return;
  event.preventDefault();
  document.querySelectorAll(".drag-over").forEach((n) => n !== column && n.classList.remove("drag-over"));
  column.classList.add("drag-over");
});
board.addEventListener("drop", (event) => {
  const column = event.target.closest(".column");
  if (!column) return;
  event.preventDefault();
  column.classList.remove("drag-over");
  handlers.moveTo(event.dataTransfer.getData("text/plain"), column.dataset.status);
});

// Export / import JSON.
document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `studyboard-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

const importFile = document.getElementById("import-file");
document.getElementById("import-btn").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  importFile.value = "";
  if (!file) return;
  try {
    const imported = Store.sanitize(JSON.parse(await file.text()));
    if (!imported.length) throw new Error("empty");
    if (!confirm(`Remplacer vos ${tasks.length} tâche(s) par ${imported.length} tâche(s) importée(s) ?`)) return;
    tasks = imported;
    refresh();
  } catch {
    alert("Fichier invalide : impossible d'importer ces tâches.");
  }
});

refresh();
