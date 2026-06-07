const crypto = require("crypto");

/**
 * Gera um hash PBKDF2 para uma senha.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}

function isPasswordHash(value) {
  return /^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(String(value || ""));
}

/**
 * Verifica se a senha informada corresponde ao hash armazenado.
 */
function verifyPassword(password, storedHash) {
  if (!isPasswordHash(storedHash)) {
    return false;
  }

  const [salt, originalHash] = String(storedHash).split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 64, "sha512")
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

module.exports = {
  hashPassword,
  verifyPassword,
  isPasswordHash,
};
