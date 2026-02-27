import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@postgres:5432/postgres";

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
