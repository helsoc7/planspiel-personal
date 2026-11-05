-- Planspiel-Plattform: Grundschema. Spielunabhängig, die Inhalte stecken in spielpakete.inhalt.

create table benutzer (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  passwort_hash text not null,
  erstellt timestamptz not null default now()
);

create table spielpakete (
  id text not null,
  version int not null,
  name text not null,
  status text not null default 'freigegeben' check (status in ('entwurf','freigegeben','archiviert')),
  inhalt jsonb not null,
  erstellt timestamptz not null default now(),
  primary key (id, version)
);

create table kurse (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  spiel_id text not null,
  spiel_version int not null,
  beginn date,
  ende date,
  erstellt_von uuid not null references benutzer(id),
  erstellt timestamptz not null default now(),
  foreign key (spiel_id, spiel_version) references spielpakete(id, version)
);

create table gruppen (
  id uuid primary key default gen_random_uuid(),
  kurs_id uuid not null references kurse(id) on delete cascade,
  name text not null,
  akteur text not null,
  unique (kurs_id, name)
);

create table kurs_mitglieder (
  kurs_id uuid not null references kurse(id) on delete cascade,
  benutzer_id uuid not null references benutzer(id) on delete cascade,
  rolle text not null check (rolle in ('leitung','teilnehmer')),
  gruppe_id uuid references gruppen(id) on delete set null,
  primary key (kurs_id, benutzer_id)
);

create table runden (
  kurs_id uuid not null references kurse(id) on delete cascade,
  nr int not null,
  status text not null default 'gesperrt' check (status in ('gesperrt','offen','geschlossen','ausgewertet')),
  primary key (kurs_id, nr)
);

create table abgaben (
  id uuid primary key default gen_random_uuid(),
  kurs_id uuid not null references kurse(id) on delete cascade,
  gruppe_id uuid not null references gruppen(id) on delete cascade,
  runde int not null,
  entscheidung jsonb not null default '{"zusatz":[]}',
  begruendung text not null default '',
  status text not null default 'entwurf' check (status in ('entwurf','abgegeben','freigegeben','zurueckgegeben')),
  aktualisiert timestamptz not null default now(),
  aktualisiert_von uuid references benutzer(id),
  unique (gruppe_id, runde)
);

create table bewertungen (
  kurs_id uuid not null references kurse(id) on delete cascade,
  gruppe_id uuid not null references gruppen(id) on delete cascade,
  runde int not null,
  wurf int,
  punkte numeric not null default 0,
  korrektur jsonb not null default '{}',
  kommentar text not null default '',
  primary key (gruppe_id, runde)
);

create index on kurs_mitglieder (benutzer_id);
create index on abgaben (kurs_id, runde);
create index on bewertungen (kurs_id, runde);
