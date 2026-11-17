'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const composer = require('../public/js/prediction-composer');
const schemas = require('../utils/validationSchemas');
const mongoose = require('mongoose');
const Prediction = require('../models/prediction');
const { createManualPrediction } = require('../utils/manualPrediction');

const root = path.join(__dirname, '..');
const base = { matchDate: '2026-11-17', homeTeam: 'Alpha', awayTeam: 'Beta', leagueFlag: '🇧🇬' };
const values = [];
for (const outcome of [null, ...composer.options.outcome]) {
    for (const goals of [null, ...composer.options.goals]) {
        for (const btts of [null, ...composer.options.btts]) {
            if (outcome || goals || btts) values.push({ outcome, goals, btts });
        }
    }
}

test('contains exactly the requested options and all 146 nonempty combinations', () => {
    assert.deepEqual(composer.options, {
        outcome: ['1', 'X', '2', '1X', 'X2', '12'],
        goals: ['Over 1.5', 'Over 2.5', 'Over 3.5', 'Under 1.5', 'Under 2.5', 'Under 3.5'],
        btts: ['BTTS Yes', 'BTTS No']
    });
    assert.equal(values.length, 146);
    for (const selection of values) {
        assert.equal(composer.compose(selection), [selection.outcome, selection.goals, selection.btts].filter(Boolean).join(' + '));
    }
});

test('replaces one category at a time and toggles the selected option off', () => {
    let selection = {};
    selection = composer.toggleSelection(selection, 'outcome', '1');
    selection = composer.toggleSelection(selection, 'goals', 'Over 2.5');
    selection = composer.toggleSelection(selection, 'btts', 'BTTS Yes');
    selection = composer.toggleSelection(selection, 'outcome', '2');
    assert.equal(composer.compose(selection), '2 + Over 2.5 + BTTS Yes');
    selection = composer.toggleSelection(selection, 'goals', 'Over 2.5');
    assert.equal(composer.compose(selection), '2 + BTTS Yes');
    selection = composer.toggleSelection(selection, 'btts', 'BTTS No');
    assert.equal(composer.compose(selection), '2 + BTTS No');
    assert.equal(composer.toggleSelection(selection, 'unknown', '1'), selection);
    assert.equal(composer.toggleSelection(selection, 'outcome', 'invalid'), selection);
});

test('accepts every single and combined prediction without odds in the real API schema and model', () => {
    assert.equal(mongoose.connection.readyState, 0);
    for (const selection of values) {
        const text = composer.compose(selection);
        const { error, value } = schemas.predictionSchema.validate({ ...base, prediction: text });
        assert.equal(error, undefined);
        assert.equal(value.prediction, text);
        assert.equal(Object.hasOwn(value, 'odds'), false);
        const document = new Prediction(value);
        assert.equal(document.validateSync(), undefined);
        assert.equal(document.prediction, text);
        assert.equal(document.odds, null);
    }
    assert.equal(mongoose.connection.readyState, 0);
});

test('retains custom text and existing odds, while rejecting empty or oversized new predictions', () => {
    const custom = 'Точен резултат 2:1 и гол след почивката';
    const valid = schemas.predictionSchema.validate({ ...base, prediction: custom, odds: 2.4 });
    assert.equal(valid.error, undefined);
    const existing = new Prediction(valid.value);
    existing.prediction = '1 + Over 2.5';
    assert.equal(existing.validateSync(), undefined);
    assert.equal(existing.odds, 2.4);
    assert.ok(schemas.predictionSchema.validate({ ...base, prediction: '' }).error);
    assert.ok(schemas.predictionSchema.validate({ ...base, prediction: 'a'.repeat(201) }).error);
    assert.ok(schemas.predictionSchema.validate({ ...base, prediction: '1', odds: 0 }).error);
    assert.equal(schemas.bulkPredictionSchema.validate({ predictions: [{ ...base, prediction: 'X' }] }).error, undefined);
});

