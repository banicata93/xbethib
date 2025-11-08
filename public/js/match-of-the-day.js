// Match of the Day Manager
(function() {
    'use strict';
    
    // Function to generate team logo URL
    function getTeamLogoUrl(teamName, teamId) {
        // Try different sources in order
        if (teamId) {
            // Try API-Sports first
            return `https://media.api-sports.io/football/teams/${teamId}.png`;
        }
        
        // Fallback to UI Avatars with team initials
        const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=667eea&color=fff&bold=true&font-size=0.5`;
    }
    
    // Default match data
    const defaultMatch = {
        homeTeam: {
            name: 'Manchester United',
            logo: null,
            id: 33
        },
        awayTeam: {
            name: 'Liverpool',
            logo: null,
            id: 40
        },
        time: '20:00',
        prediction: 'Over 2.5 Goals',
        preview: 'This is a highly anticipated match between two top teams. Both sides are in excellent form and will be looking to secure all three points.'
    };
    
    // Function to update Match of the Day
    function updateMatchOfTheDay(matchData) {
        const data = matchData || defaultMatch;
        
        // Update home team
        const homeLogoEl = document.getElementById('motd-home-logo');
        const homeNameEl = document.getElementById('motd-home-name');
        const homeLogoContainer = homeLogoEl?.parentElement;
        
        if (homeLogoEl) {
            const logoUrl = data.homeTeam.logo || getTeamLogoUrl(data.homeTeam.name, data.homeTeam.id);
            homeLogoEl.src = logoUrl;
            homeLogoEl.alt = data.homeTeam.name;
            
            // Show container if hidden
            if (homeLogoContainer) {
                homeLogoContainer.style.display = 'flex';
            }
        }
        if (homeNameEl) {
            homeNameEl.textContent = data.homeTeam.name;
        }
        
        // Update away team
        const awayLogoEl = document.getElementById('motd-away-logo');
        const awayNameEl = document.getElementById('motd-away-name');
        const awayLogoContainer = awayLogoEl?.parentElement;
        
        if (awayLogoEl) {
            const logoUrl = data.awayTeam.logo || getTeamLogoUrl(data.awayTeam.name, data.awayTeam.id);
            awayLogoEl.src = logoUrl;
            awayLogoEl.alt = data.awayTeam.name;
            
            // Show container if hidden
            if (awayLogoContainer) {
                awayLogoContainer.style.display = 'flex';
            }
        }
        if (awayNameEl) {
            awayNameEl.textContent = data.awayTeam.name;
        }
        
        // Update time
        const timeEl = document.getElementById('motd-time');
        if (timeEl && data.time) {
            timeEl.textContent = data.time;
        }
        
        // Update prediction
        const predictionEl = document.getElementById('motd-prediction');
        if (predictionEl && data.prediction) {
            predictionEl.textContent = data.prediction;
        }
        
        // Update preview
        const previewEl = document.getElementById('motd-preview-text');
        if (previewEl && data.preview) {
            previewEl.textContent = data.preview;
        }
    }
    
    // Function to fetch match data from server (optional)
    async function fetchMatchOfTheDay() {
        try {
            const response = await fetch('/api/match-of-the-day');
            if (response.ok) {
                const data = await response.json();
                updateMatchOfTheDay(data);
            } else {
                // Use default data if API fails
                updateMatchOfTheDay(defaultMatch);
            }
        } catch (error) {
            console.log('Using default match data');
            updateMatchOfTheDay(defaultMatch);
        }
    }
    
    // Function to fetch and display archive
    async function fetchArchive() {
        try {
            const response = await fetch('/api/match-of-the-day/archive');
            if (response.ok) {
                const data = await response.json();
                displayArchive(data);
            }
        } catch (error) {
            console.log('Could not load archive:', error);
        }
    }
    
    // Function to display archive
    function displayArchive(data) {
        const archiveContainer = document.getElementById('motd-archive');
        const streakContainer = document.getElementById('archive-streak');
        const statsContainer = document.getElementById('archive-stats');
        
        if (!archiveContainer || !streakContainer || !statsContainer) {
            return;
        }
        
        // Only show if there's data
        if (!data.archive || data.archive.length === 0) {
            archiveContainer.style.display = 'none';
            return;
        }
        
        // Show archive container
        archiveContainer.style.display = 'block';
        
        // Build streak display
        let streakHTML = '';
        const streak = data.streak || '';
        
        for (let i = 0; i < streak.length; i++) {
            const char = streak[i];
            let className = '';
            let title = '';
            
            switch(char) {
                case 'W':
                    className = 'win';
                    title = 'Win';
                    break;
                case 'L':
                    className = 'loss';
                    title = 'Loss';
                    break;
                case 'V':
                    className = 'void';
                    title = 'Void';
                    break;
                case 'P':
                    className = 'pending';
                    title = 'Pending';
                    break;
            }
            
            streakHTML += `<div class="streak-item ${className}" title="${title}">${char}</div>`;
        }
        
        streakContainer.innerHTML = streakHTML;
        
        // Build stats display
        const stats = data.stats || {};
        const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.wins || 0}</div>
                <div class="stat-label">Wins</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.losses || 0}</div>
                <div class="stat-label">Losses</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${winRate}%</div>
                <div class="stat-label">Win Rate</div>
            </div>
        `;
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Try to fetch from API, fallback to default
        fetchMatchOfTheDay();
        
        // Fetch archive
        fetchArchive();
    });
    
    // Expose global function for manual updates
    window.setMatchOfTheDay = updateMatchOfTheDay;
    window.refreshArchive = fetchArchive;
    
})();
