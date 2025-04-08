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
    const predictionsBody = document.getElementById('predictions-body');
    
    // Проверяваме дали има съдържание в таблицата
    if (predictionsBody && predictionsBody.children.length > 0) {
        console.log(`Found ${predictionsBody.children.length} predictions in the table`);
        
        // Скриваме индикатора за зареждане
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        // Скриваме съобщението за грешка
        if (errorMessage) errorMessage.style.display = 'none';
        // Показваме таблицата
        if (predictionsTable) predictionsTable.style.display = 'block';
        
        return; // Прекратяваме изпълнението, тъй като данните вече са заредени
    }
    
    // Ако няма съдържание в таблицата, показваме съобщение
    console.log('No predictions found in the table');
    
    // Скриваме индикатора за зареждане
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    // Показваме съобщение за грешка
    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.querySelector('p').textContent = 'No predictions data available.';
    }
}