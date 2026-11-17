// Make token globally accessible
window.token = null;
let token = null;

console.log('🚀 Admin.js loaded! Version: prediction-composer-2');

const pendingPredictionForms = new WeakSet();

function setPredictionSubmitStatus(form, state, message, needsLogin = false) {
    const status = form.querySelector('#predictionSubmitStatus');
    if (status) {
        status.textContent = message;
        status.dataset.state = state;
        status.hidden = !message;
    }
    const loginLink = form.querySelector('#predictionLoginLink');
    if (loginLink) loginLink.hidden = !needsLogin;
}

function notifyPredictionSubmit(type, message) {
    // Inline feedback must still work if the optional toast library fails.
    try { window.Toast?.[type]?.(message); } catch (_) {}
}

function predictionSaveError(status, data) {
    if (status === 401) return 'Сесията за вход е изтекла или не е валидна. Влез отново и опитай пак.';
    if (status === 403) return 'Няма разрешение за запис. Влез отново и опитай пак.';
    if (status === 429) return 'Има твърде много заявки. Изчакай малко и опитай отново.';
    if (status >= 500) return 'Сървърът не потвърди записа. Провери списъка с прогнози, преди да опиташ отново.';
    const messages = {
        matchDate: 'Избери валидна дата за мача.',
        homeTeam: 'Името на домакина трябва да съдържа между 2 и 100 знака.',
        awayTeam: 'Името на госта трябва да съдържа между 2 и 100 знака.',
        leagueFlag: 'Избери държава или лига от League Flag.',
        prediction: 'Избери прогноза или въведи ръчен текст до 200 знака.'
    };
    const details = Array.isArray(data?.errors)
        ? [...new Set(data.errors.map(error => messages[error?.field]).filter(Boolean))] : [];
    return details.join(' ') || 'Сървърът не прие прогнозата. Провери полетата и опитай отново.';
}

function initializePredictionSubmitFeedback(form) {
    const requiredMessages = {
        matchDate: 'Избери валидна дата за мача.',
        leagueFlag: 'Избери държава или лига от League Flag.',
        homeTeam: 'Попълни отбора домакин.',
        awayTeam: 'Попълни гостуващия отбор.',
        manualPrediction: 'Въведи ръчна прогноза до 200 знака.'
    };
    form.addEventListener('invalid', event => {
        setPredictionSubmitStatus(form, 'error', requiredMessages[event.target.id] || 'Провери задължителните полета.');
    }, true);
    form.addEventListener('reset', () => setPredictionSubmitStatus(form, '', ''));
}

// Global helper functions for date and prediction buttons
window.setTodayDate = function() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;
    document.getElementById('matchDate').value = todayString;
};

window.setTomorrowDate = function() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowString = `${yyyy}-${mm}-${dd}`;
    document.getElementById('matchDate').value = tomorrowString;
};

window.setPrediction = function(value) {
    const composer = window.PredictionComposer?.get(document.getElementById('predictionForm'));
    if (composer) composer.setManualValue(value);
    else document.getElementById('prediction').value = value;
};

window.logout = function() {
    localStorage.removeItem('token');
    window.location.href = '/login';
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOMContentLoaded event fired');
    // Get token from localStorage or sessionStorage
    token = localStorage.getItem('token') || sessionStorage.getItem('token');
    window.token = token;
    console.log('🔑 Token loaded:', token ? 'YES' : 'NO');
    
    const predictionForm = document.getElementById('predictionForm');
    
    if (!token) {
        setTimeout(() => {
            window.location.href = '/login';
        }, 500);
        return;
    }

    // Load predictions when page loads
    loadAdminPredictions();
    
    // Set today's date as default
    window.setTodayDate();
    
    if (predictionForm) {
        window.PredictionComposer.initialize(predictionForm);
        initializePredictionSubmitFeedback(predictionForm);
        predictionForm.addEventListener('submit', window.handleAddPrediction);
    }
    
    // Event delegation for dynamically created buttons
    document.addEventListener('click', function(e) {
        // Delete button
        if (e.target.closest('.delete-prediction-btn')) {
            const btn = e.target.closest('.delete-prediction-btn');
            const id = btn.dataset.id;
            console.log('🗑️ Delete button clicked via event delegation, ID:', id);
            window.deletePrediction(id);
        }
        
        // Edit button
        if (e.target.closest('.edit-prediction-btn')) {
            const btn = e.target.closest('.edit-prediction-btn');
            const id = btn.dataset.id;
            console.log('✏️ Edit button clicked via event delegation, ID:', id);
            window.editPrediction(id);
        }
        
        // Mark result buttons
        if (e.target.closest('.mark-result-btn')) {
            const btn = e.target.closest('.mark-result-btn');
            const id = btn.dataset.id;
            const result = btn.dataset.result;
            console.log('📊 Mark result button clicked via event delegation, ID:', id, 'Result:', result);
            window.markResult(id, result);
        }
    });
});

