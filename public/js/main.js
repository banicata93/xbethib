document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, calling loadPredictions()');
    
    // Инициализираме елементите за индикатор и грешка
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    
    // Премахваме елемента за последно обновяване
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = 'none';
    }
    
    // Премахваме navbar-toggler-icon
    const navbarTogglerIcon = document.querySelector('.navbar-toggler-icon');
    if (navbarTogglerIcon) {
        navbarTogglerIcon.style.display = 'none';
    }
    
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            // Скриваме съобщението за грешка
            if (errorMessage) errorMessage.style.display = 'none';
            // Показваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            // Опитваме да заредим прогнозите отново
            setTimeout(() => {
                loadPredictions();
            }, 1000);
        });
    }
    
    // Обновяваме заглавието на страницата, за да включва текущата дата
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const pageTitle = document.querySelector('.predictions-container h1');
    if (pageTitle) {
        pageTitle.textContent = `Predictions (${formattedDate})`;
    }
    
    loadPredictions();
});

function loadPredictions() {
    console.log('loadPredictions function called');
    
    // Вземаме референции към елементите
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const predictionsTable = document.getElementById('predictions-table');
    const predictionsBody = document.getElementById('predictions-body');
    
    // Показваме индикатора за зареждане
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    // Скриваме съобщението за грешка
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Правим две паралелни заявки
    Promise.all([
        fetch('/api/predictions/public').then(response => response.ok ? response.json() : []),
        fetch('/api/botPredictions/public').then(response => response.ok ? response.json() : [])
    ])
    .then(([regularPredictions, botPredictions]) => {
        console.log('Fetched regular predictions:', regularPredictions.length);
        console.log('Fetched bot predictions:', botPredictions.length);
        
        // Скриваме индикатора за зареждане
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Обединяваме всички прогнози в един масив
        const allPredictions = [...regularPredictions, ...botPredictions];
        
        // Проверяваме дали има прогнози
        if (!allPredictions || allPredictions.length === 0) {
            console.log('No predictions found');
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.querySelector('p').textContent = 'No predictions available.';
            }
            return;
        }
        
        // Филтрираме прогнозите, за да показваме само тези от последните 2 дни и бъдещите
        const now = new Date();
        const twoDaysAgo = new Date(now);
        twoDaysAgo.setDate(now.getDate() - 2);
        twoDaysAgo.setHours(0, 0, 0, 0); // Задаваме началото на деня отпреди 2 дни
        
        console.log('Filtering predictions from:', twoDaysAgo.toISOString());
        
        const filteredPredictions = allPredictions.filter(prediction => {
            const matchDate = new Date(prediction.matchDate);
            return matchDate >= twoDaysAgo;
        });
        
        console.log('Filtered predictions count:', filteredPredictions.length);
        
        // Сортираме прогнозите по дата (най-скорошните първи)
        filteredPredictions.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
        
        // Показваме таблицата
        if (predictionsTable) predictionsTable.style.display = 'block';
        
        // Изчистваме съдържанието на таблицата
        if (predictionsBody) {
            predictionsBody.innerHTML = '';
            
            // Групираме прогнозите по дата
            const groupedPredictions = {};
            filteredPredictions.forEach(prediction => {
                const date = new Date(prediction.matchDate);
                // Форматираме датата правилно, с коректния ден и месец
                const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!groupedPredictions[dateKey]) {
                    groupedPredictions[dateKey] = [];
                }
                
                groupedPredictions[dateKey].push(prediction);
            });
            
            // Добавяме прогнозите в таблицата
            let isAdInserted = false;
            
            Object.keys(groupedPredictions).forEach((dateKey, index) => {
                // Добавяме разделител за датата
                const dateSeparator = document.createElement('tr');
                dateSeparator.className = 'date-separator';
                dateSeparator.innerHTML = `<td colspan="4">${dateKey} <span style="opacity: 0.8; margin-left: 5px;">${new Date(groupedPredictions[dateKey][0].matchDate).toLocaleString('default', { month: 'long' })}</span></td>`;
                predictionsBody.appendChild(dateSeparator);
                
                // Добавяме прогнозите за тази дата
                groupedPredictions[dateKey].forEach(prediction => {
                    // Разделяме прогнозата на отделни тагове
                    let predictionTags = [];
                    if (prediction.prediction && prediction.prediction.includes('&')) {
                        predictionTags = prediction.prediction.split('&').map(tag => tag.trim());
                    } else if (prediction.prediction) {
                        predictionTags = [prediction.prediction];
                    } else {
                        predictionTags = ['N/A'];
                    }
                    
                    // Създаваме HTML за таговете
                    const tagsHTML = predictionTags.map(tag => {
                        // Добавяме индикатор за увереност
                        let confidenceHTML = '';
                        if (prediction.confidence && prediction.confidence > 0) {
                            let confidenceClass = 'confidence-medium';
                            if (prediction.confidence >= 80) {
                                confidenceClass = 'confidence-high';
                            } else if (prediction.confidence < 60) {
                                confidenceClass = 'confidence-low';
                            }
                            confidenceHTML = `<span class="confidence-indicator ${confidenceClass}">${prediction.confidence}%</span>`;
                        }
                        
                        return `<span class="prediction-tag">${tag} ${confidenceHTML}</span>`;
                    }).join('');
                    
                    // Добавяме клас за източника на прогнозата
                    const sourceClass = prediction.source === 'FootballBot' ? 'bot-prediction' : '';
                    
                    const row = document.createElement('tr');
                    row.className = sourceClass;
                    row.innerHTML = `
                        <td><span class="team-flag">${prediction.leagueFlag || '🌍'}</span></td>
                        <td>${prediction.homeTeam || 'Unknown'}</td>
                        <td>${prediction.awayTeam || 'Unknown'}</td>
                        <td class="prediction-cell">${tagsHTML}</td>
                    `;
                    predictionsBody.appendChild(row);
                });
                
                // Добавяме рекламата след първата дата
                if (index === 0 && !isAdInserted && window.innerWidth <= 768) {
                    isAdInserted = true;
                    
                    // Създаваме ред за рекламата
                    const adRow = document.createElement('tr');
                    adRow.className = 'in-table-ad-row d-md-none';
                    adRow.innerHTML = `
                        <td colspan="4" class="p-0">
                            <div class="in-table-ad">
                                <a href="https://www.goleadortips.com" target="_blank" class="in-table-ad-link">
                                    <div class="in-table-ad-content">
                                        <div class="in-table-ad-icon">
                                            <i class="fas fa-futbol"></i>
                                        </div>
                                        <div class="in-table-ad-text">
                                            <div class="in-table-ad-title">GoleadorTips</div>
                                            <div class="in-table-ad-description">Expert Football Predictions</div>
                                        </div>
                                        <div class="in-table-ad-button">
                                            <span>Visit Now</span>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </td>
                    `;
                    predictionsBody.appendChild(adRow);
                }
            });
        }
    })
    .catch(error => {
        console.error('Error loading predictions:', error);
        
        // Скриваме индикатора за зареждане
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Показваме съобщение за грешка
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.querySelector('p').textContent = 'There was a problem loading predictions. Please try again later.';
        }
    });
}