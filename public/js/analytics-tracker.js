// Analytics Tracking Script for XBetHub
(function() {
    'use strict';
    
    // Generate or get session ID
    function getSessionId() {
        let sessionId = sessionStorage.getItem('xbethub_session');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('xbethub_session', sessionId);
        }
        return sessionId;
    }
    
    // Detect device type
    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }
    
    // Detect browser
    function getBrowser() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Firefox') > -1) return 'Firefox';
        if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
        if (ua.indexOf('Trident') > -1) return 'IE';
        if (ua.indexOf('Edge') > -1) return 'Edge';
        if (ua.indexOf('Chrome') > -1) return 'Chrome';
        if (ua.indexOf('Safari') > -1) return 'Safari';
        return 'Unknown';
    }
    
    // Detect OS
    function getOS() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Win') > -1) return 'Windows';
        if (ua.indexOf('Mac') > -1) return 'MacOS';
        if (ua.indexOf('Linux') > -1) return 'Linux';
        if (ua.indexOf('Android') > -1) return 'Android';
        if (ua.indexOf('iOS') > -1) return 'iOS';
        return 'Unknown';
    }
    
    // Track page view
    async function trackPageView() {
        try {
            const data = {
                path: window.location.pathname,
                fullUrl: window.location.href,
                referrer: document.referrer || 'Direct',
                sessionId: getSessionId(),
                device: getDeviceType(),
                browser: getBrowser(),
                os: getOS(),
                screenResolution: `${screen.width}x${screen.height}`,
                language: navigator.language || navigator.userLanguage,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            // Send to analytics endpoint
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            console.log('Analytics tracked:', data.path);
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    }
    
    // Track time on page
    let startTime = Date.now();
    
    window.addEventListener('beforeunload', async function() {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        // Use sendBeacon for reliable tracking on page unload
        const data = JSON.stringify({
            path: window.location.pathname,
            sessionId: getSessionId(),
            duration: duration
        });
        
        navigator.sendBeacon('/api/analytics/duration', data);
    });
    
    // Track on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }
    
    // Track clicks on ads (optional)
    document.addEventListener('click', function(e) {
        const adLink = e.target.closest('.ad-banner a, .premium-ad-link');
        if (adLink) {
            const adUrl = adLink.href;
            fetch('/api/analytics/ad-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adUrl: adUrl,
                    path: window.location.pathname,
                    sessionId: getSessionId()
                })
            }).catch(err => console.error('Ad click tracking error:', err));
        }
    });
    
})();
