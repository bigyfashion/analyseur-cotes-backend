const { verifyHmacSignature, requireEnv } = require("./_helpers");

// Variables attendues une fois le contrat marchand Orange Money obtenu (varie par pays):
// ORANGE_MONEY_CLIENT_ID, ORANGE_MONEY_CLIENT_SECRET, ORANGE_MONEY_MERCHANT_KEY,
// ORANGE_MONEY_WEBHOOK_SECRET
const REQUIRED = [
  "ORANGE_MONEY_CLIENT_ID",
  "ORANGE_MONEY_CLIENT_SECRET",
  "ORANGE_MONEY_MERCHANT_KEY",
];

module.exports = {
  code: "orange_money",

  isConfigured() {
    return requireEnv(REQUIRED);
  },

  async initiatePayment({ subscriptionId, amountCents, currency }) {
    if (!this.isConfigured()) {
      throw new Error(
        "orange_money: non configure. Contrat marchand Orange Money et cles API requis avant toute integration reelle (voir README section Passerelles de paiement)."
      );
    }
    // TODO (une fois les cles obtenues): appeler l'API Orange Money Web Payment
    // officielle ici. Ne jamais construire d'appel HTTP vers un endpoint non
    // documente officiellement ni demander le numero mobile money directement
    // a l'utilisateur dans cette application.
    throw new Error("orange_money: integration reelle non implementee (stub V26).");
  },

  verifyWebhookSignature(rawBody, headers) {
    const signature = headers["x-orange-money-signature"];
    return verifyHmacSignature(rawBody, signature, "ORANGE_MONEY_WEBHOOK_SECRET");
  },
};
