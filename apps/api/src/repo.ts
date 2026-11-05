/**
 * Datenzugriff. Nur hier steht SQL. Services und Routen kennen die Datenbank nicht.
 */
import type { AbgabeDto, AbgabeStatus, BewertungDto, Entscheidung, GruppeDto, MitgliedDto, Rolle, RundeDto, RundenStatus, Spielpaket } from "@planspiel/core";
import { q, tx } from "./db/pool";

export interface KursRow {
  id: string; name: string; code_teilnehmer: string | null; code_leitung: string | null; spiel_id: string; spiel_version: number; beginn: string | null; ende: string | null; erstellt_von: string;
}

type BenutzerRow = { id: string; email: string; name: string; istAdmin: boolean; passwortAendern: boolean };
const BENUTZER_SEL = `id, email, name, ist_admin as "istAdmin", passwort_aendern as "passwortAendern"`;

export const benutzer = {
  async anlegen(email: string, name: string, passwortHash: string, istAdmin = false) {
    const [b] = await q<BenutzerRow>(
      `insert into benutzer(email,name,passwort_hash,ist_admin) values (lower($1),$2,$3,$4) returning ${BENUTZER_SEL}`, [email, name, passwortHash, istAdmin]);
    return b;
  },
  /** Neues Konto und Kursmitgliedschaft in einem Schritt (Registrierung mit Code). */
  async anlegenMitKurs(email: string, name: string, passwortHash: string, kursId: string, rolle: Rolle) {
    return tx(async (c) => {
      const { rows: [b] } = await c.query<BenutzerRow>(
        `insert into benutzer(email,name,passwort_hash) values (lower($1),$2,$3) returning ${BENUTZER_SEL}`, [email, name, passwortHash]);
      await c.query("insert into kurs_mitglieder(kurs_id,benutzer_id,rolle) values ($1,$2,$3)", [kursId, b.id, rolle]);
      return b;
    });
  },
  /** Neues Passwort setzen. einmalig: muss bei der nächsten Anmeldung geändert werden. Alte Sitzungen werden ungültig. */
  async passwortSetzen(id: string, passwortHash: string, einmalig: boolean) {
    await q("update benutzer set passwort_hash=$2, passwort_aendern=$3, passwort_version=passwort_version+1 where id=$1", [id, passwortHash, einmalig]);
  },
  /** Für die Prüfung der Sitzung: Passwortversion und ob ein Einmalpasswort aktiv ist. */
  async sitzung(id: string) {
    const [r] = await q<{ version: number; aendern: boolean }>(
      "select passwort_version as version, passwort_aendern as aendern from benutzer where id=$1", [id]);
    return r;
  },
  async mitHash(id: string) {
    const [b] = await q<BenutzerRow & { passwort_hash: string }>(`select ${BENUTZER_SEL}, passwort_hash from benutzer where id=$1`, [id]);
    return b;
  },
  async adminSetzen(id: string) {
    await q("update benutzer set ist_admin=true where id=$1", [id]);
  },
  async perEmail(email: string) {
    const [b] = await q<BenutzerRow & { passwort_hash: string }>(`select ${BENUTZER_SEL}, passwort_hash from benutzer where email=lower($1)`, [email]);
    return b;
  },
  async perId(id: string) {
    const [b] = await q<BenutzerRow>(`select ${BENUTZER_SEL} from benutzer where id=$1`, [id]);
    return b;
  },
};

export const spielpakete = {
  async liste() {
    return q<{ id: string; version: number; name: string; status: string; inhalt: Spielpaket }>(
      "select id,version,name,status,inhalt from spielpakete order by name, version desc");
  },
  async speichern(p: Spielpaket, status = "freigegeben") {
    await q(`insert into spielpakete(id,version,name,status,inhalt) values ($1,$2,$3,$4,$5)
             on conflict (id,version) do update set name=excluded.name, inhalt=excluded.inhalt, status=excluded.status`,
      [p.id, p.version, p.name, status, JSON.stringify(p)]);
  },
};

