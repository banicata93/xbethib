// Make token globally accessible
window.token = null;
let token = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get token from localStorage or sessionStorage
    token = localStorage.getItem('token') || sessionStorage.getItem('token');
    window.token = token;
    
    const predictionForm = document.getElementById('predictionForm');
    
    if (!token) {
        setTimeout(() => {
            window.location.href = '/login';
        }, 500);
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
            Toast.success('Prediction added successfully! ✅');
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
            Toast.error('Failed to add prediction: ' + error.message);
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
            if (!prediction) {
                console.error('Invalid prediction data:', prediction);
                return;
            }

            const date = new Date(prediction.matchDate);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
            });
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-bold">${formattedDate}</td>
                <td style="font-size: 1.2rem;">${prediction.leagueFlag || prediction.league?.flag || ''}</td>
                <td class="fw-bold">${prediction.homeTeam || ''}</td>
                <td class="fw-bold">${prediction.awayTeam || ''}</td>
                <td class="text-primary fw-bold">${prediction.prediction || ''}</td>
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
                    <button class="btn btn-warning btn-sm me-1 mb-1" onclick="editPrediction('${prediction._id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm mb-1" onclick="deletePrediction('${prediction._id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading predictions:', error);
        Toast.error('Failed to load predictions: ' + error.message);
    }
}

window.deletePrediction = async function(id) {
    if (!confirm('Are you sure you want to delete this prediction?')) return;

    try {
        const token = window.token || localStorage.getItem('token');
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
        Toast.error('Failed to delete prediction: ' + error.message);
    }
}

// Маркиране на резултат
window.markResult = async function(id, result) {
    try {
        const token = window.token || localStorage.getItem('token');
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
        Toast.error('Failed to update result: ' + error.message);
    }
}

window.updateResult = window.markResult;

// Helper функция за status badges
function getStatusBadge(result) {
    const badges = {
        'pending': '<span class="badge bg-warning text-dark">Pending</span>',
        'win': '<span class="badge bg-success">✅ Won</span>',
        'loss': '<span class="badge bg-danger">❌ Lost</span>',
        'void': '<span class="badge bg-secondary">🚫 Void</span>'
    };
    return badges[result] || badges['pending'];
}

// Редактиране на прогноза
window.editPrediction = async function(id) {
    try {
        // Зареждаме данните на прогнозата
        const response = await fetch('/api/predictions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load prediction');
        }
        
        const predictions = await response.json();
        const prediction = predictions.find(p => p._id === id);
        
        if (!prediction) {
            throw new Error('Prediction not found');
        }
        
        // Показваме модалния прозорец за редактиране
        showEditModal(prediction);
    } catch (error) {
        console.error('Error loading prediction for edit:', error);
        Toast.error('Failed to load prediction: ' + error.message);
    }
}

// Показване на модален прозорец за редактиране
function showEditModal(prediction) {
    // Проверяваме дали модалът вече съществува
    let modal = document.getElementById('editPredictionModal');
    
    if (!modal) {
        // Създаваме модалния прозорец
        const modalHTML = `
            <div class="modal fade" id="editPredictionModal" tabindex="-1" aria-labelledby="editPredictionModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editPredictionModalLabel">Edit Prediction</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editPredictionForm">
                                <input type="hidden" id="editPredictionId">
                                
                                <div class="mb-3">
                                    <label for="editMatchDate" class="form-label">Match Date</label>
                                    <input type="date" class="form-control" id="editMatchDate" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editHomeTeam" class="form-label">Home Team</label>
                                    <input type="text" class="form-control" id="editHomeTeam" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editAwayTeam" class="form-label">Away Team</label>
                                    <input type="text" class="form-control" id="editAwayTeam" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editPrediction" class="form-label">Prediction</label>
                                    <input type="text" class="form-control" id="editPrediction" placeholder="1X2, BTTS, Over/Under" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editOdds" class="form-label">Odds (Optional)</label>
                                    <input type="number" step="0.01" class="form-control" id="editOdds" placeholder="1.50">
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editResult" class="form-label">Result</label>
                                    <select class="form-control" id="editResult">
                                        <option value="pending">Pending</option>
                                        <option value="win">Win</option>
                                        <option value="loss">Loss</option>
                                        <option value="void">Void</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveEditedPrediction()">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('editPredictionModal');
    }
    
    // Попълваме формата с данните на прогнозата
    document.getElementById('editPredictionId').value = prediction._id;
    
    // Форматираме датата за input type="date"
    const date = new Date(prediction.matchDate);
    const formattedDate = date.toISOString().split('T')[0];
    document.getElementById('editMatchDate').value = formattedDate;
    
    document.getElementById('editLeagueFlag').value = prediction.league?.flag || prediction.leagueFlag || '';
    document.getElementById('editHomeTeam').value = prediction.homeTeam || '';
    document.getElementById('editAwayTeam').value = prediction.awayTeam || '';
    document.getElementById('editPrediction').value = prediction.prediction || '';
    document.getElementById('editOdds').value = prediction.odds || '';
    document.getElementById('editResult').value = prediction.result || 'pending';
    
    // Показваме модала
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Запазване на редактираната прогноза
window.saveEditedPrediction = async function() {
    try {
        console.log('Saving edited prediction...');
        const id = document.getElementById('editPredictionId').value;
        const matchDate = document.getElementById('editMatchDate').value;
        const oddsValue = document.getElementById('editOdds').value;
        
        const formData = {
            matchDate: matchDate,
            homeTeam: document.getElementById('editHomeTeam').value,
            awayTeam: document.getElementById('editAwayTeam').value,
            league: {
                name: 'League',
                flag: document.getElementById('editLeagueFlag').value.trim()
            },
            leagueFlag: document.getElementById('editLeagueFlag').value.trim(),
            prediction: document.getElementById('editPrediction').value,
            odds: oddsValue ? parseFloat(oddsValue) : null,
            result: document.getElementById('editResult').value
        };
        
        console.log('Form data:', formData);
        
        const response = await fetch(`/api/predictions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Update failed:', error);
            throw new Error(error.message || 'Failed to update prediction');
        }
        
        console.log('Update successful');
        Toast.success('Prediction updated successfully! ✅');
        
        // Затваряме модала
        const modal = bootstrap.Modal.getInstance(document.getElementById('editPredictionModal'));
        if (modal) modal.hide();
        
        // Презареждаме прогнозите
        await loadAdminPredictions();
    } catch (error) {
        console.error('Error updating prediction:', error);
        Toast.error('Failed to update prediction: ' + error.message);
    }
}