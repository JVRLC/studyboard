let tasks = Store.load();
let editingId = null;

const dialog = document.getElementById("task-dialog");
const form = document.getElementById("task-form");

function refresh() {
  Store.save(tasks);
  UI.render(tasks, handlers);
}

function openDialog(task) {
  editingId = task ? task.id : null;
  document.getElementById("dialog-title").textContent = task ? "Modifier la tâche" : "Nouvelle tâche";
  form.reset();
  if (task) {
    form.elements.title.value = task.title;
    form.elements.subject.value = task.subject === "Général" ? "" : task.subject;
    form.elements.deadline.value = task.deadline;
    form.elements.priority.value = task.priority;
  }
  dialog.showModal();
}

const handlers = {
  move(id, direction) {
    const task = tasks.find((t) => t.id === id);
    const next = UI.columns.indexOf(task.status) + direction;
    if (next < 0 || next >= UI.columns.length) return;
    task.status = UI.columns[next];
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
  const fields = {
    title: data.get("title").trim(),
    subject: data.get("subject").trim() || "Général",
    deadline: data.get("deadline"),
    priority: data.get("priority"),
  };

  if (editingId) {
    Object.assign(tasks.find((t) => t.id === editingId), fields);
  } else {
    // crypto.randomUUID needs a secure context, so build a simple id instead.
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    tasks.push({ id, status: "todo", ...fields });
  }
  dialog.close();
  refresh();
});

document.getElementById("add-btn").addEventListener("click", () => openDialog(null));
document.getElementById("cancel-btn").addEventListener("click", () => dialog.close());

refresh();
