import postgres from "postgres";
import { execSync } from "child_process";

const setup = async () => {
  const sql = postgres("postgresql://postgres:postgres@postgres:5432/postgres");

  try {
    console.log("1. Recreating the test database...");

    await sql`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'analytics_test'
        AND pid <> pg_backend_pid();
    `;

    await sql`DROP DATABASE IF EXISTS analytics_test;`;
    await sql`CREATE DATABASE analytics_test;`;

    console.log("Test database 'analytics_test' successfully created.");
  } catch (e: any) {
    console.error("Database setup error:", e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }

  console.log("2. Applying Drizzle schema...");
  try {
    // Using --force to bypass interactive prompts in the console
    execSync("npx drizzle-kit push --force", {
      env: {
        ...process.env,
        DATABASE_URL:
          "postgresql://postgres:postgres@postgres:5432/analytics_test",
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
