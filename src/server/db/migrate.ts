import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { dbResult } from "./index";

const migrationsFolder = "./drizzle";

async function main() {
  if (dbResult.kind === "neon") {
    await migrateNeon(dbResult.db, { migrationsFolder });
  } else {
    await migratePg(dbResult.db, { migrationsFolder });
  }
  console.log(`Migrations applied (${dbResult.kind}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
