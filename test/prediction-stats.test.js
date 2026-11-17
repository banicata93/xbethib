'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const express = require('express');
const { buildStatsPipeline, formatStats } = require('../utils/predictionStats');
const root = path.join(__dirname, '..');
const now = new Date('2026-11-17T12:00:00Z');
const groups = {
    overall: [{ total: 12, wins: 4, losses: 2, voids: 3 }],
    last30days: [{ total: 5, wins: 0, losses: 2, voids: 1 }],
    last24hours: [{ total: 3, wins: 0, losses: 0, voids: 1, avgOdds: 2.456 }],
    recentResults: [{ result: 'loss' }, { result: 'loss' }, { result: 'win' }]
};
const payload = () => formatStats(groups, now);

test('win rate uses wins and losses only; unresolved and void records remain visible', () => {
    const stats = payload();
    assert.deepEqual(stats.overall, { total: 12, wins: 4, losses: 2, voids: 3, pending: 3, completed: 6, winRate: 66.7 });
    assert.equal(stats.last30days.winRate, 0);
    assert.equal(stats.last24hours.winRate, null);
    assert.equal(stats.winRate, stats.overall.winRate);
    assert.equal(stats.avgOdds, 2.46);
    assert.deepEqual(stats.streak, { count: 2, type: 'loss' });
});

test('an empty database is distinct from zero wins, with no fabricated percentage', () => {
    const stats = formatStats(undefined, now);
    assert.equal(stats.overall.total, 0);
    assert.equal(stats.overall.completed, 0);
    assert.equal(stats.overall.winRate, null);
    assert.equal(stats.last30days.winRate, null);
    assert.deepEqual(stats.streak, { count: 0, type: null });
});

test('legacy records without a recognized result are treated as unresolved', () => {
    const stats = formatStats({ overall: [{ total: 4, wins: 1, losses: 1, voids: 0 }] }, now);
    assert.equal(stats.overall.pending, 2);
    assert.equal(stats.overall.winRate, 50);
});

function handler(aggregate) {
    const context = {
        module: { exports: {} },
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } },
        console: { error: () => {} },
        require(name) {
            if (name === '../models/prediction') return new Proxy({}, {
                get(_, method) {
                    assert.equal(method, 'aggregate', 'statistics must only use the read-only aggregate method');
                    return pipeline => ({ option(options) {
                        assert.equal(options.maxTimeMS, 10000);
                        return aggregate(pipeline);
                    } });
                }
            });
            if (name === '../utils/predictionStats') return { buildStatsPipeline, formatStats };
            throw new Error('Unexpected dependency: ' + name);
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'functions/stats.js'), 'utf8'), context);
    return context.module.exports;
}

