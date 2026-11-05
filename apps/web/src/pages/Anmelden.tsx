import { useState, type FormEvent } from "react";
import { api } from "@/api/client";
import { AppHeader } from "@/components/spiel/Rahmen";
import { Button, Eingabe, Feld, Hinweis, Karte, Tabs } from "@/components/ui";
import { useSession } from "@/lib/session";

export function Anmelden() {
  const { anmelden } = useSession();
  const [modus, setModus] = useState<"login" | "neu">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);

  async function senden(e: FormEvent) {
    e.preventDefault();
    setLaedt(true); setFehler("");
    try {
      const r = modus === "login" ? await api.anmelden(email, pw) : await api.registrieren(email, name, pw);
      anmelden(r.token, r.benutzer);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:items-center">
        <div>
          <img src="/nordbyte.png" alt="" className="mb-6 h-14 w-auto" />
          <h1 className="text-4xl font-extrabold tracking-tight">Planspiel im Personalmanagement</h1>
          <p className="mt-3 text-lg text-grau-text">Übernehmt eine Abteilung, trefft Personalentscheidungen und seht Runde für Runde, was sie bewirken.</p>
        </div>
        <Karte weiss className="p-6">
          <Tabs wert={modus} setzen={setModus} reiter={[["login", "Anmelden"], ["neu", "Registrieren"]]} />
          <form onSubmit={senden} className="mt-5 flex flex-col gap-4">
            {modus === "neu" && <Feld id="name" label="Name"><Eingabe id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></Feld>}
            <Feld id="email" label="E-Mail"><Eingabe id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Feld>
            <Feld id="pw" label="Passwort"><Eingabe id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={modus === "neu" ? 8 : 1} autoComplete={modus === "neu" ? "new-password" : "current-password"} /></Feld>
            {fehler && <Hinweis ton="schlecht">{fehler}</Hinweis>}
            <Button type="submit" laedt={laedt}>{modus === "login" ? "Anmelden" : "Konto anlegen"}</Button>
            <p className="text-xs text-grau">Demo: helen@demo.de (Spielleitung) oder sara@demo.de (Teilnehmerin), Passwort jeweils „planspiel“.</p>
          </form>
        </Karte>
      </main>
    </div>
  );
}
