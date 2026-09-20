# Backend V26 · Analyseur de cotes de paris

Backend MVC (comptes, abonnement, historique de performance infalsifiable,
administration des tarifs, quatre passerelles de paiement) pour l'application
existante. Ce backend est **testé et fonctionnel** pour tout ce qui ne touche
pas à de l'argent réel. Les quatre passerelles de paiement sont **des modules
réels mais délibérément non fonctionnels** (stubs) tant que les identifiants
marchands réels ne sont pas fournis — voir la section "Ce qui reste à faire"
ci-dessous avant toute mise en production.

## Mode actuel : inscription sans paiement

Tant qu'aucun fournisseur de paiement n'est réellement branché, l'application
tourne en **mode d'accès gratuit** : `paiement_requis = false` par défaut.
Conséquence concrète, testée :

- L'inscription (`POST /auth/register`) accorde immédiatement un abonnement
  **actif** (365 jours), sans passer par aucune passerelle. La réponse inclut
  directement `accessToken` et `refreshToken` : plus besoin d'un appel de
  connexion séparé juste après.
- Chaque abonnement ainsi accordé porte `origine: "gratuit_sans_paiement"`
  dans la base — jamais confondu avec un vrai paiement confirmé
  (`origine: "paiement"`, réservé aux abonnements activés par un webhook
  signé). L'historique reste honnête sur ce qui s'est réellement passé.
- `GET /subscriptions/plans` expose `paiementRequis: false` pour qu'un futur
  frontend sache ne pas afficher de formulaire de paiement.

### Réactiver le paiement plus tard

Une fois un fournisseur réellement approuvé (voir section précédente) :

```bash
curl -X PUT https://ton-service.onrender.com/api/v1/admin/settings \
  -H "Authorization: Bearer <jeton admin>" \
  -H "Content-Type: application/json" \
  -d '{"paiementRequis": true}'
```

Aucun redéploiement requis. À partir de ce moment, les nouvelles inscriptions
ne reçoivent plus d'accès gratuit automatique et doivent passer par
`POST /subscriptions/subscribe` comme prévu dans le flux payant.

## Déploiement sans accès Shell (ex. palier gratuit Render)

Le Shell n'est pas inclus sur le palier gratuit de plusieurs hébergeurs. Ce
backend est conçu pour ne jamais en avoir besoin :

- **Le schéma de base de données s'initialise automatiquement** à chaque
  démarrage du serveur (`initSchema()` appelé en tête de `server.js`,
  idempotent — sans risque de le relancer).
- **Le tout premier compte administrateur se crée par une requête web**,
  pas par une commande : définis `SETUP_TOKEN` dans les variables
  d'environnement du service (une valeur aléatoire longue, gardée secrète),
  puis :

  ```bash
  curl -X POST https://ton-service.onrender.com/api/v1/setup/create-admin \
    -H "Content-Type: application/json" \
    -H "x-setup-token: <la valeur de SETUP_TOKEN>" \
    -d '{"email":"toi@exemple.com","password":"un-mot-de-passe-solide"}'
  ```

  Sans le bon jeton, cette route refuse systématiquement (testé).

### Limite importante du palier gratuit à connaître

