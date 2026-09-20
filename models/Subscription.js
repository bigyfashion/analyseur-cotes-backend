const db = require("../db");

const DUREE_JOURS = { hebdomadaire: 7, mensuelle: 30, trimestrielle: 90 };

const Subscription = {
  create(userId, periodicite, origine = "paiement") {
    const stmt = db.prepare(
      `INSERT INTO subscriptions (user_id, plan_periodicite, statut, origine) VALUES (?, ?, 'en_attente', ?)`
    );
    const info = stmt.run(userId, periodicite, origine);
    return Subscription.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id);
  },

  findActiveForUser(userId) {
    return db
      .prepare(
        `SELECT * FROM subscriptions
         WHERE user_id = ? AND statut = 'actif' AND (expire_le IS NULL OR expire_le > datetime('now'))
         ORDER BY expire_le DESC LIMIT 1`
      )
      .get(userId);
  },

  // Appele soit apres verification de signature du webhook (origine='paiement'),
  // soit directement a l'inscription en phase "sans paiement" (origine='gratuit_sans_paiement').
  // joursOverride permet a l'inscription gratuite de choisir une duree independante des
  // paliers tarifaires (qui n'ont pas de sens tant qu'aucun paiement n'est preleve).
  activate(id, joursOverride) {
    const sub = Subscription.findById(id);
    if (!sub) throw new Error("abonnement introuvable");
    const jours = Math.max(1, Math.floor(Number(joursOverride || DUREE_JOURS[sub.plan_periodicite])));
    db.prepare(
      `UPDATE subscriptions
       SET statut = 'actif', debute_le = datetime('now'), expire_le = datetime('now', '+${jours} days')
       WHERE id = ?`
    ).run(id);
    return Subscription.findById(id);
  },

  markFailed(id) {
    db.prepare(`UPDATE subscriptions SET statut = 'echec_paiement' WHERE id = ?`).run(id);
  },
};

module.exports = Subscription;