window.handleAddPrediction = async function(e) {
    e.preventDefault();
    const form = e.currentTarget || e.target;
    if (pendingPredictionForms.has(form)) return;
    const composer = window.PredictionComposer?.get(form);
    if (!composer) {
        setPredictionSubmitStatus(form, 'error', 'Формата не е заредена правилно. Презареди страницата.');
        return;
    }
    if (!composer.validate()) {
        setPredictionSubmitStatus(form, 'error', 'Избери поне една опция или въведи прогноза ръчно.');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const buttonContent = submitButton?.innerHTML;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    pendingPredictionForms.add(form);
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
        submitButton.textContent = 'Записване…';
    }
    setPredictionSubmitStatus(form, 'pending', 'Записвам прогнозата…');
    try {
        const formData = {
            matchDate: form.querySelector('#matchDate').value,
            homeTeam: form.querySelector('#homeTeam').value,
            awayTeam: form.querySelector('#awayTeam').value,
            leagueFlag: form.querySelector('#leagueFlag').value.trim(),
            prediction: composer.getValue()
        };
        const response = await fetch('/api/predictions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData),
            signal: controller.signal
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const message = predictionSaveError(response.status, data);
            setPredictionSubmitStatus(form, 'error', message, response.status === 401 || response.status === 403);
            notifyPredictionSubmit('error', message);
            return;
        }
        if (!data || !data._id) {
            const message = 'Записът не е потвърден. Провери списъка с прогнози, преди да опиташ отново.';
            setPredictionSubmitStatus(form, 'error', message);
            notifyPredictionSubmit('error', message);
            return;
        }
        form.reset();
        setPredictionSubmitStatus(form, 'success', 'Прогнозата е записана успешно.');
        notifyPredictionSubmit('success', 'Прогнозата е записана успешно.');
        loadAdminPredictions();
    } catch (_) {
        const message = 'Няма потвърждение за записа. Провери връзката и списъка с прогнози, преди да опиташ отново.';
        setPredictionSubmitStatus(form, 'error', message);
        notifyPredictionSubmit('error', message);
    } finally {
        clearTimeout(timeout);
        pendingPredictionForms.delete(form);
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute('aria-busy');
            submitButton.innerHTML = buttonContent;
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
                        <button class="btn btn-success btn-sm me-1 mb-1 mark-result-btn" data-id="${prediction._id}" data-result="win" title="Mark as Win">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button class="btn btn-danger btn-sm me-1 mb-1 mark-result-btn" data-id="${prediction._id}" data-result="loss" title="Mark as Loss">
                            <i class="bi bi-x-circle"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm me-1 mb-1 mark-result-btn" data-id="${prediction._id}" data-result="void" title="Mark as Void">
                            <i class="bi bi-slash-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-warning btn-sm me-1 mb-1 edit-prediction-btn" data-id="${prediction._id}" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm mb-1 delete-prediction-btn" data-id="${prediction._id}" title="Delete">
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
    console.log('🗑️ Delete button clicked for ID:', id);
    if (!confirm('Are you sure you want to delete this prediction?')) {
        console.log('❌ User cancelled delete');
        return;
    }

    try {
        const token = window.token || localStorage.getItem('token');
        console.log('🔑 Using token:', token ? 'YES' : 'NO');
        console.log('📡 Sending DELETE request to:', `/api/predictions/${id}`);
        
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

        Toast.success('Prediction deleted successfully! 🗑️');
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

        const resultEmojis = {
            'win': '✅',
            'loss': '❌',
            'void': '🚫'
        };
        Toast.success(`Result updated to ${result.toUpperCase()} ${resultEmojis[result] || ''}`);
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
        const token = window.token || localStorage.getItem('token');
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
                                    <label for="editLeagueFlag" class="form-label">League Flag</label>
                                    <input type="text" class="form-control" id="editLeagueFlag" placeholder="🇬🇧">
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
                            <button type="button" class="btn btn-primary" id="saveEditedPredictionBtn">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('editPredictionModal');
        
        // Add event listener to Save button
        document.getElementById('saveEditedPredictionBtn').addEventListener('click', window.saveEditedPrediction);
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
            leagueFlag: document.getElementById('editLeagueFlag').value.trim(),
            prediction: document.getElementById('editPrediction').value,
            odds: oddsValue ? parseFloat(oddsValue) : null,
            result: document.getElementById('editResult').value
        };
        
        console.log('Form data:', formData);
        
        const token = window.token || localStorage.getItem('token');
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