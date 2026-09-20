const Coupon = require("../models/Coupon");
const Subscription = require("../models/Subscription");

const AVERTISSEMENT_ESPERANCE_NEGATIVE =
  "Les paris sportifs ont une esperance negative: la marge du bookmaker fait qu'en moyenne, " +
  "un parieur perd de l'argent sur le long terme, quel que soit le palier de cote. Aucun taux de " +
  "reussite passe ne garantit un resultat futur.";

// Reserve aux abonnes actifs (exigence EB: "coupons quotidiens aux abonnes a jour de paiement")
function listTodaysCoupons(req, res) {
  const active = Subscription.findActiveForUser(req.user.sub);
  if (!active) {
    return res.status(402).json({ error: "abonnement actif requis pour acceder aux coupons" });
  }
  const today = new Date().toISOString().slice(0, 10);
  const coupons = Coupon.listAllWithResults({ limit: 20 }).filter((c) =>
    c.publie_le.startsWith(today)
  );
  return res.json({ coupons, avertissement: AVERTISSEMENT_ESPERANCE_NEGATIVE });
}

// Publique: l'historique de performance est volontairement visible sans abonnement,
// gagnes ET perdus, pour que la credibilite ne repose pas sur un acces restreint.
function performanceHistory(req, res) {
  const coupons = Coupon.listAllWithResults({ limit: 500 });
  const summary = Coupon.performanceSummary();
  return res.json({
    resume: summary,
    historique: coupons,
    avertissement: AVERTISSEMENT_ESPERANCE_NEGATIVE,
  });
}

// Reserve a l'administration ou a un job planifie interne, jamais au client final.
// Note volontaire: il n'existe AUCUNE route PUT/PATCH/DELETE sur /coupons dans routes/.
function publishCoupon(req, res) {
  try {
    const coupon = Coupon.publish(req.body);
    return res.status(201).json({ coupon });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

function recordResult(req, res) {
  const { couponId, gagne } = req.body;
  try {
    Coupon.recordResult(couponId, gagne);
    return res.json({ enregistre: true });
  } catch (e) {
    return res.status(409).json({ error: e.message }); // 409: deja enregistre, pas modifiable
  }
}

module.exports = { listTodaysCoupons, performanceHistory, publishCoupon, recordResult };
