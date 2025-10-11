let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    const predictionForm = document.getElementById('predictionForm');
    
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Load predictions when page loads
    loadAdminPredictions();
    
    if (predictionForm) {
        predictionForm.addEventListener('submit', handleAddPrediction);
    }
});

async function handleAddPrediction(e) {
    e.preventDefault();
    
    const matchDate = document.getElementById('matchDate').value;
    const oddsValue = document.getElementById('odds').value;
    const formData = {
        matchDate: matchDate,
        homeTeam: document.getElementById('homeTeam').value,
        awayTeam: document.getElementById('awayTeam').value,
        league: {
            name: 'League',
            flag: document.getElementById('leagueFlag').value.trim()
        },
        prediction: document.getElementById('prediction').value,
        odds: oddsValue ? parseFloat(oddsValue) : null
    };

    try {
        const response = await fetch('/api/predictions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Prediction added successfully');
            loadAdminPredictions();
            e.target.reset();
        } else {
            throw new Error(data.message || 'Failed to add prediction');
        }
    } catch (error) {
        console.error('Error adding prediction:', error);
        if (error.message === 'Invalid token') {
            window.location.href = '/login';
        } else {
            alert('Failed to add prediction: ' + error.message);
        }
    }
}

async function loadAdminPredictions() {
    try {
        const response = await fetch('/api/predictions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to load predictions');
        }

        const predictions = await response.json();
        console.log('Received predictions:', predictions);
        
        // Sort predictions by date (newest first)
        predictions.sort((a, b) => {
            const dateA = new Date(a.matchDate);
            const dateB = new Date(b.matchDate);
            return dateB.getTime() - dateA.getTime();
        });

        const tbody = document.getElementById('admin-predictions-body');
        tbody.innerHTML = '';
        
        let currentDate = '';
        
        predictions.forEach(prediction => {
            if (!prediction || !prediction.league) {
                console.error('Invalid prediction data:', prediction);
                return;
            }

            const date = new Date(prediction.matchDate);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
            });
            
            const dateString = date.toISOString().split('T')[0];
            if (currentDate !== dateString) {
                currentDate = dateString;
                const dateRow = document.createElement('tr');
                dateRow.className = 'date-separator';
                dateRow.innerHTML = `
                    <td colspan="6" style="padding: 0.5rem 1rem; font-weight: 600;">
                        ${formattedDate}
                    </td>
                `;
                tbody.appendChild(dateRow);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td><span class="team-flag">${prediction.league?.flag || ''}</span></td>
                <td>${prediction.homeTeam || ''}</td>
                <td>${prediction.awayTeam || ''}</td>
                <td>${prediction.prediction || ''}</td>
                <td>
                    ${getStatusBadge(prediction.result || 'pending')}
                    ${prediction.odds ? `<br><small class="text-muted">Odds: ${prediction.odds}</small>` : ''}
                </td>
                <td>
                    ${(prediction.result === 'pending' || !prediction.result) ? `
                        <button class="btn btn-success btn-sm me-1 mb-1" onclick="markResult('${prediction._id}', 'win')" title="Mark as Win">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button class="btn btn-danger btn-sm me-1 mb-1" onclick="markResult('${prediction._id}', 'loss')" title="Mark as Loss">
                            <i class="bi bi-x-circle"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm me-1 mb-1" onclick="markResult('${prediction._id}', 'void')" title="Mark as Void">
                            <i class="bi bi-slash-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-outline-danger btn-sm mb-1" onclick="deletePrediction('${prediction._id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading predictions:', error);
        alert('Failed to load predictions: ' + error.message);
    }
}

async function deletePrediction(id) {
    if (!confirm('Are you sure you want to delete this prediction?')) return;

    try {
        const response = await fetch(`/api/predictions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to delete prediction');
        }

        loadAdminPredictions();
    } catch (error) {
        console.error('Error deleting prediction:', error);
        alert('Failed to delete prediction: ' + error.message);
    }
}

// Маркиране на резултат
async function markResult(id, result) {
    try {
        const response = await fetch(`/api/predictions/${id}/result`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ result })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to update result');
        }

        loadAdminPredictions();
    } catch (error) {
        console.error('Error updating result:', error);
        alert('Failed to update result: ' + error.message);
    }
}

// Helper функция за status badges
function getStatusBadge(result) {
    const badges = {
        'pending': '<span class="badge bg-warning text-dark">⏳ Pending</span>',
        'win': '<span class="badge bg-success">✅ Won</span>',
        'loss': '<span class="badge bg-danger">❌ Lost</span>',
        'void': '<span class="badge bg-secondary">🚫 Void</span>'
    };
    return badges[result] || badges['pending'];
}