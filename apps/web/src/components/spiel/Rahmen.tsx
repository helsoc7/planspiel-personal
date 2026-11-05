/** Kopfzeile und Seitenleiste. */
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/cn";
import { Chip } from "../ui";

export function AppHeader({ ort, rolle }: { ort?: string; rolle?: string }) {
  const { ich, abmelden } = useSession();
  const nav = useNavigate();
  const kuerzel = (ich?.name ?? "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="sticky top-0 z-30 bg-navy text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3.5 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3.5">
          <img src="/cloudhelden-weiss.png" alt="CloudHelden" className="h-7 w-auto" />
          <span className="h-6 w-px bg-[#4A74AE]" />
          <span className="text-base font-extrabold">Planspiel</span>
        </Link>
        {ort && <span className="hidden truncate text-hell sm:inline">{ort}</span>}
        <div className="ml-auto flex items-center gap-2">
          {rolle && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-navy">{rolle}</span>}
          {ich && (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-hell text-xs font-extrabold text-navy">{kuerzel}</span>
              <span className="hidden text-sm md:inline">{ich.name}</span>
              <button onClick={() => { abmelden(); nav("/", { replace: true }); }} aria-label="Abmelden" className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-dunkel">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export type NavPunkt = { id: string; label: string; icon: ReactNode; badge?: number };

export function Seitenleiste({ oben, nav, aktiv, waehlen }: { oben: ReactNode; nav: NavPunkt[]; aktiv: string; waehlen: (id: string) => void }) {
  return (
    <aside className="flex flex-col gap-4">
      {oben}
      <nav aria-label="Kursbereiche" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {nav.map((n) => (
          <button key={n.id} onClick={() => waehlen(n.id)} aria-current={aktiv === n.id ? "page" : undefined}
            className={cn("flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
              aktiv === n.id ? "bg-navy font-bold text-white" : "text-grau-text hover:bg-grau-flaeche")}>
            {n.icon}<span className="flex-1 text-left">{n.label}</span>
            {!!n.badge && <Chip ton="warn">{n.badge}</Chip>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function GruppenKarte({ name, akteur, farbe, team }: { name: string; akteur: string; farbe: string; team?: { name: string; ich: boolean }[] }) {
  return (
    <div className="rounded-lg border border-grau-linie bg-white px-3 py-2.5">
      <div className="text-xs font-bold text-grau">Dein Team</div>
      <div className="mt-1 flex items-center gap-2.5">
        <span className="h-8 w-1 rounded" style={{ background: farbe }} />
        <div className="min-w-0"><div className="font-extrabold">{name}</div><div className="truncate text-xs text-grau">{akteur}</div></div>
      </div>
      {team && team.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5 border-t border-grau-flaeche pt-2.5" aria-label="Mitglieder">
          {team.map((m) => (
            <li key={m.name} className={cn("flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs", m.ich ? "bg-hell font-bold text-navy" : "bg-grau-flaeche text-grau-text")}>
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold", m.ich ? "bg-navy text-white" : "bg-white text-grau-text")}>{m.name.slice(0, 1).toUpperCase()}</span>
              {m.ich ? `${m.name} (du)` : m.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RundenStand({ runde, gesamt, titel, status, chips }: { runde: number; gesamt: number; titel: string; status: (nr: number) => "fertig" | "aktiv" | "offen"; chips?: ReactNode }) {
  return (
    <div className="rounded-lg bg-grau-flaeche p-3">
      <div className="text-xs text-grau">{runde >= 0 ? `Runde ${runde} von ${gesamt - 1}` : "Spielstand"}</div>
      <div className="mt-0.5 font-extrabold leading-snug">{titel}</div>
      {chips && <div className="mt-2 flex flex-wrap gap-1.5">{chips}</div>}
      <div className="mt-3 flex gap-0.5" aria-hidden>
        {Array.from({ length: gesamt }, (_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", status(i) === "fertig" ? "bg-gut" : status(i) === "aktiv" ? "bg-navy" : "bg-grau-linie")} />
        ))}
      </div>
    </div>
  );
}
