const { verifyHmacSignature, requireEnv } = require("./_helpers");

// Variables attendues une fois le compte PayPal Business obtenu:
// PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID
const REQUIRED = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"];

module.exports = {
  code: "paypal",

  isConfigured() {
    return requireEnv(REQUIRED);
  },

  async initiatePayment({ subscriptionId, amountCents, currency }) {
    if (!this.isConfigured()) {
      throw new Error(
        "paypal: non configure. Compte PayPal Business requis avant toute integration reelle; PayPal restreint les activites de pronostics sportifs contre paiement, verifie ton eligibilite aupres de PayPal avant d'activer ce module."
      );
    }
    // TODO (une fois les cles obtenues): utiliser le SDK officiel PayPal (Orders/Subscriptions API).
    throw new Error("paypal: integration reelle non implementee (stub V26).");
  },

  // PayPal utilise une verification specifique (pas HMAC generique) via son
  // endpoint /v1/notifications/verify-webhook-signature: le mecanisme HMAC ci-dessous
  // est un garde-fou par defaut (toujours faux sans secret), a remplacer par
  // l'appel officiel PayPal une fois integre.
  verifyWebhookSignature(rawBody, headers) {
    const signature = headers["paypal-transmission-sig"];
    return verifyHmacSignature(rawBody, signature, "PAYPAL_WEBHOOK_ID");
  },
};
