// Main.js - Load predictions from API with caching

// Escape HTML to prevent XSS when injecting API data into the DOM
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Render predictions into the existing table body
function renderPredictions(predictions) {
    const predictionsBody = document.getElementById('predictions-body');

    if (!predictions || predictions.length === 0) {
        predictionsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="mb-0" style="color: rgba(255, 255, 255, 0.7);">
                        <i class="bi bi-info-circle me-2"></i>
                        No predictions available for today. Check back soon!
                    </p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    predictions.forEach(prediction => {
        const flag = prediction.flag || prediction.league || '⚽';
        // Show flag image when the value is an HTTP(S) URL, otherwise show as text/emoji
        const leagueDisplay = /^https?:\/\//i.test(flag)
            ? `<img src="${escapeHtml(flag)}" alt="${escapeHtml(prediction.country || prediction.league || 'League')}" class="league-flag" style="width:22px;height:22px;object-fit:contain;" loading="lazy">`
            : `<span class="team-flag">${escapeHtml(flag)}</span>`;

        const stick = escapeHtml(prediction.stick || '');

        html += `
            <tr>
                <td class="text-center">${leagueDisplay}</td>
                <td class="team-cell">${escapeHtml(prediction.homeTeam)}</td>
                <td class="team-cell">${escapeHtml(prediction.awayTeam)}</td>
                <td class="prediction-cell"><strong>${escapeHtml(prediction.prediction)}</strong></td>
                <td class="text-center" style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">${stick}</td>
            </tr>
        `;
    });

    predictionsBody.innerHTML = html;
}

// Load predictions from API
async function loadPredictions() {
    const predictionsBody = document.getElementById('predictions-body');

    if (!predictionsBody) {
        console.error('Predictions body element not found');
        return;
    }

    // Show loading state
    predictionsBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 mb-0" style="color: rgba(255, 255, 255, 0.7);">Loading predictions...</p>
            </td>
        </tr>
    `;

    try {
        const response = await fetch('/api/predictions/today');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const predictions = await response.json();

        if (predictions.message) {
            throw new Error(predictions.message);
        }

        renderPredictions(predictions);

    } catch (error) {
        console.error('Error loading predictions:', error);
        predictionsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="mb-0 text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Unable to load predictions. Please try again later.
                    </p>
                </td>
            </tr>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPredictions();
});

// Expose for external use
window.loadPredictions = loadPredictions;
window.renderPredictions = renderPredictions;
