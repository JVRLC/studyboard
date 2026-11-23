const Store = {
  key: "studyboard.tasks",

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch {
      // Corrupted data: start fresh instead of crashing the app.
      return [];
    }
  },

  save(tasks) {
    localStorage.setItem(this.key, JSON.stringify(tasks));
  },
};
