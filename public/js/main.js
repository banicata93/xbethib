document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, calling loadPredictions()');
    console.log('Looking for element with ID "predictions-body":', document.getElementById('predictions-body'));
    
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
    
    // Стилизираме езиковите елементи
    const languageElements = document.querySelectorAll('td');
    languageElements.forEach(el => {
        if (el.textContent === 'Fr' || el.textContent === 'En') {
            el.classList.add('text-center');
            el.innerHTML = `<span class="language-element">${el.textContent}</span>`;
        }
    });
    
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            // Скриваме съобщението за грешка
            if (errorMessage) errorMessage.style.display = 'none';
            // Показваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            // Опитваме да заредим прогнозите отново
            // Вместо да презареждаме страницата, просто извикваме loadPredictions()
            setTimeout(() => {
                loadPredictions();
            }, 1000);
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
    const predictionsBody = document.getElementById('predictions-body');
    const lastUpdated = document.getElementById('last-updated');
    
    // Показваме индикатора за зареждане
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    // Скриваме съобщението за грешка
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Премахнато обновяване на времето
    
    // Правим заявка към API за прогнозите
    fetch('/api/predictions/public')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch predictions');
            }
            return response.json();
        })
        .then(predictions => {
            console.log('Fetched predictions:', predictions);
            
            // Скриваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Проверяваме дали има прогнози
            if (!predictions || predictions.length === 0) {
                console.log('No predictions found');
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    errorMessage.querySelector('p').textContent = 'No predictions available.';
                }
                return;
            }
            
            // Показваме таблицата
            if (predictionsTable) predictionsTable.style.display = 'block';
            
            // Изчистваме съдържанието на таблицата
            if (predictionsBody) {
                predictionsBody.innerHTML = '';
                
                // Групираме прогнозите по дата
                const groupedPredictions = {};
                predictions.forEach(prediction => {
                    const date = new Date(prediction.matchDate);
                    const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    
                    if (!groupedPredictions[dateKey]) {
                        groupedPredictions[dateKey] = [];
                    }
                    
                    groupedPredictions[dateKey].push(prediction);
                });
                
                // Добавяме прогнозите в таблицата
                let isAdInserted = false; // Флаг за проверка дали рекламата е вече вмъкната
                
                Object.keys(groupedPredictions).forEach((dateKey, index) => {
                    // Добавяме разделител за датата
                    const dateSeparator = document.createElement('tr');
                    dateSeparator.className = 'date-separator';
                    dateSeparator.innerHTML = `<td colspan="4">${dateKey} <span style="opacity: 0.8; margin-left: 5px;">${new Date(groupedPredictions[dateKey][0].matchDate).toLocaleString('default', { month: 'long' })}</span></td>`;
                    predictionsBody.appendChild(dateSeparator);
                    
                    // Добавяме прогнозите за тази дата
                    groupedPredictions[dateKey].forEach(prediction => {
                        // Разделяме прогнозата на отделни тагове
                        const predictionTags = prediction.prediction.split('&').map(tag => tag.trim());
                        
                        // Създаваме HTML за таговете
                        const tagsHTML = predictionTags.map(tag => `<span class="prediction-tag">${tag}</span>`).join('');
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><span class="team-flag">${prediction.leagueFlag}</span></td>
                            <td>${prediction.homeTeam}</td>
                            <td>${prediction.awayTeam}</td>
                            <td class="prediction-cell">${tagsHTML}</td>
                        `;
                        predictionsBody.appendChild(row);
                    });
                    
                    // Добавяме рекламата след първата дата и само на мобилни устройства
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