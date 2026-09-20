const { verifyHmacSignature, requireEnv } = require("./_helpers");

// Processeur CB generique (ex: Stripe, ou un fournisseur specialise "high-risk"
// si Stripe/PayPal refusent la categorie "sports forecasting" - voir README).
// Variables attendues: CARD_PROCESSOR_SECRET_KEY, CARD_PROCESSOR_WEBHOOK_SECRET
const REQUIRED = ["CARD_PROCESSOR_SECRET_KEY"];

module.exports = {
  code: "carte_bancaire",

  isConfigured() {
    return requireEnv(REQUIRED);
  },

  async initiatePayment({ subscriptionId, amountCents, currency }) {
    if (!this.isConfigured()) {
      throw new Error(
        "carte_bancaire: non configure. Compte marchand approuve par un processeur (conforme PCI-DSS) requis. Rappel: Stripe et PayPal classent le pronostic sportif contre paiement dans leur politique jeux d'argent (restreint/interdit selon les cas) - verifie qu'un compte t'a ete accorde avant d'activer ce module."
      );
    }
    // TODO (une fois les cles obtenues): creer une session de paiement hebergee cote
    // processeur (le numero de carte ne transite jamais par ce serveur).
    throw new Error("carte_bancaire: integration reelle non implementee (stub V26).");
  },

  verifyWebhookSignature(rawBody, headers) {
    const signature = headers["x-card-processor-signature"];
    return verifyHmacSignature(rawBody, signature, "CARD_PROCESSOR_WEBHOOK_SECRET");
  },
};
