'use strict';

const { randomInt } = require('node:crypto');
const Prediction = require('../models/prediction');

const MAX_ATTEMPTS = 5;

function createManualFixtureId() {
    // Provider fixtures retain their positive IDs. Manual entries get their own
    // negative, safely representable numeric IDs, never the shared null default.
    return -randomInt(1, 2 ** 48);
}

function isFixtureIdCollision(error, fixtureId) {
    return error?.code === 11000 &&
        error.keyPattern?.fixtureId === 1 &&
        Object.keys(error.keyPattern).length === 1 &&
        (!error.keyValue || error.keyValue.fixtureId === fixtureId);
}

async function createManualPrediction(data, {
    PredictionModel = Prediction,
    generateFixtureId = createManualFixtureId
} = {}) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const fixtureId = generateFixtureId();
        if (!Number.isSafeInteger(fixtureId) || fixtureId >= 0) {
            throw new TypeError('Manual fixture ID must be a negative safe integer');
        }
        try {
            return await new PredictionModel({ ...data, fixtureId }).save();
        } catch (error) {
            // A duplicate-key rejection did not insert a document. Other failures
            // may have an uncertain result and must not be retried automatically.
            if (!isFixtureIdCollision(error, fixtureId) || attempt === MAX_ATTEMPTS - 1) throw error;
        }
    }
}

module.exports = { createManualPrediction, createManualFixtureId };
