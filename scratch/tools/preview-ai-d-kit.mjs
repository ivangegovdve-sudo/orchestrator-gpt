// Prints what the two AI-d kit pages will show, using the real data files and the real
// renderer modules.
//
// There is no browser binary on this machine, so this stands in for opening the page: it
// reads the `data-offers-*` / `data-entries-*` hooks out of the built HTML rather than
// hard-coding them, loads the shipped JSON, renders with the real clock, and prints each
// section as text. If a hook is renamed in the HTML and not in the module, a section
// below comes out empty — which is the failure a hand-written selector list would hide.
//
//   node scratch/tools/preview-ai-d-kit.mjs            # from web/ (source)
//   node scratch/tools/preview-ai-d-kit.mjs --built    # from vercel-public/ (build output)

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { renderOffersInto } from '../../web/shared/ai-kit-offers.mjs';
import { renderEntriesInto } from '../../web/shared/ai-kit-troubleshooting.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = process.argv.includes('--built') ? 'vercel-public' : '.';

function stubRoot(hooks) {
  const elements = new Map(hooks.map((hook) => [hook, { innerHTML: '', textContent: '', hidden: false }]));
  const get = (selector) => elements.get(selector.replace(/^\[|\]$/g, '')) ?? { innerHTML: '', textContent: '', hidden: false };
  return {
    get,
    querySelector: (selector) => get(selector),
    querySelectorAll: (selector) => selector.split(',').map((one) => get(one.trim())),
  };
}

/** Strip tags for reading in a terminal, keeping one card per line. */
function asText(html) {
  return html
    .replace(/<\/article>/g, '\n')
    .replace(/<\/(p|h3|li|ul|div)>/g, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((line) => line.replace(/\s*·\s*/g, ' · ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function hooksIn(html, prefix) {
  return [...new Set([...html.matchAll(new RegExp(`data-${prefix}-[a-z-]+`, 'g'))].map((match) => match[0]))];
}

function section(title, lines) {
  console.log(`\n### ${title}`);
  if (lines.length === 0) console.log('  (nothing rendered)');
  for (const line of lines) console.log(`  - ${line}`);
}

const now = new Date();
console.log(`Rendering from ${base}/ with the real clock: ${now.toISOString()} (UTC day ${now.toISOString().slice(0, 10)})`);

// ------------------------------------------------------------------------ offers page
const offersDir = path.join(ROOT, base, 'web/pools/ai-d-kit/free-stuff-in-promotions');
const offersHtml = await readFile(path.join(offersDir, 'index.html'), 'utf8');
const offersPayload = JSON.parse(await readFile(path.join(offersDir, 'offers.json'), 'utf8'));
const offersRoot = stubRoot(hooksIn(offersHtml, 'offers'));
const grouped = renderOffersInto(offersRoot, offersPayload, { now });

console.log(`\n=== FREE STUFF IN PROMOTIONS (${hooksIn(offersHtml, 'offers').length} hooks found in the built HTML) ===`);
console.log(`\nStatus line: ${offersRoot.get('data-offers-status').textContent}`);
console.log(`Seed banner hidden: ${offersRoot.get('data-offers-seed-banner').hidden}`);
console.log(`Broken-records section hidden: ${offersRoot.get('data-offers-invalid-section').hidden}`);
section('LIVE — time-boxed promotions', asText(offersRoot.get('data-offers-active').innerHTML));
section('LIVE — standing free tiers', asText(offersRoot.get('data-offers-standing').innerHTML));
section('UNVERIFIED — not live', asText(offersRoot.get('data-offers-unverified').innerHTML));
section('WITHDRAWN ARCHIVE — expired, absent from the live list', asText(offersRoot.get('data-offers-archive').innerHTML));
section('BROKEN RECORDS', asText(offersRoot.get('data-offers-invalid').innerHTML));

const liveIds = [...grouped.livePromotions, ...grouped.liveStandingTiers].map((row) => row.offer.id);
console.log(`\nLive ids: ${liveIds.join(', ') || '(none)'}`);
console.log(`Expired ids (withheld): ${grouped.expired.map((row) => row.offer.id).join(', ') || '(none)'}`);
console.log(`Unverified ids (withheld): ${grouped.unverified.map((row) => row.offer.id).join(', ') || '(none)'}`);

// -------------------------------------------------------------- troubleshooting page
const entriesDir = path.join(ROOT, base, 'web/pools/ai-d-kit/troubleshooting');
const entriesHtml = await readFile(path.join(entriesDir, 'index.html'), 'utf8');
const entriesPayload = JSON.parse(await readFile(path.join(entriesDir, 'entries.json'), 'utf8'));
const entriesRoot = stubRoot(hooksIn(entriesHtml, 'entries'));
renderEntriesInto(entriesRoot, entriesPayload);

console.log(`\n\n=== TROUBLESHOOTING — CURATED ENTRIES ===`);
console.log(`\nStatus line: ${entriesRoot.get('data-entries-status').textContent}`);
const entryHtml = entriesRoot.get('data-entries-list').innerHTML;
const titles = [...entryHtml.matchAll(/<h3>([^<]*)<\/h3>/g)].map((match) => match[1]);
section('Entry titles', titles);
console.log(`\nWorkaround badges: ${(entryHtml.match(/entry-badge-workaround/g) || []).length}`);
console.log(`Fix badges: ${(entryHtml.match(/entry-badge-fix/g) || []).length}`);
console.log(`Code blocks rendered: ${(entryHtml.match(/<pre class="entry-code">/g) || []).length}`);
console.log(`Broken entry records: ${(entryHtml.match(/entry-invalid/g) || []).length}`);
console.log(`Static record entries still in the HTML (the JS-off fallback): ${(entriesHtml.match(/class="troubleshooting-entry"/g) || []).length}`);
