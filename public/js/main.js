document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, calling loadPredictions()');
    console.log('Looking for element with ID "predictions-body":', document.getElementById('predictions-body'));
    
    // Инициализираме елементите за индикатор и грешка
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            // Скриваме съобщението за грешка
            if (errorMessage) errorMessage.style.display = 'none';
            // Показваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            // Опитваме да заредим прогнозите отново
            loadPredictions();
        });
    }
    
    loadPredictions();
});

function loadPredictions() {
    console.log('loadPredictions function called');
    
    // Вземаме референции към елементите за индикатор и грешка
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const predictionsTable = document.getElementById('predictions-table');
    
    // Показваме индикатора за зареждане
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    // Скриваме съобщението за грешка
    if (errorMessage) errorMessage.style.display = 'none';
    // Скриваме таблицата докато зареждаме данните
    if (predictionsTable) predictionsTable.style.display = 'none';
    
    try {
        console.log('Using embedded predictions data');
        
        // Използваме вградените данни вместо API заявка
        let predictionsArray = [];
        
        if (window.PREDICTIONS_DATA && Array.isArray(window.PREDICTIONS_DATA)) {
            console.log(`Found ${window.PREDICTIONS_DATA.length} embedded predictions`);
            predictionsArray = window.PREDICTIONS_DATA;
            
            // Сортиране по дата (най-новите най-отгоре)
            predictionsArray.sort((a, b) => {
                const dateA = new Date(a.matchDate);
                const dateB = new Date(b.matchDate);
                return dateB.getTime() - dateA.getTime();
            });
        } else {
            console.warn('No embedded predictions data found or data is not an array');
            // Ако няма вградени данни, показваме съобщение за грешка
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.querySelector('p').textContent = 'No predictions data available.';
            }
            // Скриваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }
        
        const tbody = document.getElementById('predictions-body');
        if (!tbody) {
            console.error('Predictions table body not found!');
            // Показваме съобщение за грешка
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.querySelector('p').textContent = 'Error: Predictions table not found!';
            }
            // Скриваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }
        
        tbody.innerHTML = '';
        
        if (predictionsArray.length === 0) {
            console.log('No predictions found');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No predictions available</td></tr>';
            // Показваме таблицата, дори и празна
            if (predictionsTable) predictionsTable.style.display = 'table';
            // Скриваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }
        
        let currentDate = '';
        
        predictionsArray.forEach(prediction => {
            // Проверка за валидност на данните
            if (!prediction) {
                console.error('Invalid prediction data:', prediction);
                return; // Пропускаме невалидните записи
            }

            const date = new Date(prediction.matchDate);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
            });
            
            // Добавяме и името на месеца за по-елегантна визуализация
            const monthName = date.toLocaleDateString('en-GB', { month: 'long' });
            
            const dateString = date.toISOString().split('T')[0];
            if (currentDate !== dateString) {
                currentDate = dateString;
                const dateRow = document.createElement('tr');
                dateRow.className = 'date-separator';
                dateRow.innerHTML = `
                    <td colspan="5">
                        ${formattedDate} <span style="opacity: 0.8; margin-left: 5px;">${monthName}</span>
                    </td>
                `;
                tbody.appendChild(dateRow);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td><span class="team-flag">${prediction.leagueFlag || ''}</span></td>
                <td>${prediction.homeTeam || 'Отбор 1'}</td>
                <td>${prediction.awayTeam || 'Отбор 2'}</td>
                <td class="prediction-cell">${prediction.prediction || ''}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Показваме таблицата след успешно зареждане
        if (predictionsTable) predictionsTable.style.display = 'table';
        // Скриваме индикатора за зареждане
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading predictions:', error);
        
        // Показваме съобщение за грешка
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.querySelector('p').textContent = `Error loading predictions: ${error.message}`;
        }
        
        // Скриваме индикатора за зареждане
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
} 