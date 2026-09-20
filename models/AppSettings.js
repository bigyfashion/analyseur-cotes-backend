const db = require("../db");
const AdminSettings = require("./AdminSettings");

const AppSettings = {
  get(key) {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
    return row ? row.value : null;
  },

  paiementRequis() {
    return AppSettings.get("paiement_requis") === "1";
  },

  set(key, value, adminId) {
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
    ).run(key, value, adminId);
    AdminSettings.logAction(adminId, "reglage_modifie", { key, value });
  },

  all() {
    return db.prepare("SELECT * FROM app_settings").all();
  },
};

module.exports = AppSettings;
