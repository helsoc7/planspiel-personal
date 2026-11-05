/** Grundbausteine im Foliendesign: dunkelblau, graue Karten, runde Plaketten. */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variante = "primaer" | "sekundaer" | "leise" | "gefahr";
export function Button({ variante = "primaer", klein, laedt, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; klein?: boolean; laedt?: boolean }) {
  return (
    <button
      {...p}
      disabled={p.disabled || laedt}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        klein ? "min-h-9 px-3 text-sm" : "min-h-11 px-5",
        variante === "primaer" && "bg-navy text-white hover:bg-navy-dunkel",
        variante === "sekundaer" && "border border-grau-rahmen bg-white text-tinte hover:bg-grau-flaeche",
        variante === "leise" && "text-grau-text hover:bg-grau-flaeche hover:text-tinte",
        variante === "gefahr" && "border border-schlecht/30 bg-white text-schlecht hover:bg-schlecht-flaeche",
        className,
      )}
    >
      {laedt && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}

export const Karte = ({ className, children, weiss }: { className?: string; children: ReactNode; weiss?: boolean }) => (
  <div className={cn("rounded-karte border border-grau-linie", weiss ? "bg-white" : "bg-grau-flaeche", className)}>{children}</div>
);

export const Label = ({ htmlFor, children }: { htmlFor: string; children: ReactNode }) => (
  <label htmlFor={htmlFor} className="text-sm font-bold text-grau-text">{children}</label>
);

const feld = "min-h-11 w-full rounded-lg border border-grau-rahmen bg-white px-3 text-tinte placeholder:text-grau";
export const Eingabe = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(feld, className)} />;
export const Auswahl = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(feld, "pr-8", className)}>{children}</select>;
export const Textfeld = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn(feld, "py-3 leading-relaxed", className)} />;

export function Feld({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export type Ton = "neutral" | "info" | "gut" | "warn" | "schlecht" | "navy";
const TON: Record<Ton, string> = {
  neutral: "bg-[#E6E6E6] text-[#3A3A44]",
  info: "bg-hell text-navy-dunkel",
  gut: "bg-gut-flaeche text-gut-text",
  warn: "bg-warn-flaeche text-warn-text",
  schlecht: "bg-schlecht-flaeche text-schlecht-text",
  navy: "bg-navy text-white",
};
const PUNKT: Partial<Record<Ton, string>> = { gut: "bg-gut", warn: "bg-[#CA8A04]", schlecht: "bg-schlecht", info: "bg-navy" };
export function Chip({ ton = "neutral", punkt, children, className }: { ton?: Ton; punkt?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold", TON[ton], className)}>
      {punkt && <span className={cn("h-2 w-2 rounded-full", PUNKT[ton] ?? "bg-grau")} />}
      {children}
    </span>
  );
}

/** Kosten-Plakette wie "3 T€" oder "2 FZ". */
export const Kosten = ({ children }: { children: ReactNode }) => (
  <span className="whitespace-nowrap rounded-full border border-grau-linie bg-grau-flaeche px-2 py-0.5 text-xs font-bold text-grau-text">{children}</span>
);

export function Nummer({ n, aus, klein }: { n: ReactNode; aus?: boolean; klein?: boolean }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-extrabold", klein ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm",
      aus ? "border border-grau-linie bg-white text-grau" : "bg-navy text-white")}>{n}</span>
  );
}

/** Überschrift mit Nummer wie in den Folien. */
export function Abschnitt({ n, titel, rechts, children, className }: { n?: number; titel: string; rechts?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2.5">
        {n !== undefined && <Nummer n={n} />}
        <h2 className="text-xl font-extrabold">{titel}</h2>
        {rechts && <div className="ml-auto">{rechts}</div>}
      </div>
      {children}
    </section>
  );
}

export const Seitentitel = ({ titel, unter, rechts }: { titel: string; unter?: ReactNode; rechts?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      {unter && <div className="text-sm font-semibold text-grau">{unter}</div>}
      <h1 className="text-3xl font-extrabold tracking-tight">{titel}</h1>
    </div>
    {rechts}
  </div>
);

export function Hinweis({ ton = "info", children }: { ton?: "info" | "gut" | "schlecht" | "warn"; children: ReactNode }) {
  return <div className={cn("rounded-lg px-4 py-3 text-sm font-semibold", TON[ton])}>{children}</div>;
}

export function Leer({ titel, text, children }: { titel: string; text?: string; children?: ReactNode }) {
  return (
    <Karte className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-lg font-extrabold">{titel}</div>
      {text && <p className="max-w-md text-sm text-grau">{text}</p>}
      {children}
    </Karte>
  );
}

export const Laden = () => <div className="flex justify-center py-24 text-grau"><Loader2 className="h-6 w-6 animate-spin" /></div>;

export function Tabs<T extends string>({ wert, setzen, reiter }: { wert: T; setzen: (t: T) => void; reiter: [T, string][] }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-grau-linie">
      {reiter.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={wert === k} onClick={() => setzen(k)}
          className={cn("-mb-px min-h-11 border-b-2 px-4 text-sm", wert === k ? "border-navy font-extrabold text-tinte" : "border-transparent text-grau hover:text-tinte")}>
          {l}
        </button>
      ))}
    </div>
  );
}
