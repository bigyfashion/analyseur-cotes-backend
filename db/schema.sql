-- Schema V26 · Analyseur de cotes de paris
-- SQLite pour ce scaffold local; en production, migrer vers une base managee
-- (Postgres chez Render/Railway/Fly par exemple) comme le prevoit la section 6 de l'EB.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcrypt, jamais en clair
  role          TEXT NOT NULL DEFAULT 'abonne' CHECK(role IN ('visiteur','abonne','administrateur')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tarifs par periodicite, modifiables uniquement par un administrateur (module 1h)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  periodicite   TEXT NOT NULL UNIQUE CHECK(periodicite IN ('hebdomadaire','mensuelle','trimestrielle')),
  prix_cents    INTEGER NOT NULL,        -- en cents, pour eviter les erreurs d'arrondi flottant
  devise        TEXT NOT NULL DEFAULT 'CAD',
  updated_by    INTEGER REFERENCES users(id),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Activation/desactivation independante de chaque moyen de paiement (module 1h)
CREATE TABLE IF NOT EXISTS payment_methods (
  code          TEXT PRIMARY KEY CHECK(code IN ('orange_money','mtn_mobile_money','carte_bancaire','paypal')),
  actif         INTEGER NOT NULL DEFAULT 0,   -- 0/1 ; reste a 0 tant qu'aucune cle reelle n'est fournie
  configure     INTEGER NOT NULL DEFAULT 0,   -- 1 seulement si des cles d'API reelles sont presentes en variables d'environnement
  updated_by    INTEGER REFERENCES users(id),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  plan_periodicite TEXT NOT NULL REFERENCES subscription_plans(periodicite),
  statut          TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente','actif','expire','echec_paiement')),
  origine         TEXT NOT NULL DEFAULT 'paiement' CHECK(origine IN ('paiement','gratuit_sans_paiement')),
  debute_le       TEXT,
  expire_le       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id     INTEGER NOT NULL REFERENCES subscriptions(id),
  moyen_paiement      TEXT NOT NULL REFERENCES payment_methods(code),
  reference_prestataire TEXT,            -- reference renvoyee par le prestataire; AUCUNE donnee brute (numero de carte, identifiant mobile money) n'est stockee ici
  montant_cents       INTEGER NOT NULL,
  devise              TEXT NOT NULL DEFAULT 'CAD',
  statut              TEXT NOT NULL DEFAULT 'initie' CHECK(statut IN ('initie','confirme','echec')),
  webhook_verifie     INTEGER NOT NULL DEFAULT 0,  -- 1 seulement apres verification de signature du webhook
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Coupons publies: horodates et FIGES avant le coup d'envoi du premier match.
-- Aucune route de l'API n'expose de UPDATE ni de DELETE sur cette table (voir controllers/coupons.js):
-- c'est ce qui rend l'historique infalsifiable, pas seulement une regle documentaire.
CREATE TABLE IF NOT EXISTS coupons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  palier_cote     INTEGER NOT NULL CHECK(palier_cote IN (4,5,10,20)),
  cote_combinee   REAL NOT NULL,
  probabilite_combinee REAL NOT NULL,     -- probabilite reelle, jamais seulement la cote
  selections_json TEXT NOT NULL,          -- detail des jambes (match, marche, selection, cote, proba) au moment de la publication
  publie_le       TEXT NOT NULL DEFAULT (datetime('now')),
  premier_coup_envoi TEXT NOT NULL        -- horodatage du plus proche match inclus; publie_le doit lui etre anterieur
);

CREATE TABLE IF NOT EXISTS coupon_results (
  coupon_id       INTEGER PRIMARY KEY REFERENCES coupons(id),
  gagne           INTEGER NOT NULL CHECK(gagne IN (0,1)),
  enregistre_le   TEXT NOT NULL DEFAULT (datetime('now'))
  -- pas de colonne "modifie_le": un resultat enregistre n'est jamais recalcule
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id    INTEGER NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,             -- ex: "tarif_modifie", "moyen_paiement_active"
  detail_json TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reglages globaux de l'application, cle/valeur. paiement_requis=0 par defaut pour cette
-- phase "V26 sans paiement": l'inscription accorde directement l'acces, sans passer par
-- aucune passerelle. Un administrateur pourra remettre paiement_requis=1 plus tard, une
-- fois un fournisseur de paiement reellement approuve, sans toucher au code.
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  INTEGER REFERENCES users(id),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('paiement_requis', '0');

INSERT OR IGNORE INTO payment_methods (code, actif, configure) VALUES
  ('orange_money', 0, 0),
  ('mtn_mobile_money', 0, 0),
  ('carte_bancaire', 0, 0),
  ('paypal', 0, 0);

INSERT OR IGNORE INTO subscription_plans (periodicite, prix_cents, devise) VALUES
  ('hebdomadaire', 0, 'CAD'),
  ('mensuelle', 0, 'CAD'),
  ('trimestrielle', 0, 'CAD');
