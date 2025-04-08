document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, calling loadPredictions()');
    console.log('Looking for element with ID "predictions-body":', document.getElementById('predictions-body'));
    
    // Инициализираме елементите за индикатор и грешка
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    const lastUpdated = document.getElementById('last-updated');
    
    // Актуализираме времето на последно зареждане
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString();
    }
    
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            // Скриваме съобщението за грешка
            if (errorMessage) errorMessage.style.display = 'none';
            // Показваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            // Опитваме да заредим прогнозите отново
            window.location.reload(); // Презареждаме страницата вместо само loadPredictions()
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
    if (predictionsBody) {
        // Проверяваме дали има деца, които не са само празни текстови възли
        const hasRealContent = Array.from(predictionsBody.childNodes).some(node => {
            // Проверяваме дали възелът е елемент или текст, който не е само интервали
            return node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim() !== '');
        });
        
        if (hasRealContent) {
            console.log(`Found content in the predictions table`);
            
            // Скриваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            // Скриваме съобщението за грешка
            if (errorMessage) errorMessage.style.display = 'none';
            // Показваме таблицата
            if (predictionsTable) predictionsTable.style.display = 'block';
            
            return; // Прекратяваме изпълнението, тъй като данните вече са заредени
        }
    }
    
    // Ако няма съдържание в таблицата, проверяваме дали плейсхолдерът все още съществува
    const htmlContent = document.documentElement.innerHTML;
    
    // Проверяваме дали има плейсхолдер
    const hasNewPlaceholder = htmlContent.includes('<!-- PREDICTIONS_PLACEHOLDER -->');
    const hasOldPlaceholder = htmlContent.includes('<!-- Predictions will be loaded here -->');
    
    if (hasNewPlaceholder || hasOldPlaceholder) {
        // Плейсхолдерът все още съществува, което означава, че сървърът не е заменил данните
        console.log('Placeholder still exists, server did not replace predictions');
        console.log('New placeholder exists:', hasNewPlaceholder);
        console.log('Old placeholder exists:', hasOldPlaceholder);
        
        // Вместо да презареждаме страницата, показваме тестови данни
        if (predictionsBody) {
            // Добавяме тестови данни директно в таблицата
            predictionsBody.innerHTML = `
                <tr class="date-separator">
                    <td colspan="5">08/04 <span style="opacity: 0.8; margin-left: 5px;">April</span></td>
                </tr>
                <tr>
                    <td>08/04</td>
                    <td><span class="team-flag">🇬🇧</span></td>
                    <td>Arsenal</td>
                    <td>Chelsea</td>
                    <td class="prediction-cell">BTTS & Over 2.5</td>
                </tr>
                <tr>
                    <td>08/04</td>
                    <td><span class="team-flag">🇪🇸</span></td>
                    <td>Barcelona</td>
                    <td>Real Madrid</td>
                    <td class="prediction-cell">1X & Over 1.5</td>
                </tr>
            `;
            
            // Скриваме индикатора за зареждане
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Показваме съобщение за грешка с полезна информация
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.querySelector('p').innerHTML = 'Показваме тестови данни. Сървърът не може да замени плейсхолдера в HTML.';
            }
            
            return;
        }
    }
    
    console.log('No predictions found in the table');
    
    // Скриваме индикатора за зареждане
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    // Показваме съобщение за грешка
    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.querySelector('p').textContent = 'No predictions data available.';
    }
}