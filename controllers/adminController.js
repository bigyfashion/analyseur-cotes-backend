const db = require("../db");
const AdminSettings = require("../models/AdminSettings");
const AppSettings = require("../models/AppSettings");
const { isProviderConfigured } = require("../services/payments/registry");

function listPlans(req, res) {
  return res.json({ plans: AdminSettings.listPlans() });
}

function setPlanPrice(req, res) {
  const { periodicite, prixCents } = req.body;
  if (!["hebdomadaire", "mensuelle", "trimestrielle"].includes(periodicite)) {
    return res.status(400).json({ error: "periodicite invalide" });
  }
  if (!Number.isInteger(prixCents) || prixCents < 0) {
    return res.status(400).json({ error: "prixCents doit etre un entier positif (en cents)" });
  }
  const plans = AdminSettings.setPlanPrice(periodicite, prixCents, req.user.sub);
  return res.json({ plans });
}

function listPaymentMethods(req, res) {
  const methods = AdminSettings.listPaymentMethods().map((m) => ({
    ...m,
    configureReellement: isProviderConfigured(m.code), // verite terrain, pas seulement la colonne DB
  }));
  return res.json({ methods });
}

function setPaymentMethodActive(req, res) {
  const { code, actif } = req.body;
  try {
    const configured = isProviderConfigured(code);
    const methods = AdminSettings.setPaymentMethodActive(code, actif, req.user.sub, configured);
    return res.json({ methods });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

function listSubscribers(req, res) {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, s.plan_periodicite, s.statut, s.debute_le, s.expire_le
       FROM users u JOIN subscriptions s ON s.user_id = u.id
       ORDER BY s.created_at DESC LIMIT 200`
    )
    .all();
  return res.json({ abonnes: rows });
}

function auditLog(req, res) {
  return res.json({ journal: AdminSettings.listAuditLog() });
}

function getSettings(req, res) {
  return res.json({ paiementRequis: AppSettings.paiementRequis() });
}

// Reactiver le paiement plus tard (une fois un fournisseur reellement approuve) se fait
// ici, sans toucher au code ni redeployer: PUT { paiementRequis: true }.
function setSettings(req, res) {
  const { paiementRequis } = req.body;
  if (typeof paiementRequis !== "boolean") {
    return res.status(400).json({ error: "paiementRequis doit etre un booleen" });
  }
  AppSettings.set("paiement_requis", paiementRequis ? "1" : "0", req.user.sub);
  return res.json({ paiementRequis });
}

module.exports = {
  listPlans,
  setPlanPrice,
  listPaymentMethods,
  setPaymentMethodActive,
  listSubscribers,
  auditLog,
  getSettings,
  setSettings,
};
