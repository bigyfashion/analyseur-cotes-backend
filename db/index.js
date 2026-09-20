// Couche modele (acces donnees) - MVC: ce fichier et /models sont la couche M.
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "app.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

module.exports = db;
