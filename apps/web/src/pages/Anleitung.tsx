import { BookOpen, ListChecks, PenLine, Send } from "lucide-react";
import { KennzahlErklaerungen } from "@/components/spiel/Auswertung";
import { Abschnitt, Karte, Nummer, Seitentitel } from "@/components/ui";
import { ressource } from "@/lib/kennzahl";
import { useKurs } from "./kontext";

const ABLAUF = [
  [BookOpen, "Lage verstehen", "Ereignis, Lage in eurer Abteilung und Auftrag lesen."],
  [ListChecks, "Entscheiden", "Eine Hauptentscheidung und beliebig viele Zusatzmaßnahmen, solange die Ressourcen reichen."],
  [PenLine, "Begründen", "Kurz und mit Fachbegriffen. Dafür gibt es Begründungspunkte."],
  [Send, "Abgeben", "Danach würfelt die Spielleitung und wertet aus."],
] as const;

export function Anleitung() {
  const { spiel } = useKurs();
  return (
    <div className="flex flex-col gap-8">
      <Seitentitel titel="Anleitung" unter={`${spiel.name} · ${spiel.thema}`} />
      <Abschnitt n={1} titel="So läuft eine Runde">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ABLAUF.map(([Icon, t, x], i) => (
            <Karte key={t} className="p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white"><Icon className="h-5 w-5" /></span>
              <div className="mt-3 font-extrabold">{i + 1}. {t}</div>
              <p className="mt-1 text-sm text-grau-text">{x}</p>
            </Karte>
          ))}
        </div>
      </Abschnitt>
      <Abschnitt n={2} titel="Ziel">
        <Karte className="p-5"><p>{spiel.ziel.text}</p></Karte>
      </Abschnitt>
      <Abschnitt n={3} titel="Kennzahlen und Ressourcen"><KennzahlErklaerungen paket={spiel} /></Abschnitt>
      <Abschnitt n={4} titel="Zusatzmaßnahmen">
        <Karte weiss className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="bg-blau text-left text-white"><th className="px-3 py-2.5">Maßnahme</th>{spiel.ressourcen.map((r) => <th key={r.id} className="px-3 py-2.5">{r.name}</th>)}</tr></thead>
            <tbody>{spiel.zusatz.map((z) => (
              <tr key={z.key} className="border-b border-grau-flaeche"><td className="px-3 py-2.5"><span className="font-bold">{z.key}</span> · {z.label}{z.partner && <span className="text-grau"> (nur mit Partnerabteilung)</span>}</td>
                {spiel.ressourcen.map((r) => <td key={r.id} className="px-3 py-2.5">{ressource(r, z.kosten[r.id] ?? 0)}</td>)}</tr>
            ))}</tbody>
          </table>
        </Karte>
      </Abschnitt>
      <Abschnitt n={5} titel="Zufallskarten">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {spiel.zufall.map((z) => (
            <Karte key={z.wurf} className="flex gap-3 p-4"><Nummer n={z.wurf} /><div><div className="font-extrabold">{z.label}</div><p className="text-sm text-grau-text">{z.text}</p></div></Karte>
          ))}
        </div>
      </Abschnitt>
    </div>
  );
}