export const kurse = {
  async anlegen(k: { name: string; codeTeilnehmer: string; codeLeitung: string; spielId: string; spielVersion: number; beginn?: string; ende?: string; von: string; runden: number }) {
    return tx(async (c) => {
      const { rows: [kurs] } = await c.query<KursRow>(
        `insert into kurse(name,code_teilnehmer,code_leitung,spiel_id,spiel_version,beginn,ende,erstellt_von) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [k.name, k.codeTeilnehmer, k.codeLeitung, k.spielId, k.spielVersion, k.beginn || null, k.ende || null, k.von]);
      await c.query("insert into kurs_mitglieder(kurs_id,benutzer_id,rolle) values ($1,$2,'leitung')", [kurs.id, k.von]);
      await c.query("insert into runden(kurs_id,nr) select $1, g from generate_series(0,$2-1) g", [kurs.id, k.runden]);
      return kurs;
    });
  },
  async perId(id: string) {
    const [k] = await q<KursRow>("select * from kurse where id=$1", [id]);
    return k;
  },
  /** Sucht den Kurs zu einem Code. Die Art des Codes bestimmt die Rolle. */
  async perCode(code: string): Promise<{ kurs: KursRow; rolle: Rolle } | undefined> {
    const [k] = await q<KursRow & { _rolle: Rolle }>(
      `select *, case when upper(code_leitung)=upper($1) then 'leitung' else 'teilnehmer' end as _rolle
       from kurse where upper(code_teilnehmer)=upper($1) or upper(code_leitung)=upper($1)`, [code]);
    if (!k) return undefined;
    const { _rolle, ...kurs } = k;
    return { kurs, rolle: _rolle };
  },
  async codeVergeben(code: string) {
    const r = await q("select 1 from kurse where upper(code_teilnehmer)=upper($1) or upper(code_leitung)=upper($1)", [code]);
    return r.length > 0;
  },
  async codeSetzen(id: string, art: Rolle, code: string | null) {
    await q(`update kurse set ${art === "leitung" ? "code_leitung" : "code_teilnehmer"}=$2 where id=$1`, [id, code]);
  },
  async vonBenutzer(benutzerId: string) {
    return q<KursRow & { rolle: Rolle; spiel_name: string; aktuelle_runde: number; runden_gesamt: number }>(
      `select k.*, m.rolle, p.name as spiel_name,
              coalesce((select max(nr) from runden r where r.kurs_id=k.id and r.status<>'gesperrt'), -1) as aktuelle_runde,
              (select count(*)::int from runden r where r.kurs_id=k.id) as runden_gesamt
       from kurse k join kurs_mitglieder m on m.kurs_id=k.id
       join spielpakete p on p.id=k.spiel_id and p.version=k.spiel_version
       where m.benutzer_id=$1 order by k.erstellt desc`, [benutzerId]);
  },
};

export const mitglieder = {
  async von(kursId: string, benutzerId: string) {
    const [m] = await q<{ rolle: Rolle; gruppe_id: string | null }>("select rolle, gruppe_id from kurs_mitglieder where kurs_id=$1 and benutzer_id=$2", [kursId, benutzerId]);
    return m;
  },
  /** Beitritt mit Rolle. Ein Spielleiter-Code hebt Teilnehmende zur Spielleitung an, nie umgekehrt. */
  async beitreten(kursId: string, benutzerId: string, rolle: Rolle = "teilnehmer") {
    await q(`insert into kurs_mitglieder(kurs_id,benutzer_id,rolle) values ($1,$2,$3)
             on conflict (kurs_id,benutzer_id) do update set rolle='leitung', gruppe_id=null
             where excluded.rolle='leitung' and kurs_mitglieder.rolle='teilnehmer'`, [kursId, benutzerId, rolle]);
  },
  async liste(kursId: string): Promise<MitgliedDto[]> {
    return q<MitgliedDto>(`select m.benutzer_id as "benutzerId", b.name, b.email, m.rolle, m.gruppe_id as "gruppeId"
      from kurs_mitglieder m join benutzer b on b.id=m.benutzer_id where m.kurs_id=$1 order by m.rolle, b.name`, [kursId]);
  },
  async gruppeSetzen(kursId: string, benutzerId: string, gruppeId: string | null) {
    const r = await q("update kurs_mitglieder set gruppe_id=$3 where kurs_id=$1 and benutzer_id=$2 and rolle='teilnehmer' returning 1", [kursId, benutzerId, gruppeId]);
    return r.length > 0;
  },
};

export const gruppen = {
  async liste(kursId: string): Promise<GruppeDto[]> {
    return q<GruppeDto>("select id,name,akteur from gruppen where kurs_id=$1 order by name", [kursId]);
  },
  async anlegen(kursId: string, name: string, akteur: string): Promise<GruppeDto> {
    const [g] = await q<GruppeDto>("insert into gruppen(kurs_id,name,akteur) values ($1,$2,$3) returning id,name,akteur", [kursId, name, akteur]);
    return g;
  },
  async loeschen(kursId: string, id: string) {
    await q("delete from gruppen where kurs_id=$1 and id=$2", [kursId, id]);
  },
};

export const runden = {
  async liste(kursId: string): Promise<RundeDto[]> {
    return q<RundeDto>("select nr,status from runden where kurs_id=$1 order by nr", [kursId]);
  },
  async setzen(kursId: string, nr: number, status: RundenStatus) {
    await q("update runden set status=$3 where kurs_id=$1 and nr=$2", [kursId, nr, status]);
  },
};

const ABGABE_SEL = `select id, gruppe_id as "gruppeId", runde, entscheidung, begruendung, status, aktualisiert from abgaben`;
export const abgaben = {
  async liste(kursId: string, gruppeId?: string): Promise<AbgabeDto[]> {
    return gruppeId
      ? q<AbgabeDto>(`${ABGABE_SEL} where kurs_id=$1 and gruppe_id=$2 order by runde`, [kursId, gruppeId])
      : q<AbgabeDto>(`${ABGABE_SEL} where kurs_id=$1 order by runde`, [kursId]);
  },
  async perId(kursId: string, id: string) {
    const [a] = await q<AbgabeDto>(`${ABGABE_SEL} where kurs_id=$1 and id=$2`, [kursId, id]);
    return a;
  },
  async von(gruppeId: string, runde: number) {
    const [a] = await q<AbgabeDto>(`${ABGABE_SEL} where gruppe_id=$1 and runde=$2`, [gruppeId, runde]);
    return a;
  },
  async speichern(kursId: string, gruppeId: string, runde: number, e: Entscheidung, begruendung: string, status: AbgabeStatus, von: string) {
    const [a] = await q<AbgabeDto>(`insert into abgaben(kurs_id,gruppe_id,runde,entscheidung,begruendung,status,aktualisiert_von)
      values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (gruppe_id,runde) do update set entscheidung=excluded.entscheidung, begruendung=excluded.begruendung,
        status=excluded.status, aktualisiert=now(), aktualisiert_von=excluded.aktualisiert_von
      returning id, gruppe_id as "gruppeId", runde, entscheidung, begruendung, status, aktualisiert`,
      [kursId, gruppeId, runde, JSON.stringify(e), begruendung, status, von]);
    return a;
  },
  async statusSetzen(kursId: string, id: string, status: AbgabeStatus) {
    await q("update abgaben set status=$3, aktualisiert=now() where kurs_id=$1 and id=$2", [kursId, id, status]);
  },
};

const BEW_SEL = `select gruppe_id as "gruppeId", runde, wurf, punkte, korrektur, kommentar from bewertungen`;
export const bewertungen = {
  async liste(kursId: string, gruppeId?: string, bisRunde?: number): Promise<BewertungDto[]> {
    if (gruppeId !== undefined) return q<BewertungDto>(`${BEW_SEL} where kurs_id=$1 and gruppe_id=$2 and runde<=$3 order by runde`, [kursId, gruppeId, bisRunde ?? 999]);
    return q<BewertungDto>(`${BEW_SEL} where kurs_id=$1 order by runde`, [kursId]);
  },
  async speichern(kursId: string, gruppeId: string, runde: number, b: { wurf: number | null; punkte: number; korrektur: Record<string, number>; kommentar: string }) {
    await q(`insert into bewertungen(kurs_id,gruppe_id,runde,wurf,punkte,korrektur,kommentar) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (gruppe_id,runde) do update set wurf=excluded.wurf, punkte=excluded.punkte, korrektur=excluded.korrektur, kommentar=excluded.kommentar`,
      [kursId, gruppeId, runde, b.wurf, b.punkte, JSON.stringify(b.korrektur), b.kommentar]);
  },
  async wurfSetzen(kursId: string, gruppeId: string, runde: number, wurf: number) {
    await q(`insert into bewertungen(kurs_id,gruppe_id,runde,wurf) values ($1,$2,$3,$4)
      on conflict (gruppe_id,runde) do update set wurf=excluded.wurf`, [kursId, gruppeId, runde, wurf]);
  },
};