function routeHandlers() {
    const handlers = {};
    const saved = [];
    // Reproduce the production unique, non-sparse fixtureId index and its
    // already-existing manual record with fixtureId: null.
    const fixtureIds = new Set([null, 12345]);
    const router = {};
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        router[method] = (route, ...callbacks) => { handlers[method + ' ' + route] = callbacks.at(-1); };
    }
    class MemoryPrediction {
        constructor(value) { this.document = new Prediction(value); }
        async save() {
            const error = this.document.validateSync();
            if (error) throw error;
            const value = this.document.toObject();
            if (fixtureIds.has(value.fixtureId)) {
                throw Object.assign(new Error('Duplicate fixture ID'), {
                    code: 11000, keyPattern: { fixtureId: 1 }, keyValue: { fixtureId: value.fixtureId }
                });
            }
            fixtureIds.add(value.fixtureId);
            saved.push(value);
            return value;
        }
        static async findByIdAndUpdate(id, update) { return { _id: id, ...update }; }
    }
    const modules = {
        express: { Router: () => router },
        '../models/prediction': MemoryPrediction,
        '../middleware/auth': () => {},
        '../utils/validationSchemas': schemas,
        '../utils/cache': { cacheMiddleware: () => () => {}, invalidateCache: () => {} },
        '../utils/manualPrediction': {
            createManualPrediction: data => createManualPrediction(data, { PredictionModel: MemoryPrediction })
        }
    };
    const context = {
        module: { exports: {} },
        require(name) { if (!Object.hasOwn(modules, name)) throw new Error('Unexpected module'); return modules[name]; },
        console: { error: () => {} }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'routes/predictions.js'), 'utf8'), context);
    return { handlers, saved };
}

