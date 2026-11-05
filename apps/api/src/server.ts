import { serve } from "@hono/node-server";
import { app } from "./app";
import { config } from "./config";
import { migrate } from "./db/migrate";
import { demo, paketeEinspielen } from "./db/seed";

// Auf die Datenbank warten (z. B. beim Start im Container)
for (let i = 1; ; i++) {
  try {
    await migrate();
    break;
  } catch (e) {
    if (i >= 30) throw e;
    console.log(`Datenbank noch nicht bereit, Versuch ${i} …`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await paketeEinspielen();
if (process.env.DEMO_DATEN === "1") await demo();
serve({ fetch: app.fetch, port: config.port }, (i) => console.log(`API läuft auf http://localhost:${i.port}`));
