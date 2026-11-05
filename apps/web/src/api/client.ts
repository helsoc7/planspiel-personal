/**
 * Einzige Stelle, die mit dem Backend spricht. Die Seiten kennen nur diese Funktionen
 * und die Vertragstypen aus @planspiel/core.
 */
import type {
  AbgabeDto, AbgabeEingabe, AbgabeStatus, BenutzerDto, BewertungEingabe, ErgebnisDto, GruppeDto, KursDaten, KursKurz,
  OeffentlichesPaket, RundenStatus, Spielpaket, SpielpaketKurz,
} from "@planspiel/core";

const TOKEN = "planspiel-token";
export const tokenLesen = () => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
export const tokenSetzen = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN, t); else localStorage.removeItem(TOKEN); } catch { /* egal */ } };

export class ApiFehler extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const t = tokenLesen();
  const res = await fetch(`/api${url}`, {
    method,
    headers: { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiFehler(res.status, data?.fehler ?? "Unbekannter Fehler");
  return data as T;
}

export const api = {
  anmelden: (email: string, passwort: string) => call<{ token: string; benutzer: BenutzerDto }>("POST", "/auth/anmelden", { email, passwort }),
  registrieren: (email: string, name: string, passwort: string) => call<{ token: string; benutzer: BenutzerDto }>("POST", "/auth/registrieren", { email, name, passwort }),
  ich: () => call<BenutzerDto>("GET", "/auth/ich"),

  spiele: () => call<SpielpaketKurz[]>("GET", "/spiele"),
  kurse: () => call<KursKurz[]>("GET", "/kurse"),
  kursAnlegen: (d: { name: string; spielId: string; spielVersion: number; beginn?: string; ende?: string }) => call<{ id: string; code: string }>("POST", "/kurse", d),
  beitreten: (code: string) => call<{ id: string }>("POST", "/kurse/beitreten", { code }),

  kurs: (id: string) => call<KursDaten>("GET", `/kurse/${id}`),
  spiel: (id: string) => call<Spielpaket | OeffentlichesPaket>("GET", `/kurse/${id}/spiel`),
  ergebnisse: (id: string, vorschau = false) => call<ErgebnisDto>("GET", `/kurse/${id}/ergebnisse${vorschau ? "?vorschau=1" : ""}`),

  gruppeAnlegen: (id: string, name: string, akteur: string) => call<GruppeDto>("POST", `/kurse/${id}/gruppen`, { name, akteur }),
  gruppeLoeschen: (id: string, gid: string) => call<null>("DELETE", `/kurse/${id}/gruppen/${gid}`),
  zuordnen: (id: string, uid: string, gruppeId: string | null) => call<null>("PATCH", `/kurse/${id}/mitglieder/${uid}`, { gruppeId }),

  rundeStatus: (id: string, nr: number, status: RundenStatus) => call<null>("POST", `/kurse/${id}/runden/${nr}/status`, { status }),
  abgabe: (id: string, nr: number, e: AbgabeEingabe) => call<AbgabeDto>("PUT", `/kurse/${id}/runden/${nr}/abgabe`, e),
  abgabeStatus: (id: string, aid: string, status: Extract<AbgabeStatus, "freigegeben" | "zurueckgegeben">) => call<null>("PATCH", `/kurse/${id}/abgaben/${aid}`, { status }),
  bewerten: (id: string, nr: number, gid: string, b: BewertungEingabe) => call<null>("PUT", `/kurse/${id}/runden/${nr}/bewertungen/${gid}`, b),
  wuerfeln: (id: string, nr: number) => call<null>("POST", `/kurse/${id}/runden/${nr}/wuerfeln`),
};
