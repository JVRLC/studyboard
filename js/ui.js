const UI = {
  columns: ["todo", "doing", "done"],
  labels: { todo: "À faire", doing: "En cours", done: "Terminé" },
  priorities: { low: "Basse", medium: "Moyenne", high: "Haute" },
  priorityRank: { low: 0, medium: 1, high: 2 },

  // Same subject name always gives the same hue; CSS picks lightness per theme.
  subjectHue(name) {
    let hue = 0;
    for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    return hue;
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
    btn.addEventListener("click", (event) => {
      event.stopPropagation(); // do not trigger the card's own click (open editor)
      onClick(event);
    });
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
      node.textContent = `En retard · ${date}`;
    } else if (days === 0) {
      node.classList.add("soon");
      node.textContent = "Aujourd'hui";
    } else if (days <= 2) {
      node.classList.add("soon");
      node.textContent = days === 1 ? "Demain" : `Dans ${days} j`;
    } else {
      node.textContent = date;
    }
    return node;
  },

  card(task, handlers) {
    const running = Boolean(task.timerStart);
    const li = this.make("li", `card ${task.status}${running ? " is-running" : ""}`);
    li.draggable = true;
    li.tabIndex = 0;
    li.dataset.id = task.id;
    li.style.setProperty("--hue", this.subjectHue(task.subject));
    li.addEventListener("click", () => handlers.edit(task.id));
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target === li) handlers.edit(task.id);
    });

    const head = this.make("div", "card-head");
    head.append(this.make("span", "subject", task.subject));

    const index = this.columns.indexOf(task.status);
    const tools = this.make("div", "tools");
    const left = this.tool("Déplacer vers la gauche", "←", () => handlers.move(task.id, -1));
    const right = this.tool("Déplacer vers la droite", "→", () => handlers.move(task.id, 1));
    left.disabled = index === 0;
    right.disabled = index === this.columns.length - 1;
    tools.append(
      left,
      right,
      this.tool("Modifier la tâche", "✎", () => handlers.edit(task.id)),
      this.tool("Supprimer la tâche", "✕", () => handlers.remove(task.id), "danger")
    );
    head.append(tools);
    li.append(head, this.make("p", "title", task.title));

    if (task.notes) li.append(this.make("p", "notes", task.notes));

    const foot = this.make("div", "card-foot");
    if (task.deadline) foot.append(this.deadlineNode(task));
    const prio = this.make("span", "prio");
    prio.dataset.p = task.priority;
    prio.title = `Priorité ${this.priorities[task.priority].toLowerCase()}`;
    prio.append(this.make("span", "sr-only", prio.title));
    foot.append(prio);

    if (running || task.spent > 0) {
      const time = this.make("span", "time", this.formatTime(this.elapsed(task)));
      time.dataset.id = task.id;
      time.title = "Temps d'étude";
      foot.append(time);
    }
    if (task.status !== "done") {
      foot.append(
        this.tool(
          running ? "Mettre le chrono en pause" : "Démarrer le chrono d'étude",
          running ? "Pause" : "Étudier",
          () => handlers.toggleTimer(task.id),
          `study${running ? " running" : ""}`
        )
      );
    }
    li.append(foot);
    return li;
  },

  elapsed(task) {
    return task.spent + (task.timerStart ? Math.floor((Date.now() - task.timerStart) / 1000) : 0);
  },

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  },

  formatStudy(total) {
    if (total < 60) return "—";
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
  },

  studyTotal(tasks) {
    return tasks.reduce((sum, t) => sum + this.elapsed(t), 0);
  },

  renderOverview(tasks) {
    const done = tasks.filter((t) => t.status === "done").length;
    const late = tasks.filter((t) => t.status !== "done" && t.deadline && this.daysLeft(t.deadline) < 0).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    document.getElementById("stat-pct").textContent = `${pct} %`;
    document.getElementById("stat-done").textContent = `${done}/${tasks.length}`;
    const lateNode = document.getElementById("stat-late");
    lateNode.textContent = late;
    lateNode.classList.toggle("overdue", late > 0);
    this.renderStudyTime(tasks);
    const bar = document.getElementById("bar");
    bar.setAttribute("aria-valuenow", pct);
    bar.firstElementChild.style.width = `${pct}%`;
  },

  renderStudyTime(tasks) {
    document.getElementById("stat-time").textContent = this.formatStudy(this.studyTotal(tasks));
  },

  renderSubjects(tasks, active, onPick) {
    const counts = new Map();
    for (const t of tasks) counts.set(t.subject, (counts.get(t.subject) || 0) + 1);
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b, "fr"));
    const entries = [["", "Toutes les matières", tasks.length], ...names.map((n) => [n, n, counts.get(n)])];

    document.getElementById("subjects").replaceChildren(
      ...entries.map(([key, label, count]) => {
        const li = this.make("li");
        const btn = this.make("button", "subject-item");
        btn.type = "button";
        btn.setAttribute("aria-pressed", String(active === key));
        btn.dataset.subject = key;
        const dot = this.make("span", key ? "dot" : "dot all");
        if (key) dot.style.setProperty("--hue", this.subjectHue(key));
        dot.setAttribute("aria-hidden", "true");
        btn.append(dot, this.make("span", "name", label), this.make("span", "n", count));
        btn.addEventListener("click", () => onPick(key));
        li.append(btn);
        return li;
      })
    );
  },

  render(tasks, handlers) {
    for (const status of this.columns) {
      const column = document.querySelector(`.column[data-status="${status}"]`);
      const list = column.querySelector(".list");
      const items = tasks
        .filter((t) => t.status === status)
        .sort(
          (a, b) =>
            (a.deadline || "9999").localeCompare(b.deadline || "9999") ||
            this.priorityRank[b.priority] - this.priorityRank[a.priority]
        );

      list.replaceChildren(
        ...(items.length
          ? items.map((t) => this.card(t, handlers))
          : [this.make("li", "empty", "Aucune tâche ici.")])
      );
      column.querySelector(".count").textContent = items.length;
    }
  },
};