function response() {
    return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('the existing POST handler saves new predictions without odds and PUT preserves legacy odds', async () => {
    const { handlers, saved } = routeHandlers();
    for (const prediction of ['1', 'X', '2', '1 + Over 3.5', 'Over 2.5 + BTTS Yes']) {
        const res = response();
        await handlers['post /']({ body: { ...base, prediction } }, res);
        assert.equal(res.code, 201);
        assert.equal(res.body.prediction, prediction);
        assert.equal(res.body.odds, null);
        assert.ok(Number.isSafeInteger(res.body.fixtureId) && res.body.fixtureId < 0);
    }
    assert.equal(saved.length, 5);
    assert.equal(new Set(saved.map(record => record.fixtureId)).size, 5);
    const res = response();
    await handlers['put /:id']({ params: { id: 'existing' }, body: { ...base, prediction: 'Custom legacy tip', odds: 2.4, result: 'win' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.odds, 2.4);
    assert.equal(res.body.result, 'win');
});

test('bulk manual creation also succeeds with the same existing unique fixture index', async () => {
    const { handlers, saved } = routeHandlers();
    const res = response();
    await handlers['post /']({ body: { predictions: [
        { ...base, prediction: '1', odds: 2.4, result: 'win' },
        { ...base, prediction: 'X + Under 2.5' }
    ] } }, res);
    assert.equal(res.code, 201);
    assert.equal(res.body.success, 2);
    assert.equal(res.body.failed, 0);
    assert.equal(saved[0].odds, 2.4);
    assert.equal(saved[0].result, 'win');
    assert.ok(saved.every(record => Number.isSafeInteger(record.fixtureId) && record.fixtureId < 0));
    assert.notEqual(saved[0].fixtureId, saved[1].fixtureId);
});

test('the unchanged public renderer displays every new combination and legacy text', () => {
    const body = { innerHTML: '' };
    const context = vm.createContext({
        document: { getElementById: () => body, addEventListener: () => {} },
        window: {}, console: { error: () => {} }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'public/js/main.js'), 'utf8'), context);
    const predictions = values.map(selection => ({ ...base, prediction: composer.compose(selection) }));
    predictions.push({ ...base, prediction: 'Legacy custom tip', odds: 2.4, result: 'win' });
    context.window.renderPredictions(predictions);
    assert.equal((body.innerHTML.match(/class="prediction-cell"/g) || []).length, 147);
    for (const prediction of predictions) assert.ok(body.innerHTML.includes('<strong>' + prediction.prediction + '</strong>'));
});

test('League Flag retains its exact original markup and date/team inputs retain their attributes', () => {
    const html = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
    const originalFlag = fs.readFileSync(path.join(__dirname, 'fixtures/league-flag-select.html'), 'utf8').trim();
    assert.equal(html.match(/<select\b[^>]*id="leagueFlag"[\s\S]*?<\/select>/)[0], originalFlag);
    assert.match(html, /<input type="date" class="form-control" id="matchDate" required>/);
    assert.match(html, /onclick="setTodayDate\(\)"/);
    assert.match(html, /onclick="setTomorrowDate\(\)"/);
    for (const id of ['homeTeam', 'awayTeam']) assert.match(html, new RegExp('<input type="text" class="form-control" id="' + id + '" required'));
    const form = html.match(/<form id="predictionForm">[\s\S]*?<\/form>/)[0];
    assert.doesNotMatch(form, /\bodds\b|Odds/);
    const style = fs.readFileSync(path.join(root, 'public/css/prediction-composer.css'), 'utf8');
    assert.doesNotMatch(style, /#leagueFlag|\.form-select/);
});

async function statsFor(records) {
    // These fixtures all have the same match date within the last 24 hours.
    const odds = records.map(record => record.odds).filter(value => typeof value === 'number');
    const grouped = [{
        total: records.length,
        wins: records.filter(record => record.result === 'win').length,
        losses: records.filter(record => record.result === 'loss').length,
        voids: records.filter(record => record.result === 'void').length,
        avgOdds: odds.length ? odds.reduce((a, b) => a + b, 0) / odds.length : null
    }];
    const model = {
        aggregate: () => ({ option: async () => [{ overall: grouped, last30days: grouped, last24hours: grouped, recentResults: [] }] })
    };
    const context = {
        module: { exports: {} },
        Date: class extends Date {
            constructor(...args) { super(...(args.length ? args : ['2026-11-17T12:00:00Z'])); }
        },
        require(name) {
            if (name === 'mongoose') return { connect: async () => ({}), connection: {} };
            if (name === '../models/prediction') return model;
            if (name === '../utils/predictionStats') return require('../utils/predictionStats');
            throw new Error('Unexpected module');
        },
        process: { env: { MONGODB_URI: 'offline-fixture' } },
        console: { log: () => {}, error: () => {} }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'functions/stats.js'), 'utf8'), context);
    const res = response();
    res.setHeader = () => {};
    await context.module.exports({ method: 'GET' }, res);
    assert.equal(res.code, 200);
    return res.body;
}

test('statistics count results, preserve legacy odds and ignore new null odds in the average', async () => {
    const old = [
        { ...base, prediction: 'Legacy win', result: 'win', odds: 2 },
        { ...base, prediction: 'Legacy loss', result: 'loss', odds: 3 }
    ];
    const before = await statsFor(old);
    const after = await statsFor([...old, { ...base, prediction: '1 + Over 2.5 + BTTS Yes', result: 'pending', odds: null }]);
    assert.equal(after.overall.total, before.overall.total + 1);
    assert.equal(after.overall.wins, before.overall.wins);
    assert.equal(after.overall.losses, before.overall.losses);
    assert.equal(after.overall.pending, before.overall.pending + 1);
    assert.equal(after.overall.winRate, before.overall.winRate);
    assert.equal(after.avgOdds, before.avgOdds);
    assert.equal(after.avgOdds, 2.5);
    assert.equal(mongoose.connection.readyState, 0);
});
