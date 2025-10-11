// Зареждане на статистика
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('winRate').textContent = stats.winRate + '%';
        document.getElementById('totalWins').textContent = '✅ ' + stats.wins;
        document.getElementById('totalLosses').textContent = '❌ ' + stats.losses;
        
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
