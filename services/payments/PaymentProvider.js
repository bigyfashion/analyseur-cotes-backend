/**
 * Interface commune que chaque passerelle de paiement doit respecter
 * (exigence EB v25: "chaque passerelle de paiement doit etre developpee comme
 * un module d'integration isole derriere une interface commune").
 *
 * Chaque fichier de ./services/payments/*.js exporte un objet avec cette forme:
 *
 *   {
 *     code: 'orange_money' | 'mtn_mobile_money' | 'carte_bancaire' | 'paypal',
 *     isConfigured(): boolean
 *       -> true seulement si les variables d'environnement necessaires (cles API,
 *          identifiant marchand) sont presentes. Ne verifie PAS qu'elles sont valides
 *          aupres du prestataire, seulement qu'elles existent.
 *     initiatePayment({ subscriptionId, amountCents, currency }): Promise<{ redirectUrl | reference }>
 *       -> demarre le paiement via l'API officielle du prestataire. Ne DOIT jamais
 *          manipuler de numero de carte ou d'identifiant mobile money en clair:
 *          c'est le prestataire qui les collecte, sur ses propres pages/SDK.
 *     verifyWebhookSignature(rawBody, headers): boolean
 *       -> verifie la signature cryptographique du webhook de confirmation avant
 *          toute activation d'acces (exigence de securite des paiements, section 5).
 *          Sans cle secrete de webhook configuree, doit renvoyer false.
 *   }
 *
 * Aucune donnee de paiement brute (numero de carte, identifiants mobile money) ne doit
 * jamais transiter par cette couche vers la base de donnees de l'application: seules les
 * references de transaction renvoyees par le prestataire sont conservees (voir
 * payment_transactions.reference_prestataire dans db/schema.sql).
 */
module.exports = {}; // fichier de documentation uniquement, rien a exporter
