const { verifyHmacSignature, requireEnv } = require("./_helpers");

// Variables attendues une fois le contrat marchand MTN MoMo obtenu (varie par pays):
// MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, MTN_MOMO_API_KEY, MTN_MOMO_WEBHOOK_SECRET
const REQUIRED = ["MTN_MOMO_SUBSCRIPTION_KEY", "MTN_MOMO_API_USER", "MTN_MOMO_API_KEY"];

module.exports = {
  code: "mtn_mobile_money",

  isConfigured() {
    return requireEnv(REQUIRED);
  },

  async initiatePayment({ subscriptionId, amountCents, currency }) {
    if (!this.isConfigured()) {
      throw new Error(
        "mtn_mobile_money: non configure. Contrat marchand MTN Mobile Money (MoMo API) et cles requis avant toute integration reelle."
      );
    }
    // TODO (une fois les cles obtenues): appeler l'API MTN MoMo Collections officielle.
    throw new Error("mtn_mobile_money: integration reelle non implementee (stub V26).");
  },

  verifyWebhookSignature(rawBody, headers) {
    const signature = headers["x-mtn-momo-signature"];
    return verifyHmacSignature(rawBody, signature, "MTN_MOMO_WEBHOOK_SECRET");
  },
};
