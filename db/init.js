// Applique le schema. Idempotent (CREATE TABLE IF NOT EXISTS): peut etre relance sans risque.
const fs = require("fs");
const path = require("path");
const db = require("./index");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);
console.log("Base initialisee:", db.name);
