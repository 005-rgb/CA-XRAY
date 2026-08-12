const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const version = "001_phase3_persistence";
    const applied = await client.query("SELECT 1 FROM _ca_xray_migrations WHERE version = $1", [version]);
    if (!applied.rowCount) {
      console.log(`${version} is not applied.`);
      return;
    }
    const sql = await fs.readFile(path.join(__dirname, "..", "migrations", `${version}.down.sql`), "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("DELETE FROM _ca_xray_migrations WHERE version = $1", [version]);
    await client.query("COMMIT");
    console.log(`Rolled back ${version}.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});