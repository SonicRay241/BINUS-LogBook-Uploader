// Throwaway smoke test for shared/content.js logic (CSV parser + date helpers).
// Run: node test/smoke.js
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'shared', 'content.js'), 'utf8');

function loadSandbox(extra) {
  const window = Object.assign({ __LBU_TEST__: true }, extra);
  vm.runInNewContext(src, { window, document: { readyState: 'complete' }, console, URL });
  return window;
}

let failed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failed++; console.log('FAIL', name, '=>', JSON.stringify(actual), 'want', JSON.stringify(expected)); }
  else console.log('ok  ', name);
}

const w = loadSandbox();
check('test API exported', typeof w.__LBU.parseCSV, 'function');

const api = w.__LBU;

// ── parseCSVRows (rows → entries) ──
check('parseCSVRows', api.parseCSVRows([
  ['Date', 'Clock In', 'Clock Out', 'Activity', 'Description'],
  ['Tue, 1 Sep 2026', '8:26 AM', '5:31 PM', 'Scraping', '- run'],
  ['Wed, 2 Sep 2026', '9:00 AM', '  ', 'Dashboard', ''],
  ['', '', '', '', ''],
]), [
  { dateStr: 'Tue, 1 Sep 2026', clockIn: '8:26 AM', clockOut: '5:31 PM', activity: 'Scraping', description: '- run' },
  { dateStr: 'Wed, 2 Sep 2026', clockIn: '9:00 AM', clockOut: '', activity: 'Dashboard', description: '' },
]);

// ── parseCSV (raw text: quoting, CRLF) ──
const w2 = loadSandbox();
const text = 'date,activity\r\n"Tue, 1 Sep 2026","Scraping, dashboard"\r\n';
const parsed = w2.__LBU.parseCSV(text);
check('quoted rows split on commas inside quotes', w2.__lbuCSVRows, [['date', 'activity'], ['Tue, 1 Sep 2026', 'Scraping, dashboard']]);
check('parseCSV entries', parsed, [
  { dateStr: 'Tue, 1 Sep 2026', clockIn: '', clockOut: '', activity: 'Scraping, dashboard', description: '' },
]);

// ── date helpers ──
check('csvDateToKey', api.csvDateToKey('Tue, 1 Sep 2026'), '2026-09-01');
check('csvDateToKey unknown month', api.csvDateToKey('1 Foo 2026'), '2026-??-01');
check('apiDateToKey ISO', api.apiDateToKey('2026-09-01T00:00:00'), '2026-09-01');
check('apiDateToKey /Date(ms)/', api.apiDateToKey('/Date(1789234000000)/'), new Date(1789234000000).toISOString().slice(0, 10));
check('apiDateToKey junk', api.apiDateToKey('nonsense'), null);
check('getDayOfWeek Sat', api.getDayOfWeek('2026-09-05'), 6);
check('getDayOfWeek Sun', api.getDayOfWeek('2026-09-06'), 0);
check('padClockTime pads hour', api.padClockTime('8:26 AM'), '08:26 AM');
check('padClockTime OFF passthrough', api.padClockTime('OFF'), 'OFF');
check('padClockTime junk passthrough', api.padClockTime('x'), 'x');

process.exitCode = failed ? 1 : 0;
console.log(failed ? failed + ' FAILED' : 'all passed');