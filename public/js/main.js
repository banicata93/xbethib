// Main.js - Load predictions from API with caching

// League name → country flag emoji mapping
const LEAGUE_FLAGS = {
    // England
    'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Championship': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'League One': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'League Two': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FA Cup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'EFL Cup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'National League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Premier League 2': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    // Spain
    'La Liga': '🇪🇸', 'LaLiga': '🇪🇸', 'Segunda Division': '🇪🇸',
    'Primera Division': '🇪🇸', 'Copa del Rey': '🇪🇸', 'La Liga 2': '🇪🇸',
    // Germany
    'Bundesliga': '🇩🇪', '2. Bundesliga': '🇩🇪', '3. Liga': '🇩🇪',
    'DFB Pokal': '🇩🇪', 'Regionalliga': '🇩🇪', 'Bundesliga 2': '🇩🇪',
    'U19 Bundesliga': '🇩🇪', 'U17 Bundesliga': '🇩🇪',
    // Italy
    'Serie A': '🇮🇹', 'Serie B': '🇮🇹', 'Serie C': '🇮🇹',
    'Coppa Italia': '🇮🇹', 'Supercoppa Italiana': '🇮🇹',
    // France
    'Ligue 2': '🇫🇷', 'Coupe de France': '🇫🇷', 'Ligue 1 France': '🇫🇷',
    // Netherlands
    'Eredivisie': '🇳🇱', 'Eerste Divisie': '🇳🇱', 'KNVB Beker': '🇳🇱',
    // Portugal
    'Primeira Liga': '🇵🇹', 'Liga Portugal': '🇵🇹', 'Taça de Portugal': '🇵🇹',
    'Liga Portugal 2': '🇵🇹', 'Segunda Liga': '🇵🇹',
    // Belgium
    'First Division A': '🇧🇪', 'First Division B': '🇧🇪', 'Pro League': '🇧🇪',
    'Belgian Pro League': '🇧🇪', 'Coupe de Belgique': '🇧🇪',
    // Turkey
    'Süper Lig': '🇹🇷', 'Super Lig': '🇹🇷', '1. Lig': '🇹🇷', 'Turkish Cup': '🇹🇷',
    // Russia
    'Premier League Russia': '🇷🇺', 'First League': '🇷🇺', 'FNL': '🇷🇺',
    'Second League A': '🇷🇺', 'Second League B': '🇷🇺',
    'Second League A - Division A Silver': '🇷🇺', 'Second League A - Division A Gold': '🇷🇺',
    'Second League B - Division A': '🇷🇺', 'Cup Russia': '🇷🇺',
    // Ukraine
    'Premier League Ukraine': '🇺🇦', 'First League Ukraine': '🇺🇦', 'Cup Ukraine': '🇺🇦',
    // Scotland
    'Premiership': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Championship Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Scottish Cup': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'League Cup Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    // Greece
    'Super League': '🇬🇷', 'Super League 2': '🇬🇷', 'Greek Cup': '🇬🇷',
    // Austria
    'Bundesliga Austria': '🇦🇹', '2. Liga Austria': '🇦🇹', 'Austrian Cup': '🇦🇹',
    // Switzerland
    'Super League Switzerland': '🇨🇭', 'Challenge League': '🇨🇭', 'Swiss Cup': '🇨🇭',
    // Norway
    'Eliteserien': '🇳🇴', '1. divisjon': '🇳🇴', 'Toppserien': '🇳🇴',
    'Norwegian Cup': '🇳🇴', 'Nasjonal U19 Champions League': '🇳🇴',
    'Nasjonal U17 Champions League': '🇳🇴', '2. divisjon': '🇳🇴', '3. divisjon': '🇳🇴',
    // Sweden
    'Allsvenskan': '🇸🇪', 'Superettan': '🇸🇪', 'Svenska Cupen': '🇸🇪',
    'Division 1': '🇸🇪', 'Damallsvenskan': '🇸🇪',
    // Denmark
    'Superliga': '🇩🇰', '1st Division': '🇩🇰', 'DBU Pokalen': '🇩🇰',
    // Finland
    'Veikkausliiga': '🇫🇮', 'Ykkönen': '🇫🇮', 'Finnish Cup': '🇫🇮',
    // Poland
    'Ekstraklasa': '🇵🇱', 'I Liga': '🇵🇱', 'Polish Cup': '🇵🇱',
    // Czech Republic
    'Czech Liga': '🇨🇿', 'First League Czech': '🇨🇿', 'Czech Cup': '🇨🇿',
    // Slovakia
    'Super Liga Slovakia': '🇸🇰', 'Slovak Cup': '🇸🇰',
    // Romania
    'Liga I': '🇷🇴', 'Liga II': '🇷🇴', 'Cupa României': '🇷🇴',
    // Hungary
    'OTP Bank Liga': '🇭🇺', 'Nemzeti Bajnokság I': '🇭🇺', 'Hungarian Cup': '🇭🇺',
    // Croatia
    'HNL': '🇭🇷', 'SuperSport HNL': '🇭🇷', 'Croatian Cup': '🇭🇷',
    // Serbia
    'Super Liga Serbia': '🇷🇸', 'First League Serbia': '🇷🇸', 'Serbian Cup': '🇷🇸',
    // Slovenia
    'PrvaLiga': '🇸🇮', 'Slovenian Cup': '🇸🇮',
    // Bulgaria
    'First Professional League': '🇧🇬', 'Bulgarian Cup': '🇧🇬',
    // Armenia
    'Armenian Premier League': '🇦🇲', 'Cup Armenia': '🇦🇲', 'Cup': '🇦🇲',
    // Azerbaijan
    'Premier League Azerbaijan': '🇦🇿', 'Cup Azerbaijan': '🇦🇿',
    // Georgia
    'Erovnuli Liga': '🇬🇪', 'Georgian Cup': '🇬🇪',
    // Israel
    'Premier League Israel': '🇮🇱', 'Liga Leumit': '🇮🇱', 'State Cup': '🇮🇱',
    // Cyprus
    'First Division Cyprus': '🇨🇾', 'Cyprus Cup': '🇨🇾',
    // Europe / International
    'UEFA Champions League': '🇪🇺', 'UEFA Europa League': '🇪🇺',
    'UEFA Conference League': '🇪🇺', 'UEFA Nations League': '🇪🇺',
    'UEFA U21 Championship': '🇪🇺', 'World Cup': '🌍', 'World Cup - Qualification': '🌍',
    // Brazil
    'Série A': '🇧🇷', 'Série B': '🇧🇷', 'Copa do Brasil': '🇧🇷',
    'Brasileirao': '🇧🇷', 'Campeonato Brasileiro Série A': '🇧🇷',
    // Argentina
    'Liga Profesional': '🇦🇷', 'Primera División Argentina': '🇦🇷', 'Copa Argentina': '🇦🇷',
    'Primera Nacional': '🇦🇷',
    // Colombia
    'Categoría Primera A': '🇨🇴', 'Liga BetPlay': '🇨🇴',
    // Chile
    'Primera División Chile': '🇨🇱', 'Primera B Chile': '🇨🇱',
    // Mexico
    'Liga MX': '🇲🇽', 'Ascenso MX': '🇲🇽', 'Copa MX': '🇲🇽',
    // USA
    'MLS': '🇺🇸', 'USL Championship': '🇺🇸', 'USL League One': '🇺🇸',
    'NWSL': '🇺🇸',
    // Africa – Congo DR
    'Linafoot': '🇨🇩', 'Vodacom Ligue 1': '🇨🇩', 'Ligue 1': '🇨🇩',
    // Africa – Kenya
    'FKF Premier League': '🇰🇪', 'Football Kenya Federation Premier League': '🇰🇪',
    // Africa – South Africa
    'DStv Premiership': '🇿🇦', 'PSL': '🇿🇦', 'Nedbank Cup': '🇿🇦',
    // Africa – Nigeria
    'NPFL': '🇳🇬', 'Nigeria Professional Football League': '🇳🇬',
    // Africa – Egypt
    'Egyptian Premier League': '🇪🇬', 'Egypt Cup': '🇪🇬',
    // Africa – Morocco
    'Botola Pro': '🇲🇦', 'Moroccan Cup': '🇲🇦',
    // Africa – Tunisia
    'Ligue Professionnelle 1': '🇹🇳', 'Tunisian Cup': '🇹🇳',
    // Africa – Cameroon
    'MTN Elite One': '🇨🇲',
    // Africa – Ivory Coast
    'Ligue 1 Côte d\'Ivoire': '🇨🇮',
    // Asia – Japan
    'J1 League': '🇯🇵', 'J2 League': '🇯🇵', 'J3 League': '🇯🇵', 'Emperor Cup': '🇯🇵',
    // Asia – South Korea
    'K League 1': '🇰🇷', 'K League 2': '🇰🇷', 'FA Cup Korea': '🇰🇷',
    // Asia – China
    'Super League China': '🇨🇳', 'China League One': '🇨🇳',
    // Asia – India
    'ISL': '🇮🇳', 'I-League': '🇮🇳',
    // Asia – Saudi Arabia
    'Saudi Pro League': '🇸🇦', 'Division 1 League Saudi': '🇸🇦',
    // Asia – UAE
    'UAE Pro League': '🇦🇪',
    // Asia – Qatar
    'QSL': '🇶🇦', 'Qatar Stars League': '🇶🇦',
    // Australia
    'A-League Men': '🇦🇺', 'A-League Women': '🇦🇺', 'NPL': '🇦🇺',
};

