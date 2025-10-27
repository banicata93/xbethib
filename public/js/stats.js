// Зареждане на статистика
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Update stats display
        document.getElementById('total-predictions').textContent = stats.count || 0;
        document.getElementById('win-rate').textContent = `${stats.winRate || 0}%`;
        document.getElementById('total-wins').textContent = stats.wins || 0;
        
        // Update header win rate if element exists
        const headerWinRate = document.querySelector('.stats-text strong');
        if (headerWinRate && stats.winRate) {
            headerWinRate.textContent = `${stats.winRate}%`;
        }
        
        if (stats.streak.count > 0) {
            const streakIcon = stats.streak.type === 'win' ? '🔥' : '❄️';
            document.getElementById('currentStreak').textContent = 
                `${streakIcon} ${stats.streak.count} ${stats.streak.type}s`;
        } else {
            document.getElementById('currentStreak').textContent = '--';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Зареди статистиката при зареждане на страницата
document.addEventListener('DOMContentLoaded', loadStats);
