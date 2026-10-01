(function () {
    'use strict';

    /* ============================================================
       BINUS Logbook Uploader — Firefox content script
       Injects an "Upload CSV" button into the Learning Plan page
       and fills daily logbook entries via the site's own API.
       ============================================================ */

    // ─── Configuration ──────────────────────────────────────────
    const BASE_URL = 'https://activity-enrichment.apps.binus.ac.id';
    const CSS_ID = 'binus-logbook-uploader-style';
    let isRunning = false;

    // ─── Initialization ─────────────────────────────────────────
    function init() {
        if (!window.location.pathname.includes('/LearningPlan/StudentIndex')) return;
        injectUI();
    }

    // ─── UI Injection ───────────────────────────────────────────
    function injectUI() {
        if (!document.getElementById(CSS_ID)) {
            var style = document.createElement('style');
            style.id = CSS_ID;
            style.textContent = [
                '#binus-lbu-root { all: initial; position: fixed;',
                '  z-index: 99999; bottom: 24px; right: 24px;',
                '  font-family: sans-serif; font-size: 14px;',
                '  line-height: 1.4; color: #333; }',
                '#binus-lbu-btn { display: inline-flex; align-items: center;',
                '  gap: 6px; padding: 10px 18px; background: #2645B8;',
                '  color: #fff; border: none; border-radius: 8px;',
                '  font-size: 14px; font-weight: 600; cursor: pointer;',
                '  box-shadow: 0 2px 12px rgba(38,69,184,0.35);',
                '  transition: opacity .2s; }',
                '#binus-lbu-btn:hover { opacity: .85; }',
                '#binus-lbu-btn:disabled { opacity: .5; cursor: not-allowed; }',
                '#binus-lbu-panel { display: none; margin-top: 8px;',
                '  padding: 14px 16px; background: #fff; border-radius: 8px;',
                '  box-shadow: 0 4px 20px rgba(0,0,0,0.15);',
                '  border: 1px solid #e0e0e0; max-width: 380px;',
                '  word-wrap: break-word; }',
                '#binus-lbu-panel.visible { display: block; }',
                '#binus-lbu-status { margin-bottom: 6px; }',
                '#binus-lbu-status.error { color: #d12f2e; }',
                '#binus-lbu-status.success { color: #2e7d32; }',
                '#binus-lbu-progress { font-size: 13px; color: #666; }',
                '#binus-lbu-progress-bar { width: 100%; height: 4px;',
                '  background: #eee; border-radius: 2px;',
                '  margin-top: 6px; overflow: hidden; }',
                '#binus-lbu-progress-fill { height: 100%; width: 0%;',
                '  background: #2645B8; border-radius: 2px;',
                '  transition: width .3s; }'
            ].join('\n');
            document.head.appendChild(style);
        }
        if (document.getElementById('binus-lbu-root')) return;
        var root = document.createElement('div');
        root.id = 'binus-lbu-root';
        root.innerHTML = [
            '<button id="binus-lbu-btn">📋 Upload CSV</button>',
            '<div id="binus-lbu-panel">',
            '  <div id="binus-lbu-status">Ready</div>',
            '  <div id="binus-lbu-progress"></div>',
            '  <div id="binus-lbu-progress-bar" style="display:none">',
            '    <div id="binus-lbu-progress-fill"></div>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(root);
        document.getElementById('binus-lbu-btn').addEventListener('click', onUploadClick);
    }

    // ─── File Selection ─────────────────────────────────────────
    function onUploadClick() {
        if (isRunning) return;
        var tab = document.querySelector('.logBookTab');
        if (tab && !tab.classList.contains('current')) {
            setStatus('Switch to the Log Book tab first.', 'error');
            return;
        }
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.tsv';
        input.addEventListener('change', async function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var text = await file.text();
            var entries = parseCSV(text);
            if (entries.length === 0) {
                setStatus('No valid entries found in CSV.', 'error');
                return;
            }
            await uploadEntries(entries);
        });
        input.click();
    }

    // ─── Single-pass CSV Parser ──────────────────────────────
    function parseCSV(text) {
        var rows = [], row = [], field = '';
        var inQ = false, hasData = false;
        function pushF() { row.push(field); if (field.trim()) hasData = true; field = ''; }
        function pushR() { pushF(); if (hasData && row.length) rows.push(row); row = []; hasData = false; }
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (c === '\"') { inQ = !inQ; continue; }
            if (c === '\r') continue;
            if (c === '\n' && !inQ) { pushR(); continue; }
            if (c === ',' && !inQ) { pushF(); continue; }
            field += c;
        }
        if (field || row.length) pushR();
        if (rows.length < 2) return [];
        var hdr = rows[0];
        var ci = {
            date: hdr.findIndex(function(c) { return /date/i.test(c); }),
            clockIn: hdr.findIndex(function(c) { return /clock/i.test(c); }),
            clockOut: hdr.findIndex(function(c) { return /clock\s*out/i.test(c); }),
            activity: hdr.findIndex(function(c) { return /activity/i.test(c); }),
            desc: hdr.findIndex(function(c) { return /desc/i.test(c); }),
        };
        console.log('[LBU] CSV header:', hdr, 'colIdx:', ci);
        if (ci.date === -1) return [];
        var out = [];
        for (var r = 1; r < rows.length; r++) {
            var f = rows[r];
            var ds = (f[ci.date] || '').trim();
            if (!ds) continue;
            out.push({
                dateStr: ds,
                clockIn: ci.clockIn >= 0 ? (f[ci.clockIn] || '').trim() : '',
                clockOut: ci.clockOut >= 0 ? (f[ci.clockOut] || '').trim() : '',
                activity: ci.activity >= 0 ? (f[ci.activity] || '').trim() : '',
                description: ci.desc >= 0 ? (f[ci.desc] || '').trim() : '',
            });
        }
        return out;
    }

    // ─── Date Helpers ───────────────────────────────────────────
    var MONTH_MAP = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };

    function csvDateToKey(str) {
        var m = str.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
        if (!m) return null;
        return m[3] + '-' + (MONTH_MAP[m[2]] || '??') + '-' + m[1].padStart(2, '0');
    }

    function apiDateToKey(dateVal) {
        if (typeof dateVal !== 'string') dateVal = String(dateVal);
        var m = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[1] + '-' + m[2] + '-' + m[3];
        var tm = dateVal.match(/\/Date\((\d+)\)/);
        if (tm) {
            var d = new Date(parseInt(tm[1], 10));
            if (!isNaN(d.getTime())) {
                return d.getUTCFullYear() + '-' +
                    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getUTCDate()).padStart(2, '0');
            }
        }
        var d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function getDayOfWeek(dateVal) {
        if (typeof dateVal === 'string') {
            var m = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
            var tm = dateVal.match(/\/Date\((\d+)\)/);
            if (tm) return new Date(+tm[1]).getUTCDay();
        }
        var d = new Date(dateVal);
        return isNaN(d.getTime()) ? -1 : d.getDay();
    }

    // ─── DOM: get headerID from the selected month tab ────────────
    function getSelectedMonthHeaderID(monthsData) {
        // Find which month tab the user has open (has class="current" in #monthTab)
        var currentTab = document.querySelector('#monthTab li.current a');
        if (currentTab) {
            var onclick = currentTab.getAttribute('onclick') || '';
            var m = onclick.match(/tabClick\('([^']+)'\)/);
            if (m) {
                console.log('[LBU] Using active tab headerID:', m[1]);
                return m[1];
            }
        }
        // Fallback: use data.lbid from API
        if (monthsData && monthsData.lbid) {
            console.log('[LBU] Fallback to API lbid:', monthsData.lbid);
            return monthsData.lbid;
        }
        return null;
    }

    

    // ─── Helper: pad clock time to HH:MM AM/PM format ──────
    function padClockTime(t) {
        if (!t || t === 'OFF') return t;
        var m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        return m ? m[1].padStart(2, '0') + ':' + m[2] + ' ' + m[3].toUpperCase() : t;
    }

    // ─── Main Upload Logic ──────────────────────────────────────
    async function uploadEntries(csvEntries) {
        isRunning = true;
        toggleUI(true);
        try {
            // Get months from API
            var monthsData = await apiGet('/LogBook/GetMonths', { logBookId: '' });
            if (!monthsData || !monthsData.data || monthsData.data.length === 0) {
                setStatus('Cannot load months. Is your LP finalized?', 'error');
                return;
            }
            var headerID = getSelectedMonthHeaderID(monthsData);
            if (!headerID) {
                setStatus('Could not determine current month tab.', 'error');
                return;
            }
            // Fetch logbook entries for that month
            var params = new URLSearchParams();
            params.set('logBookHeaderID', headerID);
            var lbData = await apiPost('/LogBook/GetLogBook', params);
            if (!lbData || !lbData.data) {
                setStatus('Cannot load logbook entries.', 'error');
                return;
            }
            var apiEntries = lbData.data;
            var flagjuly = !!lbData.flagjulyactive;
            var total = apiEntries.length;

            console.log('[LBU] API returned ' + total + ' entries');
            for (var d = 0; d < Math.min(3, total); d++) {
                console.log('  ' + d + ': date=', apiEntries[d].date,
                    'acceptanceID=', apiEntries[d].acceptanceID,
                    'key="' + apiDateToKey(apiEntries[d].date) + '"',
                    'dow=', getDayOfWeek(apiEntries[d].date));
            }

            // Build CSV lookup
            var csvByKey = {};
            console.log('[LBU] CSV entries:');
            for (var i = 0; i < csvEntries.length; i++) {
                var key = csvDateToKey(csvEntries[i].dateStr);
                console.log('  "' + csvEntries[i].dateStr + '" => "' + key + '"');
                if (key) csvByKey[key] = csvEntries[i];
            }

            var filled = 0, markedOff = 0, skipped = 0, errors = 0;
            showProgressBar(true);

            for (var i = 0; i < apiEntries.length; i++) {
                var row = apiEntries[i];
                var dateKey = apiDateToKey(row.date);
                if (!dateKey) { skipped++; updateProgressBar(filled + markedOff + skipped, total); continue; }
                var dow = getDayOfWeek(row.date);

                if (row.acceptanceID === 1 || row.acceptanceID === 3 || row.acceptanceID === 4) {
                    skipped++; updateProgressBar(filled + markedOff + skipped, total); continue;
                }
                if (dow === 0) {
                    skipped++; updateProgressBar(filled + markedOff + skipped, total); continue;
                }
                if (dow === 6) {
                    console.log('[LBU] SAT ' + dateKey + ' => OFF');
                    var ok = await rawSaveEntry(headerID, row.id, row.date, 'OFF', 'OFF', 'OFF', 'OFF', flagjuly);
                    if (ok) markedOff++; else errors++;
                    updateProgressBar(filled + markedOff + skipped + errors, total);
                    continue;
                }

                var csvRow = csvByKey[dateKey];
                if (csvRow) {
                    console.log('[LBU] FILL ' + dateKey + ' => ' + csvRow.activity);
                    var ok = await rawSaveEntry(headerID, row.id, row.date,
                        padClockTime(csvRow.clockIn) || 'OFF', padClockTime(csvRow.clockOut) || 'OFF',
                        csvRow.activity || '', csvRow.description || '', flagjuly);
                    if (ok) filled++; else errors++;
                } else {
                    console.log('[LBU] SKIP ' + dateKey + ' (no CSV match)');
                    skipped++;
                }
                updateProgressBar(filled + markedOff + skipped + errors, total);
            }

            var msg = 'Done!<br>' +
                filled + ' filled, ' + markedOff + ' OFF (Sat), ' +
                skipped + ' skipped' + (errors ? ', ' + errors + ' errors' : '');
            setStatus(msg, errors ? 'error' : 'success');
        } catch (err) {
            setStatus('Error: ' + (err.message || err), 'error');
        } finally {
            isRunning = false;
            toggleUI(false);
        }
    }

    // ─── API Helpers ────────────────────────────────────────────
    async function apiGet(endpoint, params) {
        var url = BASE_URL + endpoint + '?' + new URLSearchParams(params).toString();
        var resp = await fetch(url, {
            credentials: 'include',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!resp.ok) throw new Error('GET ' + endpoint + ' => ' + resp.status);
        return resp.json();
    }

    async function apiPost(endpoint, bodyParams) {
        var resp = await fetch(BASE_URL + endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: bodyParams.toString()
        });
        if (!resp.ok) throw new Error('POST ' + endpoint + ' => ' + resp.status);
        return resp.json();
    }

    async function rawSaveEntry(headerID, entryID, date, clockIn, clockOut, activity, description, flagjuly) {
        var body = new URLSearchParams();
        body.append('model[ID]', entryID || '');
        body.append('model[LogBookHeaderID]', headerID);
        body.append('model[Date]', typeof date === 'string' ? date : '');
        body.append('model[Activity]', activity);
        body.append('model[ClockIn]', clockIn);
        body.append('model[ClockOut]', clockOut);
        body.append('model[Description]', description);
        body.append('model[flagjulyactive]', String(flagjuly));
        console.log('[LBU] POST /LogBook/StudentSave body=' + body.toString().slice(0, 150));
        try {
            var resp = await fetch(BASE_URL + '/LogBook/StudentSave', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: body.toString()
            });
            if (!resp.ok) { var errText = await resp.text(); console.log('[LBU] Save error body:', errText.slice(0, 200)); return false; }
            var data = await resp.json();
            console.log('[LBU] Save JSON:', JSON.stringify(data).slice(0, 200));
            return data && data.json !== false;
        } catch (e) {
            console.log('[LBU] Save exception:', e.message);
            return false;
        }
    }

    // ─── UI Helpers ─────────────────────────────────────────────
    function setStatus(html, type) {
        var el = document.getElementById('binus-lbu-status');
        if (!el) return;
        el.innerHTML = html;
        el.className = type || '';
        var panel = document.getElementById('binus-lbu-panel');
        if (panel) panel.classList.add('visible');
    }

    function toggleUI(disabled) {
        var btn = document.getElementById('binus-lbu-btn');
        if (btn) {
            btn.disabled = disabled;
            btn.textContent = disabled ? 'Uploading...' : 'Upload CSV';
        }
    }

    function showProgressBar(show) {
        var bar = document.getElementById('binus-lbu-progress-bar');
        if (bar) bar.style.display = show ? 'block' : 'none';
    }

    function updateProgressBar(current, total) {
        var fill = document.getElementById('binus-lbu-progress-fill');
        if (fill) fill.style.width = (total > 0 ? Math.round((current / total) * 100) : 0) + '%';
        var text = document.getElementById('binus-lbu-progress');
        if (text) text.textContent = current + ' / ' + total;
    }

    // ─── Start ──────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
