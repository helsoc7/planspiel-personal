/** Verträge zwischen Backend und Frontend. Beide Seiten importieren nur diese Typen. */
import type { AbgabeStatus, Rolle, RundenStatus } from "./ablauf";
import type { Entscheidung, RundenErgebnis, ZielStatus } from "./regelwerk";

/**
 * istAdmin: darf Kurse anlegen und Spielleiter-Codes verwalten.
 * passwortAendern: hat ein Einmalpasswort und muss es vor allem anderen ändern.
 */
export interface BenutzerDto { id: string; email: string; name: string; istAdmin: boolean; passwortAendern: boolean }

export interface SpielpaketKurz {
  id: string; version: number; name: string; thema: string; status: "entwurf" | "freigegeben" | "archiviert";
  runden: number; akteure: number; begriffAkteure: string;
  /** Typ der Fabrik, die das Paket ausführt, z. B. "personal-standard". */
  fabrik: string;
  /** false, wenn keine Fabrik für diesen Typ registriert ist. Dann kann kein Kurs damit starten. */
  spielbar: boolean;
}

export interface KursKurz {
  id: string; name: string; spielId: string; spielVersion: number; spielName: string;
  rolle: Rolle; beginn: string | null; ende: string | null; aktuelleRunde: number; rundenGesamt: number;
  /** Nur für die Spielleitung, null wenn gesperrt. */
  codeTeilnehmer: string | null;
  /** Nur für die Administration, null wenn gesperrt. */
  codeLeitung: string | null;
}

export type CodeArt = "teilnehmer" | "leitung";

export interface GruppeDto { id: string; name: string; akteur: string }
export interface MitgliedDto { benutzerId: string; name: string; email: string; rolle: Rolle; gruppeId: string | null }
export interface RundeDto { nr: number; status: RundenStatus }
export interface AbgabeDto {
  id: string; gruppeId: string; runde: number; entscheidung: Entscheidung; begruendung: string;
  status: AbgabeStatus; aktualisiert: string;
}
export interface BewertungDto {
  gruppeId: string; runde: number; wurf: number | null; punkte: number; korrektur: Record<string, number>; kommentar: string;
}

export interface KursDaten {
  kurs: KursKurz;
  ich: { benutzerId: string; rolle: Rolle; gruppeId: string | null };
  gruppen: GruppeDto[];
  mitglieder: MitgliedDto[];
  runden: RundeDto[];
  abgaben: AbgabeDto[];
  bewertungen: BewertungDto[];
  /** Verfügbare Ressourcen der eigenen Gruppe in der offenen Runde. */
  rahmen: Record<string, number> | null;
}

export interface ErgebnisDto {
  bisRunde: number;
  gruppen: { gruppeId: string; akteur: string; start: RundenErgebnis; verlauf: RundenErgebnis[] }[];
  ziel: ZielStatus;
}

export interface AbgabeEingabe { entscheidung: Entscheidung; begruendung: string; abgeben: boolean }
export interface BewertungEingabe { wurf: number | null; punkte: number; korrektur?: Record<string, number>; kommentar?: string }
