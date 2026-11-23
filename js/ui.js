const UI = {
  columns: ["todo", "doing", "done"],
  priorities: { low: "Basse", medium: "Moyenne", high: "Haute" },

  // Same subject name always gives the same color.
  subjectColor(name) {
    let hue = 0;
    for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${hue} 60% 40%)`;
  },

  daysLeft(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d) - today) / 864e5);
  },

  make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  },

  tool(label, text, onClick, extra = "") {
    const btn = this.make("button", `tool ${extra}`.trim(), text);
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.addEventListener("click", onClick);
    return btn;
  },

  deadlineNode(task) {
    const days = this.daysLeft(task.deadline);
    const date = new Date(task.deadline).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const node = this.make("span", "deadline");
    if (task.status === "done") {
      node.textContent = date;
    } else if (days < 0) {
      node.classList.add("overdue");
      node.textContent = `En retard (${date})`;
    } else if (days === 0) {
      node.classList.add("soon");
      node.textContent = "Aujourd'hui";
    } else if (days <= 2) {
      node.classList.add("soon");
      node.textContent = `Dans ${days} j (${date})`;
    } else {
      node.textContent = date;
    }
    return node;
  },

  card(task, handlers) {
    const li = this.make("li", `card ${task.status}`);
    li.style.setProperty("--subject", this.subjectColor(task.subject));
    li.append(this.make("p", "title", task.title));

    const meta = this.make("div", "meta");
    meta.append(this.make("span", "subject", task.subject));
    if (task.deadline) meta.append(this.deadlineNode(task));
    const prio = this.make("span", "prio", `Priorité ${this.priorities[task.priority].toLowerCase()}`);
    prio.dataset.p = task.priority;
    meta.append(prio);
    li.append(meta);

    const index = this.columns.indexOf(task.status);
    const tools = this.make("div", "tools");
    const left = this.tool("Déplacer vers la gauche", "←", () => handlers.move(task.id, -1));
    const right = this.tool("Déplacer vers la droite", "→", () => handlers.move(task.id, 1));
    left.disabled = index === 0;
    right.disabled = index === this.columns.length - 1;
    tools.append(
      left,
      right,
      this.tool("Modifier la tâche", "Modifier", () => handlers.edit(task.id)),
      this.tool("Supprimer la tâche", "Supprimer", () => handlers.remove(task.id), "danger")
    );
    li.append(tools);
    return li;
  },

  render(tasks, handlers) {
    for (const status of this.columns) {
      const column = document.querySelector(`.column[data-status="${status}"]`);
      const list = column.querySelector(".list");
      const items = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

      list.replaceChildren(
        ...(items.length
          ? items.map((t) => this.card(t, handlers))
          : [this.make("li", "empty", "Aucune tâche ici.")])
      );
      column.querySelector(".count").textContent = items.length;
    }
  },
};