// Derive flag from league name using the map above
function getLeagueFlag(league, country, flagUrl) {
    // 1. Bot provided a direct flag image URL
    if (flagUrl && /^https?:\/\//i.test(flagUrl)) return { type: 'img', value: flagUrl, alt: country || league };
    // 2. Existing short emoji/text stored as flag field
    if (flagUrl && [...flagUrl].length <= 4) return { type: 'emoji', value: flagUrl };
    // 3. Lookup by exact league name
    if (league && LEAGUE_FLAGS[league]) return { type: 'emoji', value: LEAGUE_FLAGS[league] };
    // 4. Partial match — check if any key is contained in the league name
    if (league) {
        for (const [key, flag] of Object.entries(LEAGUE_FLAGS)) {
            if (league.toLowerCase().includes(key.toLowerCase())) return { type: 'emoji', value: flag };
        }
    }
    // 5. No match — show shortened league name
    return { type: 'text', value: league || '⚽' };
}

// Escape HTML to prevent XSS when injecting API data into the DOM
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Render predictions into the existing table body
function renderPredictions(predictions) {
    const predictionsBody = document.getElementById('predictions-body');

    if (!predictions || predictions.length === 0) {
        predictionsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="mb-0" style="color: rgba(255, 255, 255, 0.7);">
                        <i class="bi bi-info-circle me-2"></i>
                        No predictions available for today. Check back soon!
                    </p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    predictions.forEach(prediction => {
        const flag = prediction.flag || '';
        const leagueInfo = getLeagueFlag(prediction.league, prediction.country, flag);
        let leagueDisplay;
        if (leagueInfo.type === 'img') {
            leagueDisplay = `<img src="${escapeHtml(leagueInfo.value)}" alt="${escapeHtml(leagueInfo.alt)}" class="league-flag" style="width:22px;height:22px;object-fit:contain;" loading="lazy">`;
        } else if (leagueInfo.type === 'emoji') {
            leagueDisplay = `<span class="team-flag">${leagueInfo.value}</span>`;
        } else {
            leagueDisplay = `<span style="font-size:0.72rem;opacity:0.8;line-height:1.2;display:inline-block;">${escapeHtml(leagueInfo.value)}</span>`;
        }

        const stick = escapeHtml(prediction.stick || '');

        html += `
            <tr>
                <td class="text-center">${leagueDisplay}</td>
                <td class="team-cell">${escapeHtml(prediction.homeTeam)}</td>
                <td class="team-cell">${escapeHtml(prediction.awayTeam)}</td>
                <td class="prediction-cell"><strong>${escapeHtml(prediction.prediction)}</strong></td>
                <td class="text-center" style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">${stick}</td>
            </tr>
        `;
    });

    predictionsBody.innerHTML = html;
}

// Load predictions from API
async function loadPredictions() {
    const predictionsBody = document.getElementById('predictions-body');

    if (!predictionsBody) {
        console.error('Predictions body element not found');
        return;
    }

    // Show loading state
    predictionsBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 mb-0" style="color: rgba(255, 255, 255, 0.7);">Loading predictions...</p>
            </td>
        </tr>
    `;

    try {
        const response = await fetch('/api/predictions/today');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const predictions = await response.json();

        if (predictions.message) {
            throw new Error(predictions.message);
        }

        renderPredictions(predictions);

    } catch (error) {
        console.error('Error loading predictions:', error);
        predictionsBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <p class="mb-0 text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Unable to load predictions. Please try again later.
                    </p>
                </td>
            </tr>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPredictions();
});

// Expose for external use
window.loadPredictions = loadPredictions;
window.renderPredictions = renderPredictions;
