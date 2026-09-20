const orangeMoney = require("./orangeMoney");
const mtnMobileMoney = require("./mtnMobileMoney");
const carteBancaire = require("./carteBancaire");
const paypal = require("./paypal");

const registry = {
  orange_money: orangeMoney,
  mtn_mobile_money: mtnMobileMoney,
  carte_bancaire: carteBancaire,
  paypal: paypal,
};

function getProvider(code) {
  const p = registry[code];
  if (!p) throw new Error(`moyen de paiement inconnu: ${code}`);
  return p;
}

// Utilise par l'administration pour empecher l'activation d'un moyen non configure
function isProviderConfigured(code) {
  return getProvider(code).isConfigured();
}

module.exports = { registry, getProvider, isProviderConfigured };
