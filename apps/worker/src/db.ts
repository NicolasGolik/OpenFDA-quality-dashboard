import pg from "pg";

export async function createDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquante : vérifier apps/worker/.env");
  }
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Client connecté.");
  return client;
}
