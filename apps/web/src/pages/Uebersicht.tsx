import { useEffect, useState } from "react";
import { KennzahlErklaerungen, UrsachenTabelle, Vergleichstabelle, VerlaufChart, ZielLeiste } from "@/components/spiel/Auswertung";
import { Auswahl, Karte, Leer, Seitentitel, Tabs } from "@/components/ui";
import { useKurs } from "./kontext";

export function Uebersicht() {
  const { daten: d, spiel, erg, vorschau, setVorschau } = useKurs();
  const leitung = d.ich.rolle === "leitung";
  const [tab, setTab] = useState<"ursachen" | "verlauf" | "kennzahlen">("ursachen");
  const [gSel, setGSel] = useState(d.ich.gruppeId ?? d.gruppen[0]?.id ?? "");
  const [rSel, setRSel] = useState(erg.bisRunde);
  useEffect(() => setRSel(erg.bisRunde), [erg.bisRunde]);
  if (!d.gruppen.length) return <Leer titel="Noch keine Gruppen" text="Sobald es Gruppen gibt, seht ihr hier den Vergleich." />;
  const v = erg.gruppen.find((x) => x.gruppeId === gSel);

  return (
    <div className="flex flex-col gap-6">
      <Seitentitel titel="Übersicht" unter={erg.bisRunde < 0 ? "Stand zu Spielbeginn" : `Stand nach Runde ${erg.bisRunde}: ${spiel.runden[erg.bisRunde].titel}`}
        rechts={leitung && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-grau-linie px-3 text-sm">
            <input type="checkbox" checked={vorschau} onChange={(e) => setVorschau(e.target.checked)} className="h-4 w-4 accent-navy" />Laufende Runde einrechnen
          </label>
        )} />
      <ZielLeiste ziel={erg.ziel} text="Gemeinsames Ziel" />
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Vergleich</h2>
        <Karte weiss className="overflow-hidden">
          <Vergleichstabelle paket={spiel} gruppen={d.gruppen} erg={erg} meineGruppe={d.ich.gruppeId} auswahl={gSel} waehlen={(g) => { setGSel(g); setTab("ursachen"); }} />
        </Karte>
      </section>
      <Karte weiss>
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
          <Tabs wert={tab} setzen={setTab} reiter={[["ursachen", "Was hat sich verändert?"], ["verlauf", "Verlauf"], ["kennzahlen", "Kennzahlen erklärt"]]} />
          {tab === "ursachen" && erg.bisRunde >= 0 && (
            <div className="flex gap-2 pb-2">
              <Auswahl aria-label="Gruppe" value={gSel} onChange={(e) => setGSel(e.target.value)} className="w-44">{d.gruppen.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Auswahl>
              <Auswahl aria-label="Runde" value={rSel} onChange={(e) => setRSel(+e.target.value)} className="w-32">{Array.from({ length: erg.bisRunde + 1 }, (_, i) => <option key={i} value={i}>Runde {i}</option>)}</Auswahl>
            </div>
          )}
        </div>
        <div className="p-5">
          {tab === "ursachen" && (erg.bisRunde < 0 || !v ? <p className="text-sm text-grau">Noch keine Runde ausgewertet.</p> : <UrsachenTabelle paket={spiel} ergebnis={v.verlauf[Math.min(rSel, erg.bisRunde)]} />)}
          {tab === "verlauf" && <VerlaufChart paket={spiel} gruppen={d.gruppen} erg={erg} />}
          {tab === "kennzahlen" && <KennzahlErklaerungen paket={spiel} />}
        </div>
      </Karte>
    </div>
  );
}
