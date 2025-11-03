// Main.js - Load predictions from API

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

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const matchDate = new Date(date);
    matchDate.setHours(0, 0, 0, 0);
    
    if (matchDate.getTime() === today.getTime()) {
        return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (matchDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Get date key for grouping
function getDateKey(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
        const response = await fetch('/api/predictions');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const predictions = await response.json();
        console.log('Loaded predictions:', predictions);
        
        if (!predictions || predictions.length === 0) {
            predictionsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <p class="mb-0" style="color: rgba(255, 255, 255, 0.7);">
                            <i class="bi bi-info-circle me-2"></i>
                            No predictions available. Check back soon!
                        </p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Filter out Match of the Day from regular predictions
        const regularPredictions = predictions.filter(p => !p.isMatchOfTheDay);
        
        // Group predictions by date
        const groupedByDate = {};
        regularPredictions.forEach(prediction => {
            const dateKey = getDateKey(prediction.matchDate);
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(prediction);
        });
        
        // Sort dates
        const sortedDates = Object.keys(groupedByDate).sort();
        
        // Build table rows with date separators
        let html = '';
        sortedDates.forEach(dateKey => {
            const datePredictions = groupedByDate[dateKey];
            const dateDisplay = formatDate(datePredictions[0].matchDate);
            
            // Add date separator row - FULL WIDTH
            html += `
                <tr class="date-separator">
                    <td colspan="5" class="date-header">
                        <i class="bi bi-calendar3"></i> ${dateDisplay}
                    </td>
                </tr>
            `;
            
            // Add predictions for this date
            datePredictions.forEach(prediction => {
                const statusBadge = getStatusBadge(prediction.result || 'pending');
                // Use leagueFlag emoji from database
                const leagueFlag = prediction.leagueFlag || '⚽';
                
                html += `
                    <tr>
                        <td class="text-center">
                            <span class="team-flag">${leagueFlag}</span>
                        </td>
                        <td class="team-cell">${prediction.homeTeam}</td>
                        <td class="team-cell">${prediction.awayTeam}</td>
                        <td class="prediction-cell"><strong>${prediction.prediction}</strong></td>
                        <td class="text-center">${statusBadge}</td>
                    </tr>
                `;
            });
        });
        
        predictionsBody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading predictions:', error);
        predictionsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="mb-0 text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error loading predictions. Please try again later.
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
