# Rohstoff-Charts

Mobile Chart-App für Rohstoffe (Gold, Silber, WTI, Brent, Erdgas, Kupfer, Weizen, Mais, Kaffee).

- Ein Finger ziehen: verschieben (mit Schwung), zwei Finger spreizen: zoomen
- Gedrückt halten: Fadenkreuz
- Gedrückt halten + zweiter Finger: prozentuale Veränderung zwischen zwei Punkten
- Kennzahlen: Performance, 52W-Hoch/Tief, Volatilität, ATR, RSI, MA 50/200, Drawdown, Kontraktdaten

## Daten

`scripts/fetch-data.mjs` lädt werktags nach US-Börsenschluss die Tageskurse der Front-Monat-Futures
(Yahoo Finance, Ersatz: stooq.com) und speichert sie in `data/prices.json`. Der Workflow
`.github/workflows/update.yml` führt das automatisch aus und veröffentlicht die Seite auf GitHub Pages.
Kein API-Key nötig. Die Kurse sind inoffizielle, ggf. verzögerte Daten und keine Anlageberatung.

Lokal: `node scripts/fetch-data.mjs`, dann `npx serve .` (die Seite braucht einen Webserver, um `data/prices.json` zu laden).
