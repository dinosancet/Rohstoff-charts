# Rohstoff-Charts

Mobile Chart-App für Rohstoffe (Gold, Silber, WTI, Brent, Erdgas, Kupfer, Weizen, Mais, Kaffee).

- Ein Finger ziehen: verschieben (mit Schwung), zwei Finger spreizen: zoomen
- Gedrückt halten: Fadenkreuz
- Gedrückt halten + zweiter Finger: prozentuale Veränderung zwischen zwei Punkten
- Kennzahlen: Performance, 52W-Hoch/Tief, Volatilität, ATR, RSI, MA 50/200, Drawdown, Kontraktdaten

## Daten

**Live (empfohlen):** Unten auf der Seite unter „Live-Kurse (Capital.com)“ E-Mail, API-Key und Key-Passwort
eines Capital.com-Demokontos eintragen. Die App lädt dann Tageskerzen und streamt die aktuellen Kurse.
Die Zugangsdaten bleiben nur im Browser (localStorage) und landen nie im Repository.

**Tageswerte im Hintergrund (optional):** `scripts/fetch-data.mjs` lädt werktags Kurse von Alpha Vantage nach
`data/prices.json`, sofern im Repository das Secret `ALPHAVANTAGE_KEY` gesetzt ist. Ohne Key zeigt die Seite
Beispieldaten, solange keine Live-Verbindung besteht.

Alle Kurse ohne Gewähr, keine Anlageberatung.
