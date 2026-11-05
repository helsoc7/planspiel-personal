const UNSICHER = ["", "nur-fuer-die-entwicklung", "bitte-aendern", "bitte-in-der-env-datei-aendern", "hier-einen-langen-zufaelligen-wert-eintragen"];
const secret = process.env.JWT_SECRET ?? "";
const produktiv = process.env.NODE_ENV === "production";
const demo = process.env.DEMO_DATEN === "1";

// Mit bekanntem oder kurzem Schlüssel ließen sich Anmeldungen fälschen.
// Im Betrieb ohne Demodaten startet die API dann gar nicht, im Demo-Betrieb gibt es eine Warnung.
if (produktiv && (UNSICHER.includes(secret) || secret.length < 32)) {
  const text = "JWT_SECRET fehlt oder ist unsicher (mindestens 32 Zeichen, z. B. mit: openssl rand -hex 32)";
  if (!demo) throw new Error(text);
  console.warn(`WARNUNG: ${text}. Für den Demo-Betrieb geht es weiter, für echte Kurse nicht.`);
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://planspiel:planspiel@localhost:5432/planspiel",
  jwtSecret: new TextEncoder().encode(secret || "nur-fuer-die-entwicklung"),
  port: Number(process.env.PORT ?? 8787),
};
