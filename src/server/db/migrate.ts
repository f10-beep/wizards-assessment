import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { dbResult } from "./index";

const migrationsFolder = "./drizzle";

async function main() {
  if (dbResult.kind === "neon") {
    await migrateNeon(dbResult.db, { migrationsFolder });
  } else {
    await migratePglite(dbResult.db, { migrationsFolder });
  }
  console.log(`Migrations applied (${dbResult.kind}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
