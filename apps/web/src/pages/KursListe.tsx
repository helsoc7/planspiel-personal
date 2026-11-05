import { useState, type FormEvent } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useDaten } from "@/api/hooks";
import { AppHeader } from "@/components/spiel/Rahmen";
import { Button, Chip, Eingabe, Hinweis, Karte, Laden, Leer, Seitentitel } from "@/components/ui";

export function KursListe() {
  const nav = useNavigate();
  const { daten: kurse } = useDaten(() => api.kurse(), [], 0);
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState("");

  async function beitreten(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api.beitreten(code);
      nav(`/kurse/${r.id}`);
    } catch (err) {
      setFehler((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <Seitentitel titel="Meine Kurse" rechts={<Link to="/kurse/neu"><Button variante="sekundaer"><Plus />Kurs anlegen</Button></Link>} />
        {!kurse ? <Laden /> : kurse.length === 0 ? (
          <Leer titel="Noch kein Kurs" text="Tritt mit dem Code deiner Spielleitung bei oder lege selbst einen Kurs an." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {kurse.map((k) => (
              <Link key={k.id} to={`/kurse/${k.id}`}>
                <Karte className="flex items-center gap-4 p-5 transition-colors hover:border-navy">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-extrabold">{k.name}</span><Chip ton={k.rolle === "leitung" ? "navy" : "info"}>{k.rolle === "leitung" ? "Spielleitung" : "Teilnehmer:in"}</Chip></div>
                    <div className="mt-1 text-sm text-grau">{k.spielName} · {k.aktuelleRunde >= 0 ? `Runde ${k.aktuelleRunde} von ${k.rundenGesamt - 1}` : "noch nicht gestartet"}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-grau" />
                </Karte>
              </Link>
            ))}
          </div>
        )}
        <Karte className="p-5">
          <form onSubmit={beitreten} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label htmlFor="code" className="text-sm font-bold text-grau-text">Kurs beitreten</label>
              <Eingabe id="code" placeholder="Kurscode, z. B. NB2026" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <Button type="submit" disabled={code.length < 4}>Beitreten</Button>
          </form>
          {fehler && <div className="mt-3"><Hinweis ton="schlecht">{fehler}</Hinweis></div>}
        </Karte>
      </main>
    </div>
  );
}
