const Store = {
  key: "studyboard.tasks",
  statuses: ["todo", "doing", "done"],
  priorities: ["low", "medium", "high"],

  // Keep only well-formed tasks and repair missing fields.
  sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((t) => t && typeof t.id === "string" && typeof t.title === "string" && t.title.trim())
      .map((t) => ({
        id: t.id,
        title: t.title,
        subject: typeof t.subject === "string" && t.subject.trim() ? t.subject : "Général",
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(t.deadline) ? t.deadline : "",
        priority: this.priorities.includes(t.priority) ? t.priority : "medium",
        status: this.statuses.includes(t.status) ? t.status : "todo",
        notes: typeof t.notes === "string" ? t.notes : "",
        spent: Number.isFinite(t.spent) && t.spent > 0 ? Math.floor(t.spent) : 0,
        timerStart: Number.isFinite(t.timerStart) && t.timerStart > 0 ? t.timerStart : null,
      }));
  },

  load() {
    try {
      return this.sanitize(JSON.parse(localStorage.getItem(this.key)));
    } catch {
      // Corrupted data or storage unavailable: start fresh instead of crashing.
      return [];
    }
  },

  save(tasks) {
    try {
      localStorage.setItem(this.key, JSON.stringify(tasks));
      return true;
    } catch {
      return false;
    }
  },
};
