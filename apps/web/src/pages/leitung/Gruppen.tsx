import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { Abschnitt, Auswahl, Button, Chip, Eingabe, Feld, Hinweis, Karte, Seitentitel } from "@/components/ui";
import { KursCodes } from "@/components/spiel/KursCodes";
import { EinmalpasswortAnzeige, ZuruecksetzenKnopf, type Einmalpasswort } from "@/components/spiel/PasswortZuruecksetzen";
import { useSession } from "@/lib/session";
import { useKurs } from "../kontext";

export function Gruppen() {
  const { id, daten: d, spiel, neu } = useKurs();
  const { ich } = useSession();
  const leitungen = d.mitglieder.filter((m) => m.rolle === "leitung");
  const [einmal, setEinmal] = useState<Einmalpasswort | null>(null);
  const [resetFehler, setResetFehler] = useState("");
  const zuruecksetzen = (m: { benutzerId: string; name: string }) => (
    <ZuruecksetzenKnopf kursId={id} benutzerId={m.benutzerId} name={m.name}
      ergebnis={(e) => { if ("fehler" in e) { setResetFehler(e.fehler); setEinmal(null); } else { setEinmal(e); setResetFehler(""); window.scrollTo({ top: 0, behavior: "smooth" }); } }} />
  );
  const [name, setName] = useState("");
  const [akteur, setAkteur] = useState(spiel.akteure[0]?.id ?? "");
  const [fehler, setFehler] = useState("");
  const tn = d.mitglieder.filter((m) => m.rolle === "teilnehmer");
  const ohne = tn.filter((m) => !m.gruppeId);

  async function anlegen(e: FormEvent) {
    e.preventDefault(); setFehler("");
    try { await api.gruppeAnlegen(id, name, akteur); setName(""); await neu(); } catch (err) { setFehler((err as Error).message); }
  }
  const zuordnen = async (uid: string, gid: string) => { await api.zuordnen(id, uid, gid || null); await neu(); };

  return (
    <div className="flex flex-col gap-7">
      <Seitentitel titel="Gruppen" />
      {einmal && <EinmalpasswortAnzeige wert={einmal} schliessen={() => setEinmal(null)} />}
      {resetFehler && <Hinweis ton="schlecht">{resetFehler}</Hinweis>}
      <Abschnitt titel="Zugang zum Kurs" rechts={
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-grau">Spielleitung:
          {leitungen.map((m) => <span key={m.benutzerId} className="inline-flex items-center">{m.name}{ich?.istAdmin && m.benutzerId !== ich.id && zuruecksetzen(m)}</span>)}
        </span>}>
        <KursCodes kursId={id} teilnehmer={d.kurs.codeTeilnehmer} leitung={d.kurs.codeLeitung} istAdmin={!!ich?.istAdmin} neu={neu} />
      </Abschnitt>
      <Abschnitt n={1} titel="Gruppe anlegen">
        <Karte className="p-5">
          <form onSubmit={anlegen} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Feld id="gname" label="Name"><Eingabe id="gname" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Team Atlas" /></Feld>
            <Feld id="gakteur" label={spiel.begriffe.akteur}><Auswahl id="gakteur" value={akteur} onChange={(e) => setAkteur(e.target.value)}>{spiel.akteure.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Auswahl></Feld>
            <Button type="submit" disabled={!name.trim()}><Plus />Anlegen</Button>
          </form>
          {fehler && <div className="mt-3"><Hinweis ton="schlecht">{fehler}</Hinweis></div>}
        </Karte>
      </Abschnitt>
      <Abschnitt n={2} titel="Teilnehmende zuordnen" rechts={ohne.length > 0 && <Chip ton="warn">{ohne.length} ohne Gruppe</Chip>}>
        <div className="grid gap-3 md:grid-cols-2">
          {d.gruppen.map((g) => {
            const a = spiel.akteure.find((x) => x.id === g.akteur)!;
            const leute = tn.filter((m) => m.gruppeId === g.id);
            return (
              <Karte key={g.id} className="p-4">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-1 rounded" style={{ background: a.farbe }} />
                  <div className="flex-1"><div className="font-extrabold">{g.name}</div><div className="text-xs text-grau">{a.name}</div></div>
                  <Button klein variante="leise" aria-label={`${g.name} löschen`} onClick={async () => { if (confirm(`${g.name} löschen?`)) { await api.gruppeLoeschen(id, g.id); await neu(); } }}><Trash2 /></Button>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {leute.length === 0 && <li className="text-sm text-grau">Noch niemand</li>}
                  {leute.map((m) => (
                    <li key={m.benutzerId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm">
                      <span className="flex-1">{m.name}</span>
                      {zuruecksetzen(m)}
                      <button className="text-xs font-bold text-grau hover:text-schlecht" onClick={() => zuordnen(m.benutzerId, "")}>entfernen</button>
                    </li>
                  ))}
                </ul>
              </Karte>
            );
          })}
        </div>
        {ohne.length > 0 && (
          <Karte weiss className="p-4">
            <div className="mb-2 font-extrabold">Ohne Gruppe</div>
            <ul className="flex flex-col gap-2">
              {ohne.map((m) => (
                <li key={m.benutzerId} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-40 flex-1 text-sm"><span className="font-bold">{m.name}</span> <span className="text-grau">{m.email}</span></span>
                  {zuruecksetzen(m)}
                  <Auswahl aria-label={`Gruppe für ${m.name}`} className="w-56" value="" onChange={(e) => zuordnen(m.benutzerId, e.target.value)}>
                    <option value="">Gruppe wählen</option>
                    {d.gruppen.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Auswahl>
                </li>
              ))}
            </ul>
          </Karte>
        )}
      </Abschnitt>
    </div>
  );
}
