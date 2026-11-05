export {};
/**
 * Durchlauf gegen eine echte PostgreSQL-Datenbank: Runde 0 und 1 mit Team Delta wie im Foliensatz.
 * Start: DATABASE_URL=postgres://…/planspiel_test pnpm --filter @planspiel/api test
 */
process.env.NODE_ENV = "test";
const { pool } = await import("../src/db/pool");
const { migrate } = await import("../src/db/migrate");
const { paketeEinspielen } = await import("../src/db/seed");
const { app } = await import("../src/app");

let fehler = 0;
const ok = (bed: unknown, text: string) => { console.log(`${bed ? "✓" : "✗"} ${text}`); if (!bed) fehler++; };

async function api(token: string | null, method: string, url: string, body?: unknown) {
  const res = await app.request(`/api${url}`, {
    method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

await pool.query("drop schema public cascade; create schema public;");
await migrate();
await paketeEinspielen();

const reg = async (email: string, name: string) => (await api(null, "POST", "/auth/registrieren", { email, name, passwort: "geheim123" })).data.token as string;
const helen = await reg("helen@test.de", "Helen");
const sara = await reg("sara@test.de", "Sara");
const daniel = await reg("daniel@test.de", "Daniel");
ok((await api(null, "POST", "/auth/anmelden", { email: "helen@test.de", passwort: "falsch" })).status === 401, "Falsches Passwort wird abgelehnt");

const spiele = await api(helen, "GET", "/spiele");
ok(spiele.data[0]?.id === "nordbyte" && spiele.data[0].runden === 11, "Spielpaket NordByte ist verfügbar");

const kurs = (await api(helen, "POST", "/kurse", { name: "Testkurs", spielId: "nordbyte", spielVersion: 1 })).data;
const K = `/kurse/${kurs.id}`;
const beacon = (await api(helen, "POST", `${K}/gruppen`, { name: "Team Beacon", akteur: "sd" })).data;
const delta = (await api(helen, "POST", `${K}/gruppen`, { name: "Team Delta", akteur: "sec" })).data;
ok((await api(sara, "POST", `${K}/gruppen`, { name: "X", akteur: "sd" })).status === 403, "Teilnehmende dürfen keine Gruppen anlegen");
await api(sara, "POST", "/kurse/beitreten", { code: kurs.code });
await api(daniel, "POST", "/kurse/beitreten", { code: kurs.code.toLowerCase() });
const mitglieder = (await api(helen, "GET", K)).data.mitglieder as { benutzerId: string; name: string }[];
const id = (n: string) => mitglieder.find((m) => m.name === n)!.benutzerId;
await api(helen, "PATCH", `${K}/mitglieder/${id("Sara")}`, { gruppeId: beacon.id });
await api(helen, "PATCH", `${K}/mitglieder/${id("Daniel")}`, { gruppeId: delta.id });

ok((await api(sara, "PUT", `${K}/runden/0/abgabe`, { entscheidung: { zusatz: [] }, begruendung: "x", abgeben: true })).status === 409, "Gesperrte Runde nimmt keine Abgabe an");
ok((await api(sara, "POST", `${K}/runden/0/status`, { status: "offen" })).status === 403, "Teilnehmende können Runden nicht freigeben");
await api(helen, "POST", `${K}/runden/0/status`, { status: "offen" });

const tn = (await api(daniel, "GET", `${K}/spiel`)).data;
ok(tn.runden[1].optionen[0].wirkung === undefined && tn.regeln === undefined, "Teilnehmende sehen keine Wirkungen der Optionen");
ok((await api(helen, "GET", `${K}/spiel`)).data.runden[1].optionen[0].wirkung !== undefined, "Spielleitung sieht die Wirkungen");

await api(daniel, "PUT", `${K}/runden/0/abgabe`, { entscheidung: { zusatz: [] }, begruendung: "Risiko 1 …", abgeben: true });
await api(sara, "PUT", `${K}/runden/0/abgabe`, { entscheidung: { zusatz: [] }, begruendung: "Entwurf", abgeben: false });
const saraSicht = (await api(sara, "GET", K)).data;
ok(saraSicht.abgaben.length === 1 && saraSicht.abgaben[0].gruppeId === beacon.id, "Teilnehmende sehen nur die Abgabe der eigenen Gruppe");
ok(saraSicht.mitglieder.every((m: { benutzerId: string; email: string; gruppeId: string }) => m.gruppeId === beacon.id && (m.benutzerId === id("Sara") || m.email === "")), "Teilnehmende sehen nur die eigene Gruppe, ohne fremde E-Mails");
ok(saraSicht.rahmen?.budget === 30 && saraSicht.rahmen?.fz === 10, "Rahmen in Runde 0: 30 T€ und 10 Führungszeit");

await api(helen, "POST", `${K}/runden/0/status`, { status: "geschlossen" });
await api(helen, "PUT", `${K}/runden/0/bewertungen/${delta.id}`, { wurf: 3, punkte: 2 });
await api(helen, "PUT", `${K}/runden/0/bewertungen/${beacon.id}`, { wurf: null, punkte: 1 });
await api(helen, "POST", `${K}/runden/0/wuerfeln`);
const bew0 = (await api(helen, "GET", K)).data.bewertungen as { gruppeId: string; wurf: number }[];
ok(bew0.find((b) => b.gruppeId === delta.id)?.wurf === 3 && bew0.find((b) => b.gruppeId === beacon.id)?.wurf! >= 1, "Würfeln ergänzt nur fehlende Würfe");
ok((await api(helen, "PUT", `${K}/runden/0/bewertungen/${delta.id}`, { wurf: 3, punkte: 4 })).status === 400, "Mehr als 3 Begründungspunkte werden abgelehnt");
await api(helen, "POST", `${K}/runden/0/status`, { status: "ausgewertet" });

let erg = (await api(daniel, "GET", `${K}/ergebnisse`)).data;
const d0 = erg.gruppen.find((g: { gruppeId: string }) => g.gruppeId === delta.id).verlauf[0];
ok(Math.abs(d0.gesamtwert - 75) < 1e-9, `Team Delta nach Runde 0: Teamwert ${d0.gesamtwert.toFixed(1)} (Folien: 75,0)`);

await api(helen, "POST", `${K}/runden/1/status`, { status: "offen" });
ok((await api(daniel, "GET", K)).data.rahmen?.budget === 60, "Runde 1: Delta hat 60 T€ (30 übrig + 30 neu)");
ok((await api(daniel, "PUT", `${K}/runden/1/abgabe`, { entscheidung: { option: "X", zusatz: [] }, begruendung: "", abgeben: true })).status === 400, "Unbekannte Option wird abgelehnt");
ok((await api(daniel, "PUT", `${K}/runden/1/abgabe`, { entscheidung: { zusatz: ["Z1"] }, begruendung: "", abgeben: true })).status === 400, "Abgabe ohne Hauptentscheidung wird abgelehnt");
ok((await api(sara, "PUT", `${K}/runden/1/abgabe`, { entscheidung: { option: "A", zusatz: ["Z2"] }, begruendung: "", abgeben: true })).status === 400, "Rotation ohne Partnerabteilung wird abgelehnt");
await api(daniel, "PUT", `${K}/runden/1/abgabe`, { entscheidung: { option: "B", zusatz: ["Z4", "Z1"] }, begruendung: "Lücke 3 Stellen …", abgeben: true });
await api(sara, "PUT", `${K}/runden/1/abgabe`, { entscheidung: { option: "A", zusatz: ["Z2"], partner: { Z2: delta.id } }, begruendung: "", abgeben: true });
await api(helen, "POST", `${K}/runden/1/status`, { status: "geschlossen" });
await api(helen, "PUT", `${K}/runden/1/bewertungen/${delta.id}`, { wurf: 5, punkte: 2 });
await api(helen, "PUT", `${K}/runden/1/bewertungen/${beacon.id}`, { wurf: 3, punkte: 1 });
await api(helen, "POST", `${K}/runden/1/status`, { status: "ausgewertet" });

erg = (await api(sara, "GET", `${K}/ergebnisse`)).data;
const dv = erg.gruppen.find((g: { gruppeId: string }) => g.gruppeId === delta.id).verlauf[1];
const bv = erg.gruppen.find((g: { gruppeId: string }) => g.gruppeId === beacon.id).verlauf[1];
ok(Math.abs(dv.gesamtwert - 79.418) < 0.01, `Team Delta nach Runde 1: Teamwert ${dv.gesamtwert.toFixed(1)} (Folien: 79,4)`);
ok(dv.ressourcen.budget.rest === 47 && dv.werte.zugang === 0.5, "Delta: 47 T€ übrig, eine halbe Stelle kommt in Runde 2");
ok(!bv.ursachen.some((u: { quelle: string }) => u.quelle.startsWith("Z2")), "Rotation ohne Gegenstück zählt nicht");
ok(erg.ziel.bedingungen.length === 3, "Firmenziel wird geprüft");
ok((await api(helen, "POST", `${K}/runden/3/status`, { status: "offen" })).status === 409, "Runde 3 kann nicht vor Runde 2 starten");

console.log(fehler ? `\n${fehler} Fehler` : "\nAlle Prüfungen bestanden");
await pool.end();
process.exit(fehler ? 1 : 0);
