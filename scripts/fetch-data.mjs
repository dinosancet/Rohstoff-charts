// Lädt Tageskurse (OHLC) für alle Rohstoffe und schreibt data/prices.json.
// Quelle 1: Yahoo Finance (kontinuierlicher Front-Monat-Future), Quelle 2: stooq.com.
// Schlägt beides fehl, bleibt die zuletzt gespeicherte Reihe erhalten.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const INSTRUMENTS = [
  { id: 'gold',   yahoo: 'GC=F', stooq: 'gc.f', dec: 2 },
  { id: 'silber', yahoo: 'SI=F', stooq: 'si.f', dec: 3 },
  { id: 'wti',    yahoo: 'CL=F', stooq: 'cl.f', dec: 2 },
  { id: 'brent',  yahoo: 'BZ=F', stooq: 'cb.f', dec: 2 },
  { id: 'gas',    yahoo: 'NG=F', stooq: 'ng.f', dec: 3 },
  { id: 'kupfer', yahoo: 'HG=F', stooq: 'hg.f', dec: 4 },
  { id: 'weizen', yahoo: 'ZW=F', stooq: 'zw.f', dec: 2 },
  { id: 'mais',   yahoo: 'ZC=F', stooq: 'zc.f', dec: 2 },
  { id: 'kaffee', yahoo: 'KC=F', stooq: 'kc.f', dec: 2 },
];
const OUT = new URL('../data/prices.json', import.meta.url);
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
      if (res.ok) return await res.text();
      last = new Error(`HTTP ${res.status} für ${url}`);
    } catch (e) { last = e; }
    await sleep(1500 * (i + 1));
  }
  throw last;
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

function clean(rows, dec) {
  // rows: [YYYY-MM-DD, o, h, l, c]; sortieren, Duplikate und Lücken entfernen
  const map = new Map();
  for (const [t, o, h, l, c] of rows) {
    if (!(c > 0)) continue;
    const oo = o > 0 ? o : c, hh = h > 0 ? h : c, ll = l > 0 ? l : c;
    map.set(t, [t, round(oo, dec), round(Math.max(hh, oo, c), dec), round(Math.min(ll, oo, c), dec), round(c, dec)]);
  }
  const out = [...map.values()].sort((a, b) => a[0].localeCompare(b[0]));
  if (out.length < 50) throw new Error(`nur ${out.length} gültige Zeilen`);
  return out;
}

async function fromYahoo(sym, dec) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=10y&interval=1d&includePrePost=false`;
  const j = JSON.parse(await get(url));
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error(j?.chart?.error?.description || 'leere Antwort');
  const q = r.indicators.quote[0];
  const offset = (r.meta?.gmtoffset || 0) * 1000;
  const rows = r.timestamp.map((ts, i) => [day(ts * 1000 + offset), q.open[i], q.high[i], q.low[i], q.close[i]]);
  return clean(rows, dec);
}

async function fromStooq(sym, dec) {
  const csv = await get(`https://stooq.com/q/d/l/?s=${sym}&i=d`);
  const lines = csv.trim().split(/\r?\n/);
  if (!/^date/i.test(lines[0])) throw new Error('kein CSV: ' + lines[0].slice(0, 60));
  const cutoff = day(Date.now() - 10 * 365.25 * 864e5);
  const rows = lines.slice(1).map((l) => l.split(',')).filter((f) => f[0] >= cutoff)
    .map((f) => [f[0], +f[1], +f[2], +f[3], +f[4]]);
  return clean(rows, dec);
}

let previous = { series: {} };
try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

const series = {};
let fresh = 0;
for (const inst of INSTRUMENTS) {
  let rows = null, source = null;
  for (const [name, fn, sym] of [['Yahoo Finance', fromYahoo, inst.yahoo], ['stooq', fromStooq, inst.stooq]]) {
    try { rows = await fn(sym, inst.dec); source = name; break; }
    catch (e) { console.warn(`${inst.id}: ${name} fehlgeschlagen: ${e.message}`); }
  }
  if (rows) {
    fresh++;
    series[inst.id] = { source, symbol: source === 'stooq' ? inst.stooq : inst.yahoo, rows };
    console.log(`${inst.id}: ${rows.length} Tage von ${source}, letzter ${rows.at(-1)[0]} = ${rows.at(-1)[4]}`);
  } else if (previous.series?.[inst.id]) {
    series[inst.id] = previous.series[inst.id];
    console.warn(`${inst.id}: alte Daten behalten`);
  }
  await sleep(800);
}

if (!fresh) { console.error('Keine einzige Reihe geladen.'); process.exit(previous.updated ? 0 : 1); }
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), series }));
console.log(`Gespeichert: ${fresh}/${INSTRUMENTS.length} Reihen aktualisiert.`);
