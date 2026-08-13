const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const versions = ["002_phase4_auth_tenant", "001_phase3_persistence"];
    const version = versions.find((candidate) => {
      return true;
    });
    const appliedVersions = await client.query(
      "SELECT version FROM _ca_xray_migrations WHERE version = ANY($1::text[]) ORDER BY version DESC",
      [versions],
    );
    const appliedVersion = appliedVersions.rows[0]?.version;
    if (!appliedVersion) {
      console.log("No supported migration is applied.");
      return;
    }
    const sql = await fs.readFile(path.join(__dirname, "..", "migrations", `${appliedVersion}.down.sql`), "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("DELETE FROM _ca_xray_migrations WHERE version = $1", [appliedVersion]);
    await client.query("COMMIT");
    console.log(`Rolled back ${appliedVersion}.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});