import { createDbClient } from "./db.js";

const client = await createDbClient();
try {
  const result = await client.query("SELECT version()");
  console.log(result);
} finally {
  await client.end();
  console.log("Le client est déconnecté.");
}
