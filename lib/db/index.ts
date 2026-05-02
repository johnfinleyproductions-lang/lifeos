import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check ~/lifeos/.env.local");
}

// Single connection pool for the process. Postgres-js handles pooling.
// max: 10 keeps us friendly to the shared M90t Postgres that EC also uses.
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
});

export const db = drizzle(queryClient, { schema });

export type DbClient = typeof db;
