const db = require("../db");
const Subscription = require("../models/Subscription");
const { getProvider } = require("../services/payments/registry");

// Point d'entree unique des webhooks des 4 prestataires: /api/v1/payments/:provider/webhook
// Exigence de securite (EB section 5): AUCUNE activation d'acces sans verification de
// signature reussie. Un appel non signe ou mal signe ne debloque jamais un abonnement,
// meme s'il contient un subscriptionId et un statut "confirme" plausibles.
async function handleWebhook(req, res) {
  const { provider: code } = req.params;
  let provider;
  try {
    provider = getProvider(code);
  } catch {
    return res.status(404).json({ error: "prestataire inconnu" });
  }

  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const signatureValide = provider.verifyWebhookSignature(rawBody, req.headers);

  if (!signatureValide) {
    // Journalise sans jamais activer quoi que ce soit
    console.warn(`Webhook ${code} rejete: signature absente ou invalide.`);
    return res.status(401).json({ error: "signature de webhook invalide" });
  }

  // A partir d'ici seulement, la confirmation est fiable. Le mapping exact du payload
  // (quels champs contiennent subscriptionId / statut) depend du format reel de chaque
  // prestataire et reste a completer une fois l'integration branchee sur de vraies cles.
  const { subscriptionId, statut, referenceTransaction } = req.body || {};
  if (!subscriptionId) {
    return res.status(400).json({ error: "subscriptionId manquant dans le webhook" });
  }

  db.prepare(
    `UPDATE payment_transactions
     SET statut = ?, reference_prestataire = ?, webhook_verifie = 1
     WHERE subscription_id = ? AND moyen_paiement = ?
     ORDER BY id DESC LIMIT 1`
  ).run(statut === "confirme" ? "confirme" : "echec", referenceTransaction || null, subscriptionId, code);

  if (statut === "confirme") {
    Subscription.activate(subscriptionId);
  } else {
    Subscription.markFailed(subscriptionId);
  }

  return res.json({ recu: true });
}

module.exports = { handleWebhook };
