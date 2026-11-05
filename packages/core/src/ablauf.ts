/** Rundenablauf: gleich in jedem Spiel. */
export type RundenStatus = "gesperrt" | "offen" | "geschlossen" | "ausgewertet";
export type AbgabeStatus = "entwurf" | "abgegeben" | "freigegeben" | "zurueckgegeben";
export type Rolle = "leitung" | "teilnehmer";

export const RUNDEN_STATUS_LABEL: Record<RundenStatus, string> = {
  gesperrt: "Gesperrt",
  offen: "Offen",
  geschlossen: "Geschlossen",
  ausgewertet: "Ausgewertet",
};

export const ABGABE_STATUS_LABEL: Record<AbgabeStatus, string> = {
  entwurf: "Entwurf",
  abgegeben: "Abgegeben",
  freigegeben: "Freigegeben",
  zurueckgegeben: "Zurückgegeben",
};

const NAECHSTER: Record<RundenStatus, RundenStatus | null> = {
  gesperrt: "offen",
  offen: "geschlossen",
  geschlossen: "ausgewertet",
  ausgewertet: null,
};

export function erlaubterUebergang(von: RundenStatus, nach: RundenStatus) {
  return NAECHSTER[von] === nach || (von === "geschlossen" && nach === "offen");
}
