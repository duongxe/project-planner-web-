import Database from "better-sqlite3";

export function createDatabase(dbFile) {
  const db = new Database(dbFile);
  db.pragma("foreign_keys = ON");
  return db;
}
