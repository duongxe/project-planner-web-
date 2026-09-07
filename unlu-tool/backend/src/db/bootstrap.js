import fs from "fs";
import path from "path";

function ensureHistoryTable(db, tableName) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function applySqlDirectory(db, directoryPath, historyTableName) {
  ensureHistoryTable(db, historyTableName);

  const files = fs
    .readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  const hasRunStatement = db.prepare(`SELECT 1 FROM ${historyTableName} WHERE name = ?`);
  const markRunStatement = db.prepare(`INSERT INTO ${historyTableName} (name) VALUES (?)`);

  for (const fileName of files) {
    if (hasRunStatement.get(fileName)) {
      continue;
    }

    const filePath = path.join(directoryPath, fileName);
    const sql = fs.readFileSync(filePath, "utf8");

    const transaction = db.transaction(() => {
      db.exec(sql);
      markRunStatement.run(fileName);
    });

    transaction();
  }
}

export function bootstrapDatabase(db, { migrationsDir, seedsDir }) {
  applySqlDirectory(db, migrationsDir, "schema_migrations");
  applySqlDirectory(db, seedsDir, "seed_history");
}
