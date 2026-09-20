require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { initSchema } = require("./db/init");
const apiV1 = require("./routes/api-v1");

// Applique le schema a chaque demarrage (idempotent): necessaire sur un palier gratuit
// sans acces Shell, ou le fichier SQLite est recree vide a chaque reveil du service.
initSchema();

const app = express();

// --- Securite de base (EB section 5, alignee OWASP Top 10) ---
app.use(helmet());

// HTTPS impose en production: derriere un proxy (Render/Railway/Fly), on se fie a
// x-forwarded-proto; en local (NODE_ENV=development), on laisse passer en clair.
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  })
);

// Limite de debit generale: freine les attaques par force brute sur /auth/login notamment.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  "/api/v1/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "trop de tentatives, reessaie plus tard" } })
);

// express.json avec capture du corps brut: necessaire pour verifier la signature HMAC
// des webhooks de paiement (la signature porte sur les octets exacts recus, pas sur
// l'objet JSON re-serialise).
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

app.use("/api/v1", apiV1);

app.get("/api/v1/health", (req, res) => res.json({ ok: true, version: "26.1.0" }));

// Gestionnaire d'erreurs generique: ne jamais renvoyer une stack trace au client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "erreur interne" });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`API v1 sur http://localhost:${PORT}`));
}

module.exports = app;
