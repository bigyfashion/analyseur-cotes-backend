const db = require("../db");

const AdminSettings = {
  listPlans() {
    return db.prepare("SELECT * FROM subscription_plans").all();
  },

  setPlanPrice(periodicite, prixCents, adminId) {
    db.prepare(
      `UPDATE subscription_plans SET prix_cents = ?, updated_by = ?, updated_at = datetime('now')
       WHERE periodicite = ?`
    ).run(prixCents, adminId, periodicite);
    AdminSettings.logAction(adminId, "tarif_modifie", { periodicite, prixCents });
    return AdminSettings.listPlans();
  },

  listPaymentMethods() {
    return db.prepare("SELECT * FROM payment_methods").all();
  },

  // "configure" reflete la presence reelle de cles d'API en variables d'environnement
  // (voir services/payments/registry.js) - un administrateur ne peut PAS activer un moyen
  // de paiement dont les cles marchandes ne sont pas presentes, meme s'il le souhaite.
  setPaymentMethodActive(code, actif, adminId, isConfigured) {
    if (actif && !isConfigured) {
      throw new Error(
        `${code}: aucune cle API marchande detectee en configuration. Impossible d'activer un moyen de paiement non configure.`
      );
    }
    db.prepare(
      `UPDATE payment_methods SET actif = ?, configure = ?, updated_by = ?, updated_at = datetime('now')
       WHERE code = ?`
    ).run(actif ? 1 : 0, isConfigured ? 1 : 0, adminId, code);
    AdminSettings.logAction(adminId, "moyen_paiement_" + (actif ? "active" : "desactive"), { code });
    return AdminSettings.listPaymentMethods();
  },

  logAction(adminId, action, detail) {
    db.prepare(
      "INSERT INTO admin_audit_log (admin_id, action, detail_json) VALUES (?, ?, ?)"
    ).run(adminId, action, JSON.stringify(detail || {}));
  },

  listAuditLog(limit = 100) {
    return db
      .prepare("SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ?")
      .all(limit);
  },
};

module.exports = AdminSettings;
