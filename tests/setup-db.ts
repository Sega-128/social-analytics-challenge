import postgres from "postgres";
import { execSync } from "child_process";

const setup = async () => {
  const adminUrl = process.env.DATABASE_URL as string;
  const testUrl = process.env.TEST_DATABASE_URL as string;
  const testDbName = process.env.TEST_DB_NAME as string;

  const sql = postgres(adminUrl);

  try {
    console.log("1. Recreating the test database...");

    await sql`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = ${testDbName}
        AND pid <> pg_backend_pid();
    `;

    await sql.unsafe(`DROP DATABASE IF EXISTS ${testDbName};`);
    await sql.unsafe(`CREATE DATABASE ${testDbName};`);

    console.log(`Test database '${testDbName}' successfully created.`);
  } catch (e) {
    const err = e as Error;
    console.error("Database setup error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }

  console.log("2. Applying Drizzle schema...");
  try {
    execSync("npx drizzle-kit push --force", {
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
      },
      stdio: "inherit",
    });
    console.log("Database schema synchronized.");
  } catch {
    console.error("Error during schema push.");
    process.exit(1);
  }
};

setup();
