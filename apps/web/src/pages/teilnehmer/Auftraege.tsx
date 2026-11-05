import { ABGABE_STATUS_LABEL } from "@planspiel/core";
import { Chip, Karte, Leer, Seitentitel } from "@/components/ui";
import { useKurs } from "../kontext";

export function Auftraege() {
  const { daten: d, spiel } = useKurs();
  const g = d.gruppen.find((x) => x.id === d.ich.gruppeId);
  const runden = d.runden.filter((r) => r.status !== "gesperrt").map((r) => r.nr).sort((a, b) => b - a);
  if (!g || !runden.length) return <Leer titel="Noch keine Aufträge" text="Hier sammeln sich eure Runden, sobald das Spiel läuft." />;
  return (
    <div className="flex flex-col gap-5">
      <Seitentitel titel="Bisherige Aufträge" />
      {runden.map((nr) => {
        const rd = spiel.runden[nr];
        const a = d.abgaben.find((x) => x.gruppeId === g.id && x.runde === nr);
        const b = d.bewertungen.find((x) => x.gruppeId === g.id && x.runde === nr);
        const o = rd.optionen.find((x) => x.key === a?.entscheidung.option);
        const w = spiel.zufall.find((z) => z.wurf === b?.wurf);
        return (
          <Karte key={nr} className="p-5">
            <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-grau">Runde {nr}</span><h2 className="text-lg font-extrabold">{rd.titel}</h2>
              {a && <Chip ton={a.status === "entwurf" ? "warn" : "gut"}>{ABGABE_STATUS_LABEL[a.status]}</Chip>}
              {b && <Chip ton="navy">{b.punkte} von {rd.maxPunkte} Punkten</Chip>}</div>
            <p className="mt-2 text-sm text-grau-text"><span className="font-bold">Auftrag: </span>{rd.auftrag}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white p-3 text-sm">
                <div className="font-bold">Eure Entscheidung</div>
                <div className="mt-1">{o ? `${o.key} · ${o.label}` : rd.optionen.length ? "Keine" : "Analyse-Runde"}</div>
                {!!a?.entscheidung.zusatz.length && <div className="mt-1 text-grau">+ {a.entscheidung.zusatz.map((k) => spiel.zusatz.find((z) => z.key === k)?.label).join(", ")}</div>}
              </div>
              <div className="rounded-lg bg-white p-3 text-sm">
                <div className="font-bold">Auswertung</div>
                {b ? <>
                  <div className="mt-1">{w ? `Würfel ${w.wurf}: ${w.label}` : "Kein Würfel"}</div>
                  {b.kommentar && <div className="mt-1 text-grau-text">„{b.kommentar}“</div>}
                </> : <div className="mt-1 text-grau">Noch nicht ausgewertet</div>}
              </div>
            </div>
            {a?.begruendung && <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold text-navy">Eure Begründung</summary><p className="mt-2 whitespace-pre-line">{a.begruendung}</p></details>}
          </Karte>
        );
      })}
    </div>
  );
}
