-- Zugang nur über Codes: je Kurs ein Teilnehmer-Code und ein Spielleiter-Code.
-- Kurse legt nur die Administration an.
alter table benutzer add column ist_admin boolean not null default false;

alter table kurse rename column code to code_teilnehmer;
alter table kurse alter column code_teilnehmer drop not null;
alter table kurse add column code_leitung text unique;
update kurse set code_leitung = 'SL-' || upper(substr(md5(random()::text || id::text), 1, 8));
