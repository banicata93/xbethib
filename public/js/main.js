document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, calling loadPredictions()');
    console.log('Looking for element with ID "predictions-body":', document.getElementById('predictions-body'));
    loadPredictions();
});

async function loadPredictions() {
    console.log('loadPredictions function called');
    try {
        console.log('Fetching predictions from public API endpoint');
        const response = await fetch('/api/predictions/public');
        console.log('API response status:', response.status);
        const predictions = await response.json();
        
        console.log('Received predictions:', predictions);
        
        // Сортиране по дата (най-новите най-отгоре)
        // Забележка: Сървърът вече връща сортирани прогнози, но за всеки случай сортираме и тук
        predictions.sort((a, b) => {
            const dateA = new Date(a.matchDate);
            const dateB = new Date(b.matchDate);
            return dateB.getTime() - dateA.getTime();
        });
        
        const tbody = document.getElementById('predictions-body');
        if (!tbody) {
            console.error('Predictions table body not found!');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (predictions.length === 0) {
            console.log('No predictions found');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No predictions available</td></tr>';
            return;
        }
        
        let currentDate = '';
        
        predictions.forEach(prediction => {
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
    } catch (error) {
        console.error('Error loading predictions:', error);
    }
} 