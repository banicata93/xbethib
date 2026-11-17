'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');

function harness(fetchResponse, settings = {}) {
    const fields = {
        '#matchDate': { value: '2026-11-17' },
        '#homeTeam': { value: 'Alpha' },
        '#awayTeam': { value: 'Beta' },
        '#leagueFlag': { value: '🇧🇬' },
        '#predictionSubmitStatus': { textContent: '', hidden: true, dataset: {} },
        '#predictionLoginLink': { hidden: true },
        'button[type="submit"]': {
            innerHTML: 'Add Prediction', textContent: 'Add Prediction', disabled: false,
            setAttribute() {}, removeAttribute() {}
        }
    };
    const form = { resets: 0, querySelector: selector => fields[selector], reset() { this.resets++; } };
    const controller = { validate: () => settings.valid !== false, getValue: () => '1 + Over 2.5' };
    const requests = [];
    let refreshes = 0;
    const context = {
        window: { PredictionComposer: { get: () => settings.noComposer ? null : controller } },
        document: { addEventListener() {} },
        console: { log() {}, error() {} },
        setTimeout, clearTimeout, AbortController,
        fetch: async (url, options) => {
            requests.push({ url, options });
            return typeof fetchResponse === 'function' ? fetchResponse() : fetchResponse;
        }
    };
    if (settings.brokenToast) context.window.Toast = { success() { throw new Error('Optional notification failed'); } };
    vm.createContext(context);
    vm.runInContext(source, context);
    context.loadAdminPredictions = () => { refreshes++; };
    const submit = () => context.window.handleAddPrediction({ preventDefault() {}, currentTarget: form, target: form });
    return { fields, form, requests, submit, context, refreshes: () => refreshes };
}

function response(status, data) {
    return { status, ok: status >= 200 && status < 300, json: async () => data };
}

test('shows pending state, prevents duplicate requests and restores the button after a confirmed save', async () => {
    let release;
    const page = harness(() => new Promise(resolve => { release = resolve; }));
    const pending = page.submit();
    const button = page.fields['button[type="submit"]'];
    assert.equal(button.disabled, true);
    assert.match(button.textContent, /Записване/);
    assert.equal(page.fields['#predictionSubmitStatus'].dataset.state, 'pending');
    await page.submit();
    assert.equal(page.requests.length, 1);
    assert.equal(Object.hasOwn(JSON.parse(page.requests[0].options.body), 'odds'), false);
    release(response(201, { _id: 'fixture', prediction: '1 + Over 2.5' }));
    await pending;
    assert.equal(button.disabled, false);
    assert.equal(button.innerHTML, 'Add Prediction');
    assert.equal(page.form.resets, 1);
    assert.equal(page.refreshes(), 1);
    assert.equal(page.fields['#predictionSubmitStatus'].dataset.state, 'success');
    assert.equal(page.fields['#predictionSubmitStatus'].hidden, false);
});

test('shows the exact affected fields for rejected input without clearing the form', async () => {
    const page = harness(response(400, { errors: [{ field: 'homeTeam', message: 'Internal detail' }] }));
    await page.submit();
    const status = page.fields['#predictionSubmitStatus'];
    assert.equal(status.dataset.state, 'error');
    assert.match(status.textContent, /домакина.*2.*100/);
    assert.doesNotMatch(status.textContent, /Internal/);
    assert.equal(page.form.resets, 0);
    assert.equal(page.fields['button[type="submit"]'].disabled, false);
});

test('expired authorization is visible and offers the existing login page without changing authentication', async () => {
    const page = harness(response(401, { message: 'Invalid or expired token' }));
    await page.submit();
    assert.match(page.fields['#predictionSubmitStatus'].textContent, /Сесията за вход/);
    assert.equal(page.fields['#predictionLoginLink'].hidden, false);
    assert.equal(page.form.resets, 0);
});

test('server errors and unreadable successful responses never claim that a prediction was saved', async () => {
    for (const result of [response(500, { message: 'Sensitive server detail' }), { ...response(201), json: async () => { throw new Error('Invalid JSON'); } }, response(200, { message: 'Unknown response' })]) {
        const page = harness(result);
        await page.submit();
        assert.equal(page.form.resets, 0);
        assert.equal(page.fields['#predictionSubmitStatus'].dataset.state, 'error');
        assert.doesNotMatch(page.fields['#predictionSubmitStatus'].textContent, /Sensitive/);
        assert.equal(page.fields['button[type="submit"]'].disabled, false);
    }
});

test('network failures retain the fields, restore the button and do not retry automatically', async () => {
    const page = harness(async () => { throw new Error('Offline'); });
    await page.submit();
    assert.equal(page.requests.length, 1);
    assert.equal(page.form.resets, 0);
    assert.equal(page.fields['button[type="submit"]'].disabled, false);
    assert.match(page.fields['#predictionSubmitStatus'].textContent, /Няма потвърждение/);
});

test('an unavailable toast library cannot prevent the successful form reset', async () => {
    const page = harness(response(201, { _id: 'fixture' }), { brokenToast: true });
    await page.submit();
    assert.equal(page.form.resets, 1);
    assert.equal(page.fields['#predictionSubmitStatus'].dataset.state, 'success');
});

test('missing composer or empty prediction produces visible feedback before sending anything', async () => {
    for (const settings of [{ noComposer: true }, { valid: false }]) {
        const page = harness(response(201, { _id: 'fixture' }), settings);
        await page.submit();
        assert.equal(page.requests.length, 0);
        assert.equal(page.fields['#predictionSubmitStatus'].hidden, false);
        assert.equal(page.fields['#predictionSubmitStatus'].dataset.state, 'error');
    }
});

test('notification visibility and cache versions are included only in the admin resources', () => {
    const root = path.join(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'public/css/prediction-composer.css'), 'utf8');
    assert.match(html, /admin\.js\?v=prediction-composer-2/);
    assert.match(html, /prediction-composer\.css\?v=2/);
    assert.match(html, /id="predictionSubmitStatus"/);
    assert.match(css, /\.toast-container \.toast\s*\{\s*display:\s*flex/);
});
