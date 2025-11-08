// Get token (will be checked in DOMContentLoaded)
let token = localStorage.getItem('token') || sessionStorage.getItem('token');

function clearInput() {
    document.getElementById('jsonInput').value = '';
    document.getElementById('resultBox').style.display = 'none';
}

async function importPredictions() {
    console.log('importPredictions function called');
    
    const jsonInput = document.getElementById('jsonInput').value.trim();
    console.log('JSON input length:', jsonInput.length);
    
    const importBtn = document.getElementById('importBtn');
    const resultBox = document.getElementById('resultBox');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const resultDetails = document.getElementById('resultDetails');

    // Validate input
    if (!jsonInput) {
        console.log('No JSON input provided');
        showResult('error', 'Грешка', 'Моля, paste-ни JSON данни');
        return;
    }

    // Parse JSON
    let data;
    try {
        data = JSON.parse(jsonInput);
        console.log('JSON parsed successfully:', data);
    } catch (error) {
        console.error('JSON parse error:', error);
        showResult('error', 'Невалиден JSON', `Грешка при парсване: ${error.message}`);
        return;
    }

    // Validate structure
    if (!data.predictions || !Array.isArray(data.predictions)) {
        console.error('Invalid structure - no predictions array');
        showResult('error', 'Невалидна структура', 'JSON трябва да съдържа "predictions" array');
        return;
    }

    if (data.predictions.length === 0) {
        console.error('Empty predictions array');
        showResult('error', 'Празен масив', 'Няма прогнози за импортиране');
        return;
    }

    console.log(`Importing ${data.predictions.length} predictions`);

    // Disable button
    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Importing...';

    try {
        console.log('Sending POST request to /api/predictions');
        const response = await fetch('/api/predictions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);

        if (response.ok) {
            let detailsHTML = `
                <div class="mt-3">
                    <div class="alert alert-success">
                        <strong>✅ Успешно импортирани: ${result.success}</strong>
                    </div>
            `;

            if (result.failed > 0) {
                detailsHTML += `
                    <div class="alert alert-warning">
                        <strong>⚠️ Неуспешни: ${result.failed}</strong>
                        <ul class="mt-2 mb-0">
                `;
                result.failedItems.forEach(item => {
                    detailsHTML += `<li>${item.error}: ${JSON.stringify(item.data)}</li>`;
                });
                detailsHTML += `</ul></div>`;
            }

            detailsHTML += `
                    <div class="mt-3">
                        <a href="/admin.html" class="btn btn-primary">
                            <i class="bi bi-eye"></i> Виж прогнозите
                        </a>
                        <a href="/" class="btn btn-outline-light ms-2" target="_blank">
                            <i class="bi bi-globe"></i> Виж сайта
                        </a>
                    </div>
                </div>
            `;

            showResult('success', 'Успешен импорт!', result.message, detailsHTML);
            
            // Clear input after 3 seconds
            setTimeout(() => {
                document.getElementById('jsonInput').value = '';
            }, 3000);
        } else {
            showResult('error', 'Грешка при импорт', result.message || 'Неизвестна грешка');
        }
    } catch (error) {
        showResult('error', 'Грешка при заявката', error.message);
    } finally {
        // Re-enable button
        importBtn.disabled = false;
        importBtn.innerHTML = '<i class="bi bi-upload"></i> Import Predictions';
    }
}

function showResult(type, title, message, details = '') {
    const resultBox = document.getElementById('resultBox');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const resultDetails = document.getElementById('resultDetails');

    resultBox.className = `result-box ${type}`;
    resultTitle.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'x-circle'}"></i> ${title}`;
    resultMessage.textContent = message;
    resultDetails.innerHTML = details;
    resultBox.style.display = 'block';

    // Scroll to result
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deleteByDate() {
    const dateInput = document.getElementById('deleteDate');
    const selectedDate = dateInput.value;

    if (!selectedDate) {
        showDeleteResult('error', 'Грешка', 'Моля, избери дата');
        return;
    }

    // Confirm deletion
    const confirmMsg = `Сигурен ли си, че искаш да изтриеш ВСИЧКИ прогнози за ${selectedDate}?\n\nТова действие не може да бъде отменено!`;
    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const response = await fetch(`/api/predictions/delete-by-date?date=${selectedDate}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            showDeleteResult('success', 'Успешно изтриване!', `Изтрити ${result.deletedCount} прогнози за ${selectedDate}`);
            dateInput.value = '';
        } else {
            showDeleteResult('error', 'Грешка', result.message || 'Неуспешно изтриване');
        }
    } catch (error) {
        showDeleteResult('error', 'Грешка при заявката', error.message);
    }
}

function showDeleteResult(type, title, message) {
    const deleteResultBox = document.getElementById('deleteResultBox');
    const deleteResultTitle = document.getElementById('deleteResultTitle');
    const deleteResultMessage = document.getElementById('deleteResultMessage');

    deleteResultBox.className = `result-box mt-3 ${type}`;
    deleteResultTitle.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'x-circle'}"></i> ${title}`;
    deleteResultMessage.textContent = message;
    deleteResultBox.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        deleteResultBox.style.display = 'none';
    }, 5000);
}

function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '/';
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing bulk-import.js');
    
    // Check authentication
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    console.log('Token found, setting up event listeners');
    
    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        console.log('Clear button found, adding listener');
        clearBtn.addEventListener('click', clearInput);
    } else {
        console.error('Clear button NOT found');
    }

    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        console.log('Import button found, adding listener');
        importBtn.addEventListener('click', function(e) {
            console.log('Import button clicked!');
            importPredictions();
        });
    } else {
        console.error('Import button NOT found');
    }

    // Delete by date button
    const deleteDateBtn = document.getElementById('deleteDateBtn');
    if (deleteDateBtn) {
        console.log('Delete button found, adding listener');
        deleteDateBtn.addEventListener('click', deleteByDate);
    } else {
        console.error('Delete button NOT found');
    }

    // Logout link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        console.log('Logout link found, adding listener');
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    } else {
        console.error('Logout link NOT found');
    }
    
    console.log('All event listeners set up successfully');
});
