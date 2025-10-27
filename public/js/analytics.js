// Функция за зареждане на обща статистика
async function loadAnalyticsOverview(period = 7) {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('Loading analytics overview with period:', period);
        
        const response = await fetch(`/api/analytics/overview?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Overview response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to fetch analytics');
        }
        
        const data = await response.json();
        displayOverview(data);
        displayCharts(data);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics data');
    }
}

// Функция за показване на обща статистика
function displayOverview(data) {
    document.getElementById('totalVisits').textContent = data.totalVisits.toLocaleString();
    document.getElementById('uniqueVisits').textContent = data.uniqueVisits.toLocaleString();
    
    const avgVisitsPerDay = (data.totalVisits / data.period).toFixed(1);
    document.getElementById('avgVisitsPerDay').textContent = avgVisitsPerDay;
    
    const returnRate = data.totalVisits > 0 
        ? (((data.totalVisits - data.uniqueVisits) / data.totalVisits) * 100).toFixed(1)
        : 0;
    document.getElementById('returnRate').textContent = returnRate + '%';
}

// Функция за показване на графики
function displayCharts(data) {
    // График за посещения по дни
    displayVisitsByDayChart(data.visitsByDay);
    
    // График за устройства
    displayDeviceChart(data.deviceStats);
    
    // График за браузъри
    displayBrowserChart(data.browserStats);
    
    // Таблица с най-посещавани страници
    displayTopPages(data.topPages);
}

// График за посещения по дни
function displayVisitsByDayChart(visitsByDay) {
    const canvas = document.getElementById('visitsByDayChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const labels = visitsByDay.map(v => {
        const date = new Date(v._id);
        return date.toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' });
    });
    const totalData = visitsByDay.map(v => v.total);
    const uniqueData = visitsByDay.map(v => v.unique);
    
    // Проста визуализация без библиотека
    drawLineChart(ctx, canvas.width, canvas.height, labels, [
        { label: 'Total Visits', data: totalData, color: '#4CAF50' },
        { label: 'Unique Visits', data: uniqueData, color: '#2196F3' }
    ]);
}

// График за устройства (пай чарт)
function displayDeviceChart(deviceStats) {
    const container = document.getElementById('deviceChart');
    if (!container) return;
    
    container.innerHTML = '';
    
    const total = deviceStats.reduce((sum, d) => sum + d.count, 0);
    
    deviceStats.forEach(device => {
        const percentage = ((device.count / total) * 100).toFixed(1);
        const deviceName = device._id.charAt(0).toUpperCase() + device._id.slice(1);
        
        const bar = document.createElement('div');
        bar.className = 'device-bar mb-2';
        bar.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span>${deviceName}</span>
                <span>${percentage}%</span>
            </div>
            <div class="progress">
                <div class="progress-bar" style="width: ${percentage}%"></div>
            </div>
        `;
        container.appendChild(bar);
    });
}

// График за браузъри
function displayBrowserChart(browserStats) {
    const container = document.getElementById('browserChart');
    if (!container) return;
    
    container.innerHTML = '';
    
    const total = browserStats.reduce((sum, b) => sum + b.count, 0);
    const top5 = browserStats.slice(0, 5);
    
    top5.forEach(browser => {
        const percentage = ((browser.count / total) * 100).toFixed(1);
        
        const bar = document.createElement('div');
        bar.className = 'browser-bar mb-2';
        bar.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span>${browser._id}</span>
                <span>${percentage}%</span>
            </div>
            <div class="progress">
                <div class="progress-bar bg-info" style="width: ${percentage}%"></div>
            </div>
        `;
        container.appendChild(bar);
    });
}

// Таблица с най-посещавани страници
function displayTopPages(topPages) {
    const tbody = document.getElementById('topPagesTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    topPages.forEach((page, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${page._id}</td>
            <td>${page.count.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Функция за зареждане на статистика в реално време
async function loadRealtimeStats() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('Loading realtime stats...');
        const response = await fetch('/api/analytics/realtime', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Realtime response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Realtime error:', errorText);
            throw new Error('Failed to fetch realtime stats');
        }
        
        const data = await response.json();
        displayRealtimeStats(data);
    } catch (error) {
        console.error('Error loading realtime stats:', error);
    }
}

// Показване на статистика в реално време
function displayRealtimeStats(data) {
    const activeSessionsEl = document.getElementById('activeSessions');
    if (activeSessionsEl) {
        activeSessionsEl.textContent = data.activeSessions;
    }
    
    // Последни посещения
    const recentVisitsEl = document.getElementById('recentVisits');
    if (recentVisitsEl) {
        recentVisitsEl.innerHTML = '';
        
        data.recentVisits.slice(0, 10).forEach(visit => {
            const time = new Date(visit.timestamp).toLocaleTimeString('bg-BG');
            const item = document.createElement('div');
            item.className = 'recent-visit-item p-2 border-bottom';
            item.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">${time}</span>
                    <span class="badge bg-secondary">${visit.device}</span>
                </div>
                <div>${visit.path}</div>
            `;
            recentVisitsEl.appendChild(item);
        });
    }
}

// Функция за зареждане на referrer статистика
async function loadReferrerStats(period = 7) {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.log('Loading referrer stats with period:', period);
        
        const response = await fetch(`/api/analytics/referrers?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Referrer response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Referrer error:', errorText);
            throw new Error('Failed to fetch referrer stats');
        }
        
        const data = await response.json();
        displayReferrerStats(data);
    } catch (error) {
        console.error('Error loading referrer stats:', error);
    }
}

// Показване на referrer статистика
function displayReferrerStats(data) {
    const tbody = document.getElementById('referrersTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Добавяме Direct visits
    const directRow = document.createElement('tr');
    directRow.innerHTML = `
        <td>Direct / None</td>
        <td>${data.directVisits.toLocaleString()}</td>
    `;
    tbody.appendChild(directRow);
    
    // Добавяме останалите referrers
    data.referrerStats.forEach(ref => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ref._id}</td>
            <td>${ref.count.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Проста функция за рисуване на линеен график
function drawLineChart(ctx, width, height, labels, datasets) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Изчистваме canvas
    ctx.clearRect(0, 0, width, height);
    
    // Намираме максималната стойност
    const maxValue = Math.max(...datasets.flatMap(d => d.data));
    
    // Рисуваме оси
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Рисуваме линиите за всеки dataset
    datasets.forEach(dataset => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        dataset.data.forEach((value, index) => {
            const x = padding + (index / (dataset.data.length - 1)) * chartWidth;
            const y = height - padding - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    });
}

// Показване на грешка
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.analytics-container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
    }
}

// Промяна на периода
function changePeriod(period) {
    loadAnalyticsOverview(period);
    loadReferrerStats(period);
}

// Инициализация при зареждане на страницата
if (document.getElementById('analyticsPage')) {
    loadAnalyticsOverview(7);
    loadRealtimeStats();
    loadReferrerStats(7);
    
    // Обновяване на realtime статистиката на всеки 30 секунди
    setInterval(loadRealtimeStats, 30000);
}
