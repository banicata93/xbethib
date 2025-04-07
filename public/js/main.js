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

async function loadPredictions() {
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
        // Добавяме текущото време за да избегнем кеширане
        const timestamp = new Date().getTime();
        
        // Определяме базовия URL според текущия домейн
        let baseUrl = '';
        // Ако сме на домейна xbethub.com, използваме абсолютен URL към Render
        if (window.location.hostname === 'xbethub.com' || window.location.hostname === 'www.xbethub.com') {
            baseUrl = 'https://xbethub-tyiz.onrender.com';
            console.log('Using absolute URL to Render for API calls');
        }
        
        const apiUrl = `${baseUrl}/api/predictions/public?_=${timestamp}`;
        console.log(`Fetching predictions from: ${apiUrl}`);
        
        // Добавяме пълни опции за заявката
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const predictions = await response.json();
        
        console.log('Received predictions:', predictions);
        
        // Проверка дали predictions е масив
        let predictionsArray = [];
        if (!Array.isArray(predictions)) {
            console.error('Predictions is not an array:', predictions);
            if (predictions.message) {
                console.error('API error message:', predictions.message);
            }
        } else {
            predictionsArray = predictions;
            // Сортиране по дата (най-новите най-отгоре)
            predictionsArray.sort((a, b) => {
                const dateA = new Date(a.matchDate);
                const dateB = new Date(b.matchDate);
                return dateB.getTime() - dateA.getTime();
            });
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