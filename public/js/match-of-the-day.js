// Match of the Day Manager
(function() {
    'use strict';
    
    // Default match data
    const defaultMatch = {
        homeTeam: {
            name: 'Home Team',
            logo: '/images/default-team.png'
        },
        awayTeam: {
            name: 'Away Team',
            logo: '/images/default-team.png'
        },
        time: '20:00',
        prediction: 'Home Win',
        preview: 'This is a highly anticipated match between two top teams. Both sides are in excellent form and will be looking to secure all three points.'
    };
    
    // Function to update Match of the Day
    function updateMatchOfTheDay(matchData) {
        const data = matchData || defaultMatch;
        
        // Update home team
        const homeLogoEl = document.getElementById('motd-home-logo');
        const homeNameEl = document.getElementById('motd-home-name');
        if (homeLogoEl && data.homeTeam.logo) {
            homeLogoEl.src = data.homeTeam.logo;
            homeLogoEl.alt = data.homeTeam.name;
        }
        if (homeNameEl) {
            homeNameEl.textContent = data.homeTeam.name;
        }
        
        // Update away team
        const awayLogoEl = document.getElementById('motd-away-logo');
        const awayNameEl = document.getElementById('motd-away-name');
        if (awayLogoEl && data.awayTeam.logo) {
            awayLogoEl.src = data.awayTeam.logo;
            awayLogoEl.alt = data.awayTeam.name;
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
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Try to fetch from API, fallback to default
        fetchMatchOfTheDay();
    });
    
    // Expose global function for manual updates
    window.setMatchOfTheDay = updateMatchOfTheDay;
    
})();
