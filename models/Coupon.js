const db = require("../db");

// IMPORTANT (exigence EB section 5 "Integrite du tableau de performance"):
// ce module n'expose delibrement AUCUNE fonction update()/delete() sur les coupons
// ou leurs resultats. Un coupon publie est fige. Le seul ecrit possible apres
// publication est recordResult(), une seule fois (contrainte PRIMARY KEY sur coupon_id).
const Coupon = {
  publish({ palierCote, coteCombinee, probabiliteCombinee, selections, premierCoupEnvoi }) {
    const now = new Date();
    const kickoff = new Date(premierCoupEnvoi);
    if (kickoff <= now) {
      throw new Error(
        "premier_coup_envoi doit etre dans le futur: un coupon se publie avant le coup d'envoi, jamais apres"
      );
    }
    const stmt = db.prepare(
      `INSERT INTO coupons (palier_cote, cote_combinee, probabilite_combinee, selections_json, premier_coup_envoi)
       VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      palierCote,
      coteCombinee,
      probabiliteCombinee,
      JSON.stringify(selections),
      premierCoupEnvoi
    );
    return Coupon.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare("SELECT * FROM coupons WHERE id = ?").get(id);
  },

  // Historique complet: gagnes ET perdus, jamais filtre pour "prouver" un taux de reussite
  listAllWithResults({ limit = 200, offset = 0 } = {}) {
    return db
      .prepare(
        `SELECT c.*, r.gagne, r.enregistre_le AS resultat_enregistre_le
         FROM coupons c
         LEFT JOIN coupon_results r ON r.coupon_id = c.id
         ORDER BY c.publie_le DESC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset);
  },

  // Enregistrable une seule fois par coupon (PRIMARY KEY coupon_id): un resultat ne se corrige pas.
  recordResult(couponId, gagne) {
    const existing = db
      .prepare("SELECT * FROM coupon_results WHERE coupon_id = ?")
      .get(couponId);
    if (existing) {
      throw new Error(
        "resultat deja enregistre pour ce coupon: aucune correction a posteriori n'est permise"
      );
    }
    db.prepare(
      "INSERT INTO coupon_results (coupon_id, gagne) VALUES (?, ?)"
    ).run(couponId, gagne ? 1 : 0);
    return true;
  },

  // ROI et taux de reussite calcules sur TOUTE la periode disponible, jamais sur une selection de jours
  performanceSummary() {
    const rows = db
      .prepare(
        `SELECT c.cote_combinee, r.gagne
         FROM coupons c JOIN coupon_results r ON r.coupon_id = c.id`
      )
      .all();
    if (!rows.length) return { total: 0, gagnes: 0, tauxReussite: null, roiParDollarMise: null };
    const gagnes = rows.filter((r) => r.gagne).length;
    // ROI simple: mise de 1$ par coupon, gain = cote si gagne, -1 si perdu
    const roiTotal = rows.reduce(
      (acc, r) => acc + (r.gagne ? r.cote_combinee - 1 : -1),
      0
    );
    return {
      total: rows.length,
      gagnes,
      perdus: rows.length - gagnes,
      tauxReussite: gagnes / rows.length,
      roiParDollarMise: roiTotal / rows.length,
    };
  },
};

module.exports = Coupon;
