import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useDaten } from "@/api/hooks";
import { AppHeader } from "@/components/spiel/Rahmen";
import { Abschnitt, Auswahl, Button, Chip, Eingabe, Feld, Hinweis, Karte, Laden, Seitentitel } from "@/components/ui";

export function KursAnlegen() {
  const nav = useNavigate();
  const { daten: spiele } = useDaten(() => api.spiele(), [], 0);
  const [name, setName] = useState("");
  const [beginn, setBeginn] = useState("");
  const [ende, setEnde] = useState("");
  const [wahl, setWahl] = useState<string>("");
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const startbar = (s: { status: string; spielbar: boolean }) => s.status === "freigegeben" && s.spielbar;
  const gewaehlt = spiele?.find((s) => `${s.id}@${s.version}` === wahl) ?? spiele?.find(startbar);
  // Nach Thema gruppiert, damit später mehrere Kontexte (Personal, Projektmanagement, …) übersichtlich bleiben
  const themen = [...new Set((spiele ?? []).map((s) => s.thema))].sort();

  async function anlegen() {
    if (!gewaehlt) return;
    setLaedt(true);
    try {
      const k = await api.kursAnlegen({ name, spielId: gewaehlt.id, spielVersion: gewaehlt.version, beginn: beginn || undefined, ende: ende || undefined });
      nav(`/kurse/${k.id}?bereich=gruppen`);
    } catch (e) {
      setFehler((e as Error).message);
      setLaedt(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader ort="Neuer Kurs" />
      <main className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6">
        <Seitentitel titel="Kurs anlegen" />
        <Abschnitt n={1} titel="Kursdaten">
          <Karte className="grid gap-4 p-5 md:grid-cols-3">
            <Feld id="name" label="Name"><Eingabe id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Bachelor Professional HR 2026/27" /></Feld>
            <Feld id="beginn" label="Start"><Eingabe id="beginn" type="date" value={beginn} onChange={(e) => setBeginn(e.target.value)} /></Feld>
            <Feld id="ende" label="Ende"><Eingabe id="ende" type="date" value={ende} onChange={(e) => setEnde(e.target.value)} /></Feld>
          </Karte>
        </Abschnitt>
        <Abschnitt n={2} titel="Planspiel" rechts={gewaehlt && <Chip ton="info">Version {gewaehlt.version} · fest für diesen Kurs</Chip>}>
          {!spiele ? <Laden /> : (
            <Karte className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
              <Feld id="spiel" label="Planspiel wählen">
                <Auswahl id="spiel" value={gewaehlt ? `${gewaehlt.id}@${gewaehlt.version}` : ""} onChange={(e) => setWahl(e.target.value)}>
                  {!gewaehlt && <option value="">Kein Planspiel verfügbar</option>}
                  {themen.map((t) => (
                    <optgroup key={t} label={t}>
                      {spiele.filter((s) => s.thema === t).map((s) => (
                        <option key={`${s.id}@${s.version}`} value={`${s.id}@${s.version}`} disabled={!startbar(s)}>
                          {s.name} · Version {s.version}{s.status !== "freigegeben" ? " (Entwurf)" : !s.spielbar ? " (nicht startbar)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Auswahl>
              </Feld>
              {gewaehlt && (
                <div className="flex flex-col gap-2 rounded-lg border border-grau-linie bg-white p-4">
                  <div className="flex items-center justify-between gap-2"><span className="text-lg font-extrabold">{gewaehlt.name}</span><Chip ton="gut">Freigegeben</Chip></div>
                  <div className="text-sm text-grau-text">{gewaehlt.thema}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-grau">
                    <span>{gewaehlt.runden} Runden</span><span>{gewaehlt.akteure} {gewaehlt.begriffAkteure}</span><span>Spiellogik: {gewaehlt.fabrik}</span>
                  </div>
                </div>
              )}
            </Karte>
          )}
        </Abschnitt>
        {fehler && <Hinweis ton="schlecht">{fehler}</Hinweis>}
        <div className="flex justify-end gap-3">
          <Button variante="sekundaer" onClick={() => nav("/")}>Abbrechen</Button>
          <Button onClick={anlegen} disabled={name.trim().length < 2 || !gewaehlt} laedt={laedt}>Kurs anlegen</Button>
        </div>
      </main>
    </div>
  );
}
