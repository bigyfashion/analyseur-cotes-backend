const crypto = require("crypto");

/**
 * Verification de signature HMAC-SHA256 generique (le mecanisme utilise par la
 * plupart des prestataires pour signer leurs webhooks). La LOGIQUE est reelle et
 * correcte; ce qui manque tant qu'aucun contrat marchand n'est obtenu, c'est le
 * secret lui-meme (WEBHOOK_SECRET absent => renvoie toujours false, jamais un
 * acces debloque par defaut).
 */
function verifyHmacSignature(rawBody, signatureHeader, secretEnvVar) {
  const secret = process.env[secretEnvVar];
  if (!secret || !signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false; // longueurs differentes = signature invalide, jamais une exception qui bloque le serveur
  }
}

function requireEnv(names) {
  return names.every((n) => !!process.env[n] && process.env[n].trim() !== "");
}

module.exports = { verifyHmacSignature, requireEnv };
