-- Einmalpasswort durch die Spielleitung: muss bei der nächsten Anmeldung geändert werden.
-- passwort_version steigt bei jeder Passwortänderung. Sitzungen mit älterer Version werden ungültig.
alter table benutzer add column passwort_aendern boolean not null default false;
alter table benutzer add column passwort_version int not null default 0;
