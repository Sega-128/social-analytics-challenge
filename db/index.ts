import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL as string;
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });
