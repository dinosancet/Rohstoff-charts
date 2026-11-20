// Lädt Rohstoffkurse von Alpha Vantage (kostenloser API-Key) und schreibt data/prices.json.
// Key: Umgebungsvariable ALPHAVANTAGE_KEY (im Repository als Secret hinterlegt).
// Gold, Silber, WTI, Brent und Erdgas gibt es täglich, Kupfer, Weizen, Mais und Kaffee nur monatlich.
// Nur Schlusskurse, keine Kerzen. Schlägt ein Abruf fehl, bleibt die zuletzt gespeicherte Reihe erhalten.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.ALPHAVANTAGE_KEY;
if (!KEY) { console.error('ALPHAVANTAGE_KEY fehlt.'); process.exit(1); }

const INSTRUMENTS = [
  { id: 'gold',   fn: 'GOLD_SILVER_HISTORY', params: { symbol: 'XAU', interval: 'daily' }, dec: 2 },
  { id: 'silber', fn: 'GOLD_SILVER_HISTORY', params: { symbol: 'XAG', interval: 'daily' }, dec: 3 },
  { id: 'wti',    fn: 'WTI',         params: { interval: 'daily' },   dec: 2 },
  { id: 'brent',  fn: 'BRENT',       params: { interval: 'daily' },   dec: 2 },
  { id: 'gas',    fn: 'NATURAL_GAS', params: { interval: 'daily' },   dec: 3 },
  { id: 'kupfer', fn: 'COPPER',      params: { interval: 'monthly' }, dec: 2 },
  { id: 'weizen', fn: 'WHEAT',       params: { interval: 'monthly' }, dec: 2 },
  { id: 'mais',   fn: 'CORN',        params: { interval: 'monthly' }, dec: 2 },
  { id: 'kaffee', fn: 'COFFEE',      params: { interval: 'monthly' }, dec: 2 },
];
const OUT = new URL('../data/prices.json', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

function germanUnit(u = '') {
  const s = u.toLowerCase();
  if (s.includes('barrel')) return 'USD je Barrel';
  if (s.includes('mmbtu') || s.includes('million btu')) return 'USD je MMBtu';
  if (s.includes('troy') || s.includes('ounce')) return 'USD je Feinunze';
  if (s.includes('cent') && s.includes('pound')) return 'US-Cent je Pfund';
  if (s.includes('pound')) return 'USD je Pfund';
  if (s.includes('metric ton') || s.includes('tonne')) return 'USD je Tonne';
  return u;
}

async function load(inst) {
  const qs = new URLSearchParams({ function: inst.fn, ...inst.params, apikey: KEY });
  const res = await fetch(`https://www.alphavantage.co/query?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!Array.isArray(j.data)) throw new Error(j.Note || j.Information || j['Error Message'] || 'unerwartete Antwort');
  const daily = inst.params.interval === 'daily';
  const cutoff = day(Date.now() - (daily ? 10 : 30) * 365.25 * 864e5);
  const map = new Map();
  for (const p of j.data) {
    const c = parseFloat(p.value ?? p.price ?? p.close);
    const d = String(p.date || p.timestamp || '').slice(0, 10);
    if (!(c > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < cutoff) continue;
    const v = round(c, inst.dec);
    map.set(d, [d, v, v, v, v]);
  }
  const rows = [...map.values()].sort((a, b) => a[0].localeCompare(b[0]));
  if (rows.length < 24) throw new Error(`nur ${rows.length} gültige Werte`);
  return { rows, unit: germanUnit(j.unit), name: j.name || inst.fn };
}

let previous = { series: {} };
try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

const series = {};
let fresh = 0;
for (const [k, inst] of INSTRUMENTS.entries()) {
  if (k) await sleep(15000); // Gratis-Tarif: wenige Abrufe pro Minute
  try {
    const { rows, unit, name } = await load(inst);
    series[inst.id] = { source: 'Alpha Vantage', symbol: inst.fn === 'GOLD_SILVER_HISTORY' ? inst.params.symbol : inst.fn,
      name, interval: inst.params.interval, unit, closeOnly: true, rows };
    fresh++;
    console.log(`${inst.id}: ${rows.length} Werte (${inst.params.interval}, ${unit}), letzter ${rows.at(-1)[0]} = ${rows.at(-1)[4]}`);
  } catch (e) {
    console.warn(`${inst.id}: fehlgeschlagen: ${e.message}`);
    if (previous.series?.[inst.id]) { series[inst.id] = previous.series[inst.id]; console.warn(`${inst.id}: alte Daten behalten`); }
  }
}

if (!fresh) { console.error('Keine einzige Reihe geladen.'); process.exit(1); }
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), series }));
console.log(`Gespeichert: ${fresh}/${INSTRUMENTS.length} Reihen aktualisiert.`);
