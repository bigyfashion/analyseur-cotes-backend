// Cree ou promeut un compte administrateur. Usage:
//   node scripts/create-admin.js admin@exemple.com "mot-de-passe-solide"
// A executer uniquement en ligne de commande sur le serveur (jamais via une route HTTP):
// il n'existe volontairement aucun moyen de devenir administrateur depuis l'API.
require("dotenv").config();
const User = require("../models/User");
const db = require("../db");

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js "email" "mot-de-passe"');
  process.exit(1);
}

let user = User.findByEmail(email);
if (user) {
  db.prepare("UPDATE users SET role = 'administrateur' WHERE id = ?").run(user.id);
  console.log(`Compte existant ${email} promu administrateur.`);
} else {
  user = User.create(email, password, "administrateur");
  console.log(`Compte administrateur cree: ${email} (id ${user.id})`);
}
