/* eslint-disable no-console */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { pool } from "../db/pool";

async function run() {
  const dbPkgRoot = path.resolve(__dirname, "../../../../packages/db");
  const migrationsDir = path.join(dbPkgRoot, "migrations");
  const seedFile = path.join(dbPkgRoot, "seed", "seed.sql");

  const migrationFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    console.log(`Applying migration: ${file}`);
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
  }

  console.log("Applying seed data...");
  await pool.query(readFileSync(seedFile, "utf8"));

  console.log("Done.");
  await pool.end();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
