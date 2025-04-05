document.addEventListener('DOMContentLoaded', () => {
    loadPredictions();
});

async function loadPredictions() {
    try {
        const response = await fetch('/api/predictions');
        const predictions = await response.json();
        
        console.log('Received predictions:', predictions);
        
        // Сортиране по дата (най-новите най-отгоре)
        predictions.sort((a, b) => {
            const dateA = new Date(a.matchDate);
            const dateB = new Date(b.matchDate);
            return dateB.getTime() - dateA.getTime();
        });
        
        const tbody = document.getElementById('predictions-body');
        tbody.innerHTML = '';
        
        let currentDate = '';
        
        predictions.forEach(prediction => {
            // Проверка за валидност на данните
            if (!prediction || !prediction.league) {
                console.error('Invalid prediction data:', prediction);
                return; // Пропускаме невалидните записи
            }

            const date = new Date(prediction.matchDate);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
            });
            
            const dateString = date.toISOString().split('T')[0];
            if (currentDate !== dateString) {
                currentDate = dateString;
                const dateRow = document.createElement('tr');
                dateRow.className = 'date-separator';
                dateRow.innerHTML = `
                    <td colspan="5" style="padding: 0.5rem 1rem; font-weight: 600;">
                        ${formattedDate}
                    </td>
                `;
                tbody.appendChild(dateRow);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td><span class="team-flag">${prediction.league?.flag || ''}</span></td>
                <td>${prediction.homeTeam || ''}</td>
                <td>${prediction.awayTeam || ''}</td>
                <td>${prediction.prediction || ''}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading predictions:', error);
    }
} 