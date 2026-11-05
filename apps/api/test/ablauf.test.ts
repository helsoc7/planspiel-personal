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

// Admin wird beim Start über die Umgebung angelegt
process.env.ADMIN_EMAIL = "helen@test.de"; process.env.ADMIN_PASSWORT = "admin-passwort-123"; process.env.ADMIN_NAME = "Helen";
const { adminEinrichten } = await import("../src/db/admin");
await adminEinrichten();
const helen = (await api(null, "POST", "/auth/anmelden", { email: "helen@test.de", passwort: "admin-passwort-123" })).data.token as string;
ok((await api(helen, "GET", "/auth/ich")).data.istAdmin === true, "Admin-Konto wird beim Start angelegt");
ok((await api(null, "POST", "/auth/anmelden", { email: "helen@test.de", passwort: "falsch" })).status === 401, "Falsches Passwort wird abgelehnt");

const spiele = await api(helen, "GET", "/spiele");
ok(spiele.data[0]?.id === "nordbyte" && spiele.data[0].runden === 11, "Spielpaket NordByte ist verfügbar");

const kurs = (await api(helen, "POST", "/kurse", { name: "Testkurs", spielId: "nordbyte", spielVersion: 1 })).data;
ok(/^[A-Z2-9]{6}$/.test(kurs.codeTeilnehmer) && /^SL-[A-Z2-9]{8}$/.test(kurs.codeLeitung), "Kurs bekommt Teilnehmer- und Spielleiter-Code");
const K = `/kurse/${kurs.id}`;

// Registrierung nur mit Code
const reg = async (email: string, name: string, code?: string) => api(null, "POST", "/auth/registrieren", { email, name, passwort: "geheim123", ...(code ? { code } : {}) });
ok((await reg("ohne@test.de", "Ohne")).status === 400, "Registrieren ohne Code geht nicht");
ok((await reg("falsch@test.de", "Falsch", "XXXXXX")).status === 404, "Registrieren mit falschem Code geht nicht");
const r1 = await reg("sara@test.de", "Sara", kurs.codeTeilnehmer);
ok(r1.status === 201 && r1.data.rolle === "teilnehmer" && r1.data.kursId === kurs.id, "Teilnehmer-Code: Konto angelegt, Teilnehmerin im Kurs");
const sara = r1.data.token as string;
const daniel = (await reg("daniel@test.de", "Daniel", kurs.codeTeilnehmer.toLowerCase())).data.token as string;
ok(!!daniel, "Codes sind unabhängig von Groß- und Kleinschreibung");
const r2 = await reg("kai@test.de", "Kai", kurs.codeLeitung);
ok(r2.data.rolle === "leitung", "Spielleiter-Code: Konto angelegt, Spielleitung im Kurs");
const kai = r2.data.token as string;
ok((await reg("sara@test.de", "Sara 2", kurs.codeTeilnehmer)).status === 409, "Doppelte E-Mail wird abgelehnt");

// Nur Admin legt Kurse an
ok((await api(sara, "POST", "/kurse", { name: "Mein Kurs", spielId: "nordbyte", spielVersion: 1 })).status === 403, "Teilnehmende können keine Kurse anlegen");
ok((await api(kai, "POST", "/kurse", { name: "Mein Kurs", spielId: "nordbyte", spielVersion: 1 })).status === 403, "Spielleitung kann keine Kurse anlegen");

// Wer sieht welche Codes
const kurz = async (t: string) => (await api(t, "GET", "/kurse")).data.find((k: { id: string }) => k.id === kurs.id);
const [kH, kK, kS] = [await kurz(helen), await kurz(kai), await kurz(sara)];
ok(kH.codeTeilnehmer && kH.codeLeitung, "Admin sieht beide Codes");
ok(kK.codeTeilnehmer && kK.codeLeitung === null, "Spielleitung sieht nur den Teilnehmer-Code");
ok(kS.codeTeilnehmer === null && kS.codeLeitung === null, "Teilnehmende sehen keine Codes");

// Codes verwalten
const neuTn = (await api(kai, "POST", `${K}/codes`, { art: "teilnehmer", aktion: "neu" })).data.code as string;
ok(neuTn && neuTn !== kurs.codeTeilnehmer, "Spielleitung erzeugt einen neuen Teilnehmer-Code");
ok((await reg("alt@test.de", "Alt", kurs.codeTeilnehmer)).status === 404, "Der alte Teilnehmer-Code gilt nicht mehr");
ok((await api(kai, "POST", `${K}/codes`, { art: "leitung", aktion: "neu" })).status === 403, "Spielleitung kann den Spielleiter-Code nicht ändern");
ok((await api(sara, "POST", `${K}/codes`, { art: "teilnehmer", aktion: "neu" })).status === 403, "Teilnehmende können keine Codes ändern");
await api(helen, "POST", `${K}/codes`, { art: "teilnehmer", aktion: "sperren" });
ok((await reg("zu@test.de", "Zu", neuTn)).status === 404, "Gesperrter Teilnehmer-Code nimmt niemanden mehr auf");
const tnCode = (await api(helen, "POST", `${K}/codes`, { art: "teilnehmer", aktion: "neu" })).data.code as string;

