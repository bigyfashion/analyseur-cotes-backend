const db = require("../db");
const Subscription = require("../models/Subscription");
const AppSettings = require("../models/AppSettings");
const { getProvider, isProviderConfigured } = require("../services/payments/registry");

function myActiveSubscription(req, res) {
  const sub = Subscription.findActiveForUser(req.user.sub);
  return res.json({ subscription: sub || null });
}

function listPlansPublic(req, res) {
  const plans = db.prepare("SELECT periodicite, prix_cents, devise FROM subscription_plans").all();
  const methods = db
    .prepare("SELECT code, actif FROM payment_methods WHERE actif = 1")
    .all();
  return res.json({
    plans,
    moyensDisponibles: methods.map((m) => m.code),
    paiementRequis: AppSettings.paiementRequis(),
  });
}

// Cree l'abonnement en attente + tente d'initier le paiement chez le prestataire choisi.
// L'abonnement ne devient 'actif' qu'apres confirmation verifiee du webhook (voir paymentsController).
async function subscribe(req, res) {
  if (!AppSettings.paiementRequis()) {
    return res.status(409).json({
      error:
        "le paiement n'est pas requis actuellement: l'acces est deja accorde gratuitement a l'inscription. Voir /subscriptions/me.",
    });
  }
  const { periodicite, moyenPaiement } = req.body;
  if (!["hebdomadaire", "mensuelle", "trimestrielle"].includes(periodicite)) {
    return res.status(400).json({ error: "periodicite invalide" });
  }
  const method = db
    .prepare("SELECT * FROM payment_methods WHERE code = ?")
    .get(moyenPaiement);
  if (!method || !method.actif) {
    return res.status(400).json({ error: "moyen de paiement indisponible ou desactive par l'administration" });
  }
  if (!isProviderConfigured(moyenPaiement)) {
    return res.status(503).json({
      error: `${moyenPaiement}: module non configure (cles marchandes manquantes). Voir README.`,
    });
  }
  const plan = db
    .prepare("SELECT * FROM subscription_plans WHERE periodicite = ?")
    .get(periodicite);
  const sub = Subscription.create(req.user.sub, periodicite);
  try {
    const provider = getProvider(moyenPaiement);
    const result = await provider.initiatePayment({
      subscriptionId: sub.id,
      amountCents: plan.prix_cents,
      currency: plan.devise,
    });
    db.prepare(
      `INSERT INTO payment_transactions (subscription_id, moyen_paiement, montant_cents, devise, statut)
       VALUES (?, ?, ?, ?, 'initie')`
    ).run(sub.id, moyenPaiement, plan.prix_cents, plan.devise);
    return res.status(202).json({ subscription: sub, paiement: result });
  } catch (e) {
    return res.status(503).json({ error: e.message, subscription: sub });
  }
}

module.exports = { myActiveSubscription, listPlansPublic, subscribe };