function response() {
    return {
        code: 200, headers: {},
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('API returns only aggregated statistics and disables stale HTTP caching', async () => {
    let reads = 0;
    const run = handler(async () => { reads++; return [groups]; });
    const res = response();
    await run({ method: 'GET' }, res);
    assert.equal(reads, 1);
    assert.equal(res.code, 200);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.deepEqual(res.body, payload());
});

test('database failures return a generic error, never false zeros or database details', async () => {
    const run = handler(async () => { throw new Error('Private connection detail'); });
    const res = response();
    await run({ method: 'GET' }, res);
    assert.equal(res.code, 503);
    assert.deepEqual(JSON.parse(JSON.stringify(res.body)), { message: 'Statistics are temporarily unavailable' });
    assert.doesNotMatch(JSON.stringify(res.body), /Private|winRate|overall/);
});

test('write methods are rejected without reading or writing any data', async () => {
    const run = handler(() => assert.fail('Unexpected database operation'));
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const res = response();
        await run({ method }, res);
        assert.equal(res.code, 405);
        assert.equal(res.headers.Allow, 'GET, HEAD');
    }
});

test('the actual Express application serves /api/stats rather than its wildcard 404', async t => {
    let connectionCalls = 0;
    const statsHandler = handler(async () => [groups]);
    const context = {
        module: { exports: {} }, __dirname: root,
        process: { env: { NODE_ENV: 'production', MONGODB_URI: 'offline-fixture' } },
        console: { log: () => {}, error: () => {} },
        require(name) {
            if (name === 'dotenv') return { config() {} };
            if (name === './utils/validateEnv') return () => {};
            if (name === 'mongoose') return { connection: { readyState: 1 }, connect: async () => { connectionCalls++; } };
            if (name === './functions/stats') return statsHandler;
            if (name.startsWith('./routes/')) return express.Router();
            if (name === './middleware/prerender') return (_, __, next) => next();
            if (name.startsWith('.')) return require(path.resolve(root, name));
            return require(name);
        }
    };
    // dotenv is intercepted before the server can read any real credentials.
    vm.runInNewContext(fs.readFileSync(path.join(root, 'server.js'), 'utf8'), context);
    const server = context.module.exports.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
    const url = `http://127.0.0.1:${server.address().port}/api/stats`;
    const res = await fetch(url, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), payload());
    assert.equal(connectionCalls, 1, 'the existing shared connection middleware is used');
    const head = await fetch(url, { method: 'HEAD', headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const denied = await fetch(url, { method: 'POST', headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(denied.status, 405);
    const unknown = await fetch(url + '/unknown', { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(unknown.status, 404);
});

async function browser(data = payload(), options = {}) {
    const elements = {};
    const ids = ['prediction-stats', 'header-win-rate', 'stats-period', 'stats-total', 'stats-wins', 'stats-losses', 'stats-pending', 'stats-voids', 'stats-win-rate', 'stats-status', 'stats-retry'];
    if (!options.missingElements) for (const id of ids) elements[id] = {
        textContent: '—', hidden: true, value: 'overall', listeners: {}, attributes: {},
        addEventListener(event, callback) { this.listeners[event] = callback; },
        setAttribute(name, value) { this.attributes[name] = value; }
    };
    const requests = [];
    let ready;
    let next = async () => ({ ok: true, json: async () => data, ...options.response });
    const context = {
        document: { getElementById: id => elements[id] || null, addEventListener: (_, callback) => { ready = callback; } },
        fetch: async (...args) => { requests.push(args); return next(); }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'public/js/stats.js'), 'utf8'), context);
    ready();
    await new Promise(resolve => setImmediate(resolve));
    return { elements, requests, setResponse(callback) { next = callback; } };
}

test('homepage renders real all-time figures, with sample size and no cached fetch', async () => {
    const { elements: e, requests } = await browser();
    assert.equal(e['header-win-rate'].textContent, '66.7%');
    assert.equal(e['stats-total'].textContent, '12');
    assert.equal(e['stats-wins'].textContent, '4');
    assert.equal(e['stats-losses'].textContent, '2');
    assert.equal(e['stats-pending'].textContent, '3');
    assert.equal(e['stats-voids'].textContent, '3');
    assert.match(e['stats-status'].textContent, /6 settled predictions/);
    assert.equal(e['prediction-stats'].attributes['aria-busy'], 'false');
    assert.equal(requests[0][0], '/api/stats');
    assert.equal(requests[0][1].cache, 'no-store');
});

test('period switching shows a genuine 0% while the header remains explicitly all-time', async () => {
    const { elements: e, requests } = await browser();
    e['stats-period'].value = 'last30days';
    e['stats-period'].listeners.change();
    assert.equal(e['stats-win-rate'].textContent, '0.0%');
    assert.equal(e['stats-total'].textContent, '5');
    assert.equal(e['header-win-rate'].textContent, '66.7%');
    assert.equal(requests.length, 1);
});

test('empty and unresolved-only histories have no claimed win rate', async () => {
    for (const group of [[], [{ total: 3, wins: 0, losses: 0, voids: 1 }]]) {
        const stats = formatStats({ overall: group, last30days: group }, now);
        const { elements: e } = await browser(stats);
        assert.equal(e['stats-win-rate'].textContent, '—');
        assert.equal(e['header-win-rate'].textContent, '—');
        assert.match(e['stats-status'].textContent, /No predictions|No settled predictions/);
    }
});

test('HTTP failures, broken JSON and invalid counts never appear as real statistics', async () => {
    const bad = payload();
    bad.overall.pending = 999;
    for (const [data, options] of [
        [payload(), { response: { ok: false } }],
        [payload(), { response: { json: async () => { throw new Error('Broken JSON'); } } }],
        [bad, {}],
        [null, {}]
    ]) {
        const { elements: e } = await browser(data, options);
        assert.equal(e['header-win-rate'].textContent, '—');
        assert.equal(e['stats-total'].textContent, '—');
        assert.equal(e['stats-retry'].hidden, false);
        assert.match(e['stats-status'].textContent, /temporarily unavailable/);
    }
});

test('retry recovers from an outage and prevents overlapping requests', async () => {
    const page = await browser(payload(), { response: { ok: false } });
    let release;
    page.setResponse(() => new Promise(resolve => { release = resolve; }));
    const pending = page.elements['stats-retry'].listeners.click();
    await page.elements['stats-retry'].listeners.click();
    assert.equal(page.requests.length, 2);
    release({ ok: true, json: async () => payload() });
    await pending;
    assert.equal(page.elements['stats-retry'].hidden, true);
    assert.equal(page.elements['stats-win-rate'].textContent, '66.7%');
});

test('missing optional page elements cannot crash the statistics script', async () => {
    await browser(payload(), { missingElements: true });
});