Sur le palier gratuit de Render, le disque du service est **éphémère** : il
est remis à zéro non seulement à chaque redéploiement, mais aussi **à chaque
réveil du service après 15 minutes d'inactivité**. Concrètement, la base
SQLite (comptes, abonnements, coupons) peut disparaître plusieurs fois par
jour tant que le service reste sur ce palier — ce n'est pas un incident, c'est
le comportement normal de l'offre gratuite. C'est sans conséquence tant qu'il
s'agit de tests, puisqu'aucune donnée réelle d'abonné n'existe encore (aucune
passerelle de paiement n'est branchée). Avant de compter sur des comptes qui
persistent réellement dans le temps, deux options : passer au palier payant
Render avec un disque persistant, ou migrer vers une base Postgres managée
(gratuite chez Render mais qui expire après 30 jours, ou un fournisseur tiers)
— le schéma de `db/schema.sql` se transpose directement, seul le client
`better-sqlite3` serait à remplacer par un client Postgres (`pg`).

## Ce qui est réel et testé aujourd'hui

- Inscription, connexion, mots de passe hachés (bcrypt), jetons JWT à durée de
  vie courte (15 min) + rafraîchissement (7 jours).
- Contrôle d'accès par rôle (`visiteur` / `abonne` / `administrateur`) **vérifié
  côté serveur** sur chaque route, pas seulement côté interface.
- Panneau d'administration (API) : tarifs par périodicité, activation des
  moyens de paiement — **un administrateur ne peut pas activer un moyen de
  paiement dont les clés API réelles sont absentes**, même s'il le demande.
  Testé.
- Historique de performance des coupons **infalsifiable** : aucune route
  `PUT`/`PATCH`/`DELETE` n'existe sur les coupons ou leurs résultats. Un
  coupon est horodaté avant le coup d'envoi ; un résultat ne peut être
  enregistré qu'une seule fois. Testé.
- Réception des webhooks de paiement avec **vérification de signature
  HMAC réelle** : sans secret configuré, un webhook non signé est rejeté
  (401) et n'active jamais d'abonnement. Testé.
- Sécurité de base : HTTPS forcé en production, en-têtes `helmet`, limitation
  de débit (en particulier sur `/auth/login`), gestion d'erreurs qui ne fuite
  jamais de stack trace.
- Architecture MVC : `models/` (accès données), `controllers/` (logique
  métier), `routes/api-v1.js` (API versionnée) — le frontend (existant, en
  `pwa/`, ou un futur frontend abonné/admin) consomme cette API séparément.

## Ce qui reste à faire avant un lancement réel (dans cet ordre)

1. **Confirmer un fournisseur pour la carte bancaire.** Stripe et PayPal
   classent le pronostic sportif contre paiement dans leur politique jeux
   d'argent (restreint ou interdit selon les cas) — vérifié dans leurs
   conditions publiques. Il faut soit obtenir une approbation écrite
   explicite de l'un d'eux, soit passer par un processeur spécialisé
   "high-risk". Sans ça, `carte_bancaire` et `paypal` resteront non
   configurables.
2. **Vérifier la réglementation applicable** dans chaque marché visé (Québec :
   RACJ pour la publicité sur les jeux d'argent ; chaque pays visé par Orange
   Money / MTN Mobile Money a son propre régime sur les paris sportifs).
   Ceci dépasse ce que du code peut résoudre.
3. **Obtenir les contrats marchands et clés API réelles** pour Orange Money,
   MTN Mobile Money, le processeur CB retenu, et un compte PayPal Business.
   Renseigner ces clés dans `.env` (voir `.env.example`) : chaque module se
   configure automatiquement dès que ses variables sont présentes, sans
   toucher au code.
4. **Choisir une infrastructure d'hébergement pour ce backend.** Ce n'est pas
   un site statique : il faut un service qui exécute du code Node en continu
   avec une base de données persistante. Options courantes : Render, Railway
   ou Fly.io avec une base Postgres managée (remplacer `better-sqlite3` par
   un client Postgres, ex. `pg`, à ce moment-là — le schéma SQL de
   `db/schema.sql` se transpose directement).
5. Compléter le `TODO` dans chaque fichier de `services/payments/*.js` avec
   le véritable appel à l'API/SDK officiel du prestataire, une fois ses clés
   en main.

## Démarrage local

```bash
npm install
cp .env.example .env        # puis remplir JWT_SECRET au minimum
npm run init-db             # crée db/app.db et son schéma
node scripts/create-admin.js "admin@exemple.com" "mot-de-passe-solide"
npm start                   # API sur http://localhost:3001
```

## Aperçu des routes (`/api/v1`)

| Route | Méthode | Accès | Rôle |
|---|---|---|---|
| `/auth/register`, `/auth/login`, `/auth/refresh` | POST | public | — |
| `/subscriptions/plans` | GET | public | — |
| `/subscriptions/me`, `/subscriptions/subscribe` | GET/POST | connecté | abonné |
| `/coupons/today` | GET | connecté | abonné actif |
| `/coupons/performance` | GET | **public** (volontaire, voir EB) | — |
| `/coupons`, `/coupons/result` | POST | connecté | administrateur |
| `/admin/plans`, `/admin/payment-methods`, `/admin/subscribers`, `/admin/audit-log` | GET/PUT | connecté | administrateur |
| `/payments/:provider/webhook` | POST | signature vérifiée (pas de JWT) | — |

## Ce que ce backend ne fait jamais

- Ne stocke aucune donnée de paiement brute (numéro de carte, identifiant
  mobile money) — seules les références de transaction renvoyées par chaque
  prestataire sont conservées.
- Ne se connecte à aucun compte bet365 / betpawa / 1xbet et ne place aucune
  mise — cette limite, posée depuis la toute première version de l'outil,
  reste inchangée.
- Ne modifie ni ne supprime jamais un coupon publié ou un résultat enregistré.
- N'active jamais un moyen de paiement ni un abonnement sans vérification
  réelle (clés présentes, signature de webhook valide).
