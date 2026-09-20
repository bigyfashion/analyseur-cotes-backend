const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const AppSettings = require("../models/AppSettings");
const { signAccessToken, signRefreshToken } = require("../middleware/auth");

const DUREE_ACCES_GRATUIT_JOURS = 365; // phase "V26 sans paiement"; ajustable via /admin/settings plus tard

async function register(req, res) {
  const { email, password } = req.body;
  if (!email || !password || password.length < 10) {
    return res.status(400).json({
      error: "email et mot de passe requis; mot de passe: 10 caracteres minimum",
    });
  }
  if (User.findByEmail(email)) {
    return res.status(409).json({ error: "un compte existe deja avec cet email" });
  }
  const user = User.create(email, password); // bcrypt applique dans le modele

  let subscription = null;
  if (!AppSettings.paiementRequis()) {
    // Phase sans paiement: acces accorde immediatement, sans passer par aucune passerelle.
    // origine='gratuit_sans_paiement' garde une trace honnete qu'aucun paiement n'a eu lieu.
    const sub = Subscription.create(user.id, "mensuelle", "gratuit_sans_paiement");
    subscription = Subscription.activate(sub.id, DUREE_ACCES_GRATUIT_JOURS);
  }

  return res.status(201).json({
    user: User.toPublic(user),
    subscription,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = User.findByEmail(email || "");
  if (!user || !User.verifyPassword(user, password || "")) {
    // Message identique que l'email existe ou non: n'aide pas a enumerer les comptes
    return res.status(401).json({ error: "identifiants invalides" });
  }
  return res.json({
    user: User.toPublic(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken requis" });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (payload.type !== "refresh") throw new Error("mauvais type de jeton");
    const user = User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "utilisateur introuvable" });
    return res.json({ accessToken: signAccessToken(user) });
  } catch {
    return res.status(401).json({ error: "refreshToken invalide ou expire" });
  }
}

module.exports = { register, login, refresh };
