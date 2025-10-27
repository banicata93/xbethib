// Load predictions from API
async function loadPredictions() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const predictionsBody = document.getElementById('predictions-body');
    
    try {
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        
        const response = await fetch('/api/predictions');
        
        if (!response.ok) {
            throw new Error('Failed to load predictions');
        }
        
        const predictions = await response.json();
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        // Clear existing predictions
        predictionsBody.innerHTML = '';
        
        if (predictions.length === 0) {
            predictionsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <p class="mb-0">No predictions available at the moment.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Group predictions by date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        predictions.forEach(prediction => {
            const matchDate = new Date(prediction.matchDate);
            const isToday = matchDate >= today;
            
            // Only show today's and future predictions
            if (isToday) {
                const row = document.createElement('tr');
                
                // Get status badge
                const statusBadge = getStatusBadge(prediction.result || 'pending');
                
                row.innerHTML = `
                    <td class="league-cell">
                        <span class="team-flag">${prediction.leagueFlag || '⚽'}</span>
                    </td>
                    <td class="team-name">${prediction.homeTeam}</td>
                    <td class="team-name">${prediction.awayTeam}</td>
                    <td class="prediction-cell">
                        <span class="prediction-badge">${prediction.prediction}</span>
                        ${prediction.odds ? `<span class="odds-badge">@${prediction.odds}</span>` : ''}
                    </td>
                    <td class="status-cell">${statusBadge}</td>
                `;
                
                predictionsBody.appendChild(row);
            }
        });
        
        // If no predictions for today
        if (predictionsBody.children.length === 0) {
            predictionsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <p class="mb-0">No predictions available for today.</p>
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error loading predictions:', error);
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}

// Helper function to get status badge
function getStatusBadge(result) {
    const badges = {
        'pending': '<span class="status-badge status-pending">⏳ Pending</span>',
        'win': '<span class="status-badge status-win">✅ Won</span>',
        'loss': '<span class="status-badge status-loss">❌ Lost</span>',
        'void': '<span class="status-badge status-void">🚫 Void</span>'
    };
    return badges[result] || badges['pending'];
}

// Retry button functionality
document.addEventListener('DOMContentLoaded', function() {
    loadPredictions();
    
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', loadPredictions);
    }
    
    // Reload predictions every 5 minutes
    setInterval(loadPredictions, 5 * 60 * 1000);
});
