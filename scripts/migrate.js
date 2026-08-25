const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

const migrationDir = path.join(__dirname, "..", "migrations");
const migrations = [
  ["001_phase3_persistence", "2.0.0", "1.0.0"],
  ["002_phase4_auth_tenant", "2.0.0", "1.0.0"],
  ["003_phase5_scan_jobs", "2.1.0", "1.1.0"],
  ["004_phase6_intelligence", "2.1.0", "1.1.0"],
  ["005_phase9_trajectory_deployer", "2.2.0", "1.2.0"],
  ["006_settings_retention", "2.2.0", "1.2.0"],
  ["007_phase1_durable_queue", "2.3.0", "1.3.0"],
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS _ca_xray_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await client.query("SELECT pg_advisory_lock(hashtext('ca-xray:migrations'))");
    for (const [migrationVersion, engineVersion, evidenceSchemaVersion] of migrations) {
      const applied = await client.query("SELECT 1 FROM _ca_xray_migrations WHERE version = $1", [migrationVersion]);
      if (applied.rowCount) {
        console.log(`${migrationVersion} is already applied.`);
        continue;
      }
      {
        const sql = await fs.readFile(path.join(migrationDir, `${migrationVersion}.sql`), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
          VALUES ($1, $2, $3)
         ON CONFLICT (version) DO UPDATE
           SET engine_version = EXCLUDED.engine_version,
               evidence_schema_version = EXCLUDED.evidence_schema_version,
               applied_at = NOW()`,
          [migrationVersion, engineVersion, evidenceSchemaVersion],
      );
      await client.query("INSERT INTO _ca_xray_migrations(version) VALUES ($1)", [migrationVersion]);
      await client.query("COMMIT");
      console.log(`Applied ${migrationVersion}.`);
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('ca-xray:migrations'))").catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});