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
        predictions.sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate));
        
        // Group by date
        const groupedByDate = {};
        predictions.forEach(prediction => {
            const matchDate = new Date(prediction.matchDate);
            const dateKey = matchDate.toLocaleDateString('bg-BG', { 
                day: '2-digit', 
                month: '2-digit',
                year: 'numeric'
            });
            
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(prediction);
        });
        
        // Render grouped predictions
        const dateKeys = Object.keys(groupedByDate);
        dateKeys.forEach((dateKey, index) => {
            // Add date header row
            const dateHeaderRow = document.createElement('tr');
            dateHeaderRow.className = 'date-header-row';
            dateHeaderRow.innerHTML = `
                <td colspan="5" class="date-header">
                    <strong>${dateKey}</strong>
                </td>
            `;
            predictionsBody.appendChild(dateHeaderRow);
            
            // Add predictions for this date
            groupedByDate[dateKey].forEach(prediction => {
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
            });
            
            // Add mobile ad after all predictions (only on mobile and after last date group)
            if (index === dateKeys.length - 1 && window.innerWidth < 768) {
                const adRow = document.createElement('tr');
                adRow.className = 'd-md-none mobile-ad-row';
                adRow.innerHTML = `
                    <td colspan="5" class="p-0">
                        <div class="goleador-premium-ad mt-3 mb-2">
                            <a href="https://www.goleadortips.com" target="_blank" class="premium-ad-link">
                                <div class="premium-ad-content">
                                    <div class="premium-ad-icon">
                                        <i class="fas fa-trophy"></i>
                                    </div>
                                    <div class="premium-ad-text">
                                        <div class="premium-ad-title">GoleadorTips Premium</div>
                                        <div class="premium-ad-description">Get exclusive football predictions</div>
                                    </div>
                                    <div class="premium-ad-button">
                                        <span>Join Now</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </td>
                `;
                predictionsBody.appendChild(adRow);
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
        'pending': '<span class="status-badge status-pending">⏳</span>',
        'win': '<span class="status-badge status-win">✅</span>',
        'loss': '<span class="status-badge status-loss">❌</span>',
        'void': '<span class="status-badge status-void">⛔</span>'
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
