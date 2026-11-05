import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { AppHeader } from "@/components/spiel/Rahmen";
import { Button, Eingabe, Feld, Hinweis, Karte, Seitentitel } from "@/components/ui";
import { useSession } from "@/lib/session";

/** Eigenes Passwort ändern. Pflicht nach einem Einmalpasswort, sonst über das Schlüssel-Symbol in der Kopfzeile. */
export function PasswortAendern() {
  const { ich, anmelden } = useSession();
  const nav = useNavigate();
  const pflicht = !!ich?.passwortAendern;
  const [aktuell, setAktuell] = useState("");
  const [neu, setNeu] = useState("");
  const [wdh, setWdh] = useState("");
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fertig, setFertig] = useState(false);

  async function senden(e: FormEvent) {
    e.preventDefault(); setFehler("");
    if (neu !== wdh) { setFehler("Die beiden neuen Passwörter sind nicht gleich"); return; }
    setLaedt(true);
    try {
      const r = await api.passwortAendern(aktuell, neu);
      anmelden(r.token, r.benutzer);
      if (pflicht) nav("/", { replace: true }); else setFertig(true);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader ort={pflicht ? undefined : "Passwort ändern"} />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-10 sm:px-6">
        <Seitentitel titel={pflicht ? "Eigenes Passwort festlegen" : "Passwort ändern"} />
        {pflicht && <Hinweis>Deine Spielleitung hat dein Passwort zurückgesetzt. Lege jetzt ein eigenes Passwort fest, dann geht es weiter.</Hinweis>}
        {fertig ? (
          <Karte weiss className="flex flex-col gap-4 p-6">
            <Hinweis ton="gut">Dein Passwort ist geändert. Auf anderen Geräten musst du dich neu anmelden.</Hinweis>
            <Button onClick={() => nav("/")}>Zu meinen Kursen</Button>
          </Karte>
        ) : (
          <Karte weiss className="p-6">
            <form onSubmit={senden} className="flex flex-col gap-4">
              <Feld id="aktuell" label={pflicht ? "Einmalpasswort" : "Aktuelles Passwort"}>
                <Eingabe id="aktuell" type="password" value={aktuell} onChange={(e) => setAktuell(e.target.value)} required autoComplete="current-password" />
              </Feld>
              <Feld id="neu" label="Neues Passwort (mindestens 8 Zeichen)">
                <Eingabe id="neu" type="password" value={neu} onChange={(e) => setNeu(e.target.value)} required minLength={8} autoComplete="new-password" />
              </Feld>
              <Feld id="wdh" label="Neues Passwort wiederholen">
                <Eingabe id="wdh" type="password" value={wdh} onChange={(e) => setWdh(e.target.value)} required minLength={8} autoComplete="new-password" />
              </Feld>
              {fehler && <Hinweis ton="schlecht">{fehler}</Hinweis>}
              <div className="flex flex-wrap justify-end gap-3">
                {!pflicht && <Button type="button" variante="sekundaer" onClick={() => nav(-1)}>Abbrechen</Button>}
                <Button type="submit" laedt={laedt}>Passwort speichern</Button>
              </div>
            </form>
          </Karte>
        )}
      </main>
    </div>
  );
}
