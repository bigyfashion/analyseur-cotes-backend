const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV !== "test") {
  // Volontairement bruyant: pas de valeur par defaut silencieuse pour un secret de session.
  console.warn(
    "ATTENTION: JWT_SECRET absent des variables d'environnement. Definis-le avant tout usage reel (voir .env.example)."
  );
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "15m" } // duree de vie courte, exigence EB section 5
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: "refresh" }, JWT_SECRET, { expiresIn: "7d" });
}

// Verifie le jeton cote serveur a chaque requete (pas seulement cote interface),
// exigence EB section 5: "controle d'acces par role strict... verifie cote serveur".
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "authentification requise" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "jeton invalide ou expire" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "authentification requise" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "acces refuse pour ce role" });
    }
    next();
  };
}

module.exports = { signAccessToken, signRefreshToken, requireAuth, requireRole };
