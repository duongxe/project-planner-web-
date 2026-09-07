import path from "path";
import { fileURLToPath } from "url";
import { createDatabase } from "./src/db/connection.js";
import { bootstrapDatabase } from "./src/db/bootstrap.js";
import { createApp } from "./src/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "data", "academic_advising.db");
const migrationsDir = path.join(__dirname, "db", "migrations");
const seedsDir = path.join(__dirname, "db", "seeds");

const db = createDatabase(dbFile);
bootstrapDatabase(db, { migrationsDir, seedsDir });

const app = createApp({ db, projectRoot: path.resolve(__dirname, "..") });
const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Academic advising backend running on http://localhost:${port}`);
});
