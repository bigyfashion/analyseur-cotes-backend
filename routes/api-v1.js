const express = require("express");
const router = express.Router();

const auth = require("../controllers/authController");
const subs = require("../controllers/subscriptionsController");
const coupons = require("../controllers/couponsController");
const admin = require("../controllers/adminController");
const payments = require("../controllers/paymentsController");
const { requireAuth, requireRole } = require("../middleware/auth");

// --- Authentification (module 1f) ---
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.post("/auth/refresh", auth.refresh);

// --- Abonnement (module 1f) ---
router.get("/subscriptions/plans", subs.listPlansPublic);
router.get("/subscriptions/me", requireAuth, subs.myActiveSubscription);
router.post("/subscriptions/subscribe", requireAuth, subs.subscribe);

// --- Coupons et performance (modules 1c, 1g) ---
router.get("/coupons/today", requireAuth, coupons.listTodaysCoupons);
router.get("/coupons/performance", coupons.performanceHistory); // public, volontairement
// Publication et enregistrement de resultat: reserves a l'administration ou a un job interne.
// AUCUNE route PUT/PATCH/DELETE n'existe sur /coupons: c'est ce qui rend l'historique infalsifiable.
router.post("/coupons", requireAuth, requireRole("administrateur"), coupons.publishCoupon);
router.post(
  "/coupons/result",
  requireAuth,
  requireRole("administrateur"),
  coupons.recordResult
);

// --- Administration (module 1h) ---
router.get("/admin/plans", requireAuth, requireRole("administrateur"), admin.listPlans);
router.put(
  "/admin/plans",
  requireAuth,
  requireRole("administrateur"),
  admin.setPlanPrice
);
router.get(
  "/admin/payment-methods",
  requireAuth,
  requireRole("administrateur"),
  admin.listPaymentMethods
);
router.put(
  "/admin/payment-methods",
  requireAuth,
  requireRole("administrateur"),
  admin.setPaymentMethodActive
);
router.get(
  "/admin/subscribers",
  requireAuth,
  requireRole("administrateur"),
  admin.listSubscribers
);
router.get("/admin/audit-log", requireAuth, requireRole("administrateur"), admin.auditLog);
router.get("/admin/settings", requireAuth, requireRole("administrateur"), admin.getSettings);
router.put("/admin/settings", requireAuth, requireRole("administrateur"), admin.setSettings);

// --- Passerelles de paiement (module 1i) ---
// Point d'entree unique des webhooks des 4 prestataires. Non protege par JWT (les
// prestataires externes n'en ont pas): protege par verification de signature a
// l'interieur du controleur, avant toute activation d'acces.
router.post("/payments/:provider/webhook", payments.handleWebhook);

module.exports = router;
