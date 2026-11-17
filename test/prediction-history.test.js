'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/main.js'), 'utf8');

function browser(predictions = [], response = {}) {
    const body = { innerHTML: '' };
    const requests = [];
    const errors = [];
    const context = vm.createContext({
        document: {
            getElementById: id => id === 'predictions-body' ? body : null,
            addEventListener: () => {}
        },
        window: {},
        console: { error: (...args) => errors.push(args) },
        fetch: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, json: async () => predictions, ...response };
        }
    });
    vm.runInContext(source, context, { filename: 'main.js' });
    return { body, requests, errors, render: context.window.renderPredictions, load: context.window.loadPredictions };
}

function match(fields = {}) {
    return {
        matchDate: '2026-11-17T12:00:00.000Z',
        league: 'Premier League',
        homeTeam: 'Home',
        awayTeam: 'Away',
        prediction: 'Home win',
        ...fields
    };
}

test('loads the full history endpoint, including old bot imports', async () => {
    const page = browser([
        match(),
        { date: '2026-04-01T10:00:00Z', league: 'Serie A', home: 'Legacy home', away: 'Legacy away', winner: 'Draw', underOver: 'Under 2.5' }
    ]);
    await page.load();
    assert.equal(page.requests.length, 1);
    assert.equal(page.requests[0].url, '/api/predictions');
    assert.equal(page.requests[0].options.cache, 'no-cache');
    assert.equal(page.errors.length, 0);
    assert.match(page.body.innerHTML, /Legacy home/);
    assert.match(page.body.innerHTML, /<strong>Draw<\/strong>/);
    assert.match(page.body.innerHTML, /Under 2\.5/);
    assert.match(page.body.innerHTML, /datetime="2026-04-01"/);
});

test('groups by day in descending order without changing the input', () => {
    const predictions = [
        match({ matchDate: null, date: '2026-04-01T10:00:00Z', homeTeam: 'Oldest' }),
        match({ matchDate: null, date: '2026-04-04T11:00:00Z', homeTeam: 'Old late' }),
        match({ homeTeam: 'Newest' }),
        match({ matchDate: null, date: '2026-04-04T09:00:00Z', homeTeam: 'Old early' })
    ];
    const before = JSON.stringify(predictions);
    const page = browser();
    page.render(predictions);
    const html = page.body.innerHTML;
    assert.deepEqual([...html.matchAll(/datetime="([^"]+)"/g)].map(match => match[1]), ['2026-11-17', '2026-04-04', '2026-04-01']);
    assert.ok(html.indexOf('Newest') < html.indexOf('Old late'));
    assert.ok(html.indexOf('Old late') < html.indexOf('Old early'));
    assert.ok(html.indexOf('Old early') < html.indexOf('Oldest'));
    assert.equal(JSON.stringify(predictions), before);
});

test('falls back from invalid or missing matchDate and retains undated records', () => {
    const page = browser();
    page.render([
        match({ matchDate: 'invalid', date: '2026-04-04T12:00:00Z', homeTeam: 'Fallback' }),
        match({ matchDate: null, date: null, homeTeam: 'Undated' }),
        match({ matchDate: null, date: 'invalid', homeTeam: 'Also undated' })
    ]);
    assert.match(page.body.innerHTML, /datetime="2026-04-04"/);
    assert.equal((page.body.innerHTML.match(/Date not available/g) || []).length, 1);
    assert.match(page.body.innerHTML, /Undated/);
    assert.match(page.body.innerHTML, /Also undated/);
    assert.doesNotMatch(page.body.innerHTML, /1970|Invalid Date/);
});

test('keeps the API calendar day stable across browser time zones', () => {
    const page = browser();
    page.render([match({ matchDate: '2026-04-01T23:30:00Z' })]);
    assert.match(page.body.innerHTML, /datetime="2026-04-01"/);
    assert.match(page.body.innerHTML, /01 April 2026/);
});

test('preserves manual entries, image flags and legacy flag fields', () => {
    const page = browser();
    page.render([
        match({ league: '', leagueFlag: '⚽', homeTeam: 'Manual' }),
        match({ flag: 'https://example.com/flag.png', country: 'Country', homeTeam: 'Image' }),
        match({ league: { name: 'League', flag: '🇧🇬' }, homeTeam: 'Object league' })
    ]);
    assert.match(page.body.innerHTML, /Manual/);
    assert.match(page.body.innerHTML, /⚽/);
    assert.match(page.body.innerHTML, /src="https:\/\/example\.com\/flag\.png"/);
    assert.match(page.body.innerHTML, /🇧🇬/);
    assert.doesNotMatch(page.body.innerHTML, /\[object Object\]/);
});

test('escapes text from current and legacy fields', () => {
    const page = browser();
    page.render([match({ homeTeam: '<img src=x>', prediction: '', winner: '<script>bad()</script>', flag: '<b>' })]);
    assert.match(page.body.innerHTML, /&lt;img src=x&gt;/);
    assert.match(page.body.innerHTML, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
    assert.match(page.body.innerHTML, /&lt;b&gt;/);
    assert.doesNotMatch(page.body.innerHTML, /<script>|<img src=x>|<b>/);
});

test('shows an empty history message without restricting it to today', async () => {
    const page = browser([]);
    await page.load();
    assert.match(page.body.innerHTML, /No predictions available yet/);
    assert.doesNotMatch(page.body.innerHTML, /for today/);
});

test('handles invalid responses and HTTP failures', async () => {
    for (const page of [browser({ message: 'Unexpected response' }), browser(null), browser([], { ok: false, status: 500 })]) {
        await page.load();
        assert.equal(page.errors.length, 1);
        assert.match(page.body.innerHTML, /Unable to load predictions/);
    }
});

test('a malformed item cannot hide the rest of the history', () => {
    const page = browser();
    page.render([null, [], 'invalid', match({ homeTeam: 'Visible' })]);
    assert.match(page.body.innerHTML, /Visible/);
    assert.equal((page.body.innerHTML.match(/class="prediction-cell"/g) || []).length, 1);
});

test('the page requests the new script version', () => {
    const html = fs.readFileSync(path.join(__dirname, '../views/index.html'), 'utf8');
    assert.match(html, /src="\/js\/main\.js\?v=2\.3"/);
    assert.doesNotMatch(html, /src="\/js\/main\.js\?v=2\.2"/);
});
