(function(root, factory) {
    const composer = factory();
    if (typeof module === 'object' && module.exports) module.exports = composer;
    else root.PredictionComposer = composer;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';

    const options = Object.freeze({
        outcome: Object.freeze(['1', 'X', '2', '1X', 'X2', '12']),
        goals: Object.freeze(['Over 1.5', 'Over 2.5', 'Over 3.5', 'Under 1.5', 'Under 2.5', 'Under 3.5']),
        btts: Object.freeze(['BTTS Yes', 'BTTS No'])
    });
    const categories = Object.keys(options);
    const controllers = new WeakMap();

    function toggleSelection(selection, category, value) {
        if (!Object.hasOwn(options, category) || !options[category].includes(value)) return selection;
        return { ...selection, [category]: selection[category] === value ? null : value };
    }

    function compose(selection) {
        return categories.map(category => selection[category])
            .filter((value, index) => options[categories[index]].includes(value))
            .join(' + ');
    }

    function initialize(form) {
        if (!form) return null;
        if (controllers.has(form)) return controllers.get(form);
        const root = form.querySelector('[data-prediction-composer]');
        if (!root) return null;

        const field = form.querySelector('#prediction');
        const manual = root.querySelector('#manualPrediction');
        const manualPanel = root.querySelector('[data-prediction-manual]');
        const choices = root.querySelector('[data-prediction-choices]');
        const preview = root.querySelector('#predictionPreview');
        const error = root.querySelector('#predictionError');
        const optionButtons = Array.from(root.querySelectorAll('[data-prediction-category]'));
        const modeButtons = Array.from(root.querySelectorAll('[data-prediction-mode]'));
        let selection = {};
        let mode = 'combined';

        function getValue() {
            return mode === 'manual' ? manual.value.trim() : compose(selection);
        }

        function update() {
            const value = getValue();
            field.value = value;
            preview.textContent = value || (mode === 'manual' ? 'Въведи нестандартна прогноза' : 'Избери поне една опция');
            root.dataset.mode = mode;
            choices.hidden = mode !== 'combined';
            manualPanel.hidden = mode !== 'manual';
            manual.disabled = mode !== 'manual';
            manual.required = mode === 'manual';
            error.hidden = true;
            error.textContent = '';
            manual.removeAttribute('aria-invalid');
            for (const button of optionButtons) {
                button.setAttribute('aria-pressed', String(selection[button.dataset.predictionCategory] === button.dataset.predictionValue));
            }
            for (const button of modeButtons) {
                button.setAttribute('aria-pressed', String(button.dataset.predictionMode === mode));
            }
        }

        function validate() {
            const value = getValue();
            const message = !value ? 'Избери поне една опция или въведи прогноза ръчно.'
                : value.length > 200 ? 'Прогнозата може да съдържа до 200 знака.' : '';
            if (!message) return true;
            error.textContent = message;
            error.hidden = false;
            if (mode === 'manual') {
                manual.setAttribute('aria-invalid', 'true');
                manual.focus();
            } else {
                optionButtons[0].focus();
            }
            return false;
        }

        function reset() {
            selection = {};
            mode = 'combined';
            manual.value = '';
            update();
        }

        root.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button || !root.contains(button)) return;
            if (button.dataset.predictionMode) {
                mode = button.dataset.predictionMode === 'manual' ? 'manual' : 'combined';
                update();
                if (mode === 'manual') manual.focus();
            } else if (mode === 'combined' && button.dataset.predictionCategory) {
                selection = toggleSelection(selection, button.dataset.predictionCategory, button.dataset.predictionValue);
                update();
            }
        });
        manual.addEventListener('input', update);
        form.addEventListener('reset', reset);

        const controller = {
            getValue,
            validate,
            reset,
            setManualValue(value) {
                manual.value = String(value ?? '');
                mode = 'manual';
                update();
            }
        };
        controllers.set(form, controller);
        update();
        return controller;
    }

    return { options, toggleSelection, compose, initialize, get: form => controllers.get(form) };
});
