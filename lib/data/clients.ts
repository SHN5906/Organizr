import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, type Client } from "@/lib/db/schema";
import type { ClientCreateInput } from "@/lib/validation/clients";

export async function listClients(): Promise<Client[]> {
  const db = await getDb();
  return db.select().from(clients).orderBy(asc(clients.nom));
}

export async function createClient(input: ClientCreateInput): Promise<Client> {
  const db = await getDb();
  const [row] = await db.insert(clients).values(input).returning();
  return row;
}
