// Simplified main.js - No API calls, faster loading

// Helper function to get status badge
function getStatusBadge(result) {
    const badges = {
        'pending': '',
        'win': '<span class="status-badge status-win">✅</span>',
        'loss': '<span class="status-badge status-loss">❌</span>',
        'void': '<span class="status-badge status-void">⛔</span>'
    };
    return badges[result] || '';
}

// Static predictions - no API call needed
function loadPredictions() {
    const predictionsBody = document.getElementById('predictions-body');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    
    // Hide loading and error messages immediately
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Show message that predictions are loaded from server-side
    if (predictionsBody && predictionsBody.innerHTML.trim() === '') {
        predictionsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="mb-0" style="color: rgba(255, 255, 255, 0.7);">
                        <i class="bi bi-info-circle me-2"></i>
                        Predictions are updated daily. Check back soon!
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
