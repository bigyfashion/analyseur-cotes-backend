const db = require("../db");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

const User = {
  create(email, plainPassword, role = "abonne") {
    const hash = bcrypt.hashSync(plainPassword, SALT_ROUNDS);
    const stmt = db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
    );
    const info = stmt.run(email.toLowerCase().trim(), hash, role);
    return User.findById(info.lastInsertRowid);
  },

  findByEmail(email) {
    return db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.toLowerCase().trim());
  },

  findById(id) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  },

  verifyPassword(user, plainPassword) {
    return bcrypt.compareSync(plainPassword, user.password_hash);
  },

  // Jamais renvoyer password_hash au client
  toPublic(user) {
    if (!user) return null;
    const { password_hash, ...pub } = user;
    return pub;
  },
};

module.exports = User;
