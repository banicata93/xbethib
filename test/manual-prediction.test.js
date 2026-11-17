'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const Prediction = require('../models/prediction');
const { createManualPrediction, createManualFixtureId } = require('../utils/manualPrediction');

const input = { matchDate: '2026-11-17', homeTeam: 'Alpha', awayTeam: 'Beta', leagueFlag: '🇧🇬', prediction: '1 + Over 2.5' };

function duplicate(key, value) {
    return Object.assign(new Error('Unique index rejection'), {
        code: 11000, keyPattern: { [key]: 1 }, keyValue: { [key]: value }
    });
}

function uniqueStore() {
    const records = [
        { fixtureId: null, prediction: 'Existing manual prediction' },
        { fixtureId: 12345, prediction: 'Existing provider prediction' }
    ];
    class MemoryPrediction {
        constructor(data) { this.document = new Prediction(data); }
        async save() {
            const error = this.document.validateSync();
            if (error) throw error;
            const record = this.document.toObject();
            if (records.some(existing => existing.fixtureId === record.fixtureId)) throw duplicate('fixtureId', record.fixtureId);
            records.push(record);
            return record;
        }
    }
    return { records, Model: MemoryPrediction };
}

test('reproduces the old null collision and saves multiple new manual predictions without changing existing data', async () => {
    const store = uniqueStore();
    const existing = JSON.stringify(store.records);
    await assert.rejects(new store.Model(input).save(), error => error.code === 11000 && error.keyValue.fixtureId === null);
    const first = await createManualPrediction(input, { PredictionModel: store.Model });
    const second = await createManualPrediction(input, { PredictionModel: store.Model });
    assert.equal(store.records.length, 4);
    assert.equal(JSON.stringify(store.records.slice(0, 2)), existing);
    assert.equal(first.prediction, input.prediction);
    assert.equal(first.odds, null);
    assert.ok(first.fixtureId < 0 && second.fixtureId < 0);
    assert.notEqual(first.fixtureId, second.fixtureId);
    assert.equal(mongoose.connection.readyState, 0);
});

test('manual identifiers fit the existing numeric model and never use null, zero or positive values', () => {
    for (let i = 0; i < 100; i++) {
        const id = createManualFixtureId();
        assert.ok(Number.isSafeInteger(id));
        assert.ok(id < 0);
        assert.equal(new Prediction({ ...input, fixtureId: id }).validateSync(), undefined);
    }
});

test('a generated ID collision retries only the failed insert with a fresh identifier', async () => {
    const ids = [-1, -2];
    const attempted = [];
    class Model {
        constructor(data) { this.data = data; }
        async save() {
            attempted.push(this.data.fixtureId);
            if (this.data.fixtureId === -1) throw duplicate('fixtureId', -1);
            return this.data;
        }
    }
    const saved = await createManualPrediction(input, { PredictionModel: Model, generateFixtureId: () => ids.shift() });
    assert.deepEqual(attempted, [-1, -2]);
    assert.equal(saved.fixtureId, -2);
});

test('other unique-key errors and uncertain network results are never retried', async () => {
    for (const error of [duplicate('_id', 'fixture'), new Error('Connection lost'), duplicate('fixtureId', null)]) {
        let attempts = 0;
        class Model { async save() { attempts++; throw error; } }
        await assert.rejects(createManualPrediction(input, { PredictionModel: Model, generateFixtureId: () => -1 }), caught => caught === error);
        assert.equal(attempts, 1);
    }
});

test('repeated generated collisions stop after a bounded number of failed inserts', async () => {
    let attempts = 0;
    class Model { async save() { attempts++; throw duplicate('fixtureId', -1); } }
    await assert.rejects(createManualPrediction(input, { PredictionModel: Model, generateFixtureId: () => -1 }), error => error.code === 11000);
    assert.equal(attempts, 5);
});

test('the helper rejects invalid internal identifiers before attempting any write', async () => {
    for (const id of [null, 0, 1, -1.5, -Number.MAX_SAFE_INTEGER - 1]) {
        let attempts = 0;
        class Model { async save() { attempts++; } }
        await assert.rejects(createManualPrediction(input, { PredictionModel: Model, generateFixtureId: () => id }), TypeError);
        assert.equal(attempts, 0);
    }
});
