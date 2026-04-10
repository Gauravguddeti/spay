import { Pool, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import ws from "ws"

import * as schema from "@/lib/db/schema"

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/spay"

neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString })

export const db = drizzle(pool, { schema })