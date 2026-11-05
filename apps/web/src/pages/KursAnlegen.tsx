import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useDaten } from "@/api/hooks";
import { AppHeader } from "@/components/spiel/Rahmen";
import { PaketKarte } from "@/components/spiel/Auswertung";
import { Abschnitt, Button, Chip, Eingabe, Feld, Hinweis, Karte, Laden, Seitentitel } from "@/components/ui";

export function KursAnlegen() {
  const nav = useNavigate();
  const { daten: spiele } = useDaten(() => api.spiele(), [], 0);
  const [name, setName] = useState("");
  const [beginn, setBeginn] = useState("");
  const [ende, setEnde] = useState("");
  const [wahl, setWahl] = useState<string>("");
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const gewaehlt = spiele?.find((s) => `${s.id}@${s.version}` === wahl) ?? spiele?.find((s) => s.status === "freigegeben");

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
        <Abschnitt n={2} titel="Spielpaket" rechts={gewaehlt && <Chip ton="info">Version {gewaehlt.version} · fest für diesen Kurs</Chip>}>
          {!spiele ? <Laden /> : (
            <div className="grid gap-3 md:grid-cols-3">
              {spiele.map((s) => (
                <PaketKarte key={`${s.id}@${s.version}`} titel={s.name} thema={s.thema} status={s.status === "freigegeben" ? "Freigegeben" : "Entwurf"}
                  runden={`${s.runden} Runden`} akteure={`${s.akteure} ${s.begriffAkteure}`} freigegeben={s.status === "freigegeben"}
                  gewaehlt={gewaehlt === s} waehlen={() => setWahl(`${s.id}@${s.version}`)} />
              ))}
            </div>
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