// Bestehende Konten treten mit Code bei
const tom = (await reg("tom@test.de", "Tom", tnCode)).data.token as string;
ok((await api(tom, "POST", "/kurse/beitreten", { code: kurs.codeLeitung })).data.rolle === "leitung", "Spielleiter-Code macht Teilnehmende zur Spielleitung");
ok((await api(kai, "POST", "/kurse/beitreten", { code: tnCode })).data.rolle === "leitung", "Teilnehmer-Code stuft die Spielleitung nicht herab");
ok((await api(sara, "POST", "/kurse/beitreten", { code: "NICHTDA" })).status === 404, "Beitritt mit falschem Code geht nicht");

// Passwort zurücksetzen
const lea = (await reg("lea@test.de", "Lea", tnCode)).data.token as string;
const uid = async (email: string) => ((await api(helen, "GET", K)).data.mitglieder as { benutzerId: string; email: string }[]).find((m) => m.email === email)!.benutzerId;
const leaId = await uid("lea@test.de");
const zr = await api(kai, "POST", `${K}/mitglieder/${leaId}/passwort`);
ok(zr.status === 200 && /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(zr.data.passwort), "Spielleitung setzt ein Einmalpasswort für Teilnehmende");
ok((await api(lea, "GET", "/kurse")).status === 401, "Alte Sitzung gilt nach dem Zurücksetzen nicht mehr");
ok((await api(null, "POST", "/auth/anmelden", { email: "lea@test.de", passwort: "geheim123" })).status === 401, "Altes Passwort gilt nicht mehr");
const leaAnm = (await api(null, "POST", "/auth/anmelden", { email: "lea@test.de", passwort: zr.data.passwort })).data;
ok(leaAnm.benutzer.passwortAendern === true, "Anmeldung mit Einmalpasswort verlangt ein neues Passwort");
ok((await api(leaAnm.token, "GET", "/kurse")).status === 403, "Mit Einmalpasswort ist sonst nichts erlaubt");
ok((await api(leaAnm.token, "POST", "/auth/passwort", { aktuell: "falsch", neu: "neues-passwort" })).status === 400, "Passwort ändern prüft das aktuelle Passwort");
const leaNeu = (await api(leaAnm.token, "POST", "/auth/passwort", { aktuell: zr.data.passwort, neu: "neues-passwort" })).data;
ok(leaNeu.benutzer.passwortAendern === false && (await api(leaNeu.token, "GET", "/kurse")).status === 200, "Nach dem Ändern geht alles wieder");
ok((await api(null, "POST", "/auth/anmelden", { email: "lea@test.de", passwort: "neues-passwort" })).status === 200, "Neues Passwort funktioniert");
const tomId = await uid("tom@test.de"), helenId = await uid("helen@test.de");
ok((await api(kai, "POST", `${K}/mitglieder/${tomId}/passwort`)).status === 403, "Spielleitung kann andere Spielleitungen nicht zurücksetzen");
ok((await api(helen, "POST", `${K}/mitglieder/${tomId}/passwort`)).status === 200, "Admin kann Spielleitungen zurücksetzen");
ok((await api(kai, "POST", `${K}/mitglieder/${helenId}/passwort`)).status === 403, "Das Admin-Konto ist ausgenommen");
ok((await api(sara, "POST", `${K}/mitglieder/${leaId}/passwort`)).status === 403, "Teilnehmende können keine Passwörter zurücksetzen");
ok((await api(kai, "POST", `${K}/mitglieder/00000000-0000-4000-8000-000000000000/passwort`)).status === 404, "Nur Mitglieder des Kurses");

const beacon = (await api(helen, "POST", `${K}/gruppen`, { name: "Team Beacon", akteur: "sd" })).data;
const delta = (await api(helen, "POST", `${K}/gruppen`, { name: "Team Delta", akteur: "sec" })).data;
ok((await api(sara, "POST", `${K}/gruppen`, { name: "X", akteur: "sd" })).status === 403, "Teilnehmende dürfen keine Gruppen anlegen");
ok((await api(kai, "POST", `${K}/gruppen`, { name: "Team Kai", akteur: "dev" })).status === 201, "Spielleitung über Code darf Gruppen anlegen");
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
