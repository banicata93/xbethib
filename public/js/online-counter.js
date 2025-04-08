/**
 * Реален брояч на онлайн потребители
 * Използва Firebase Realtime Database за проследяване на активни потребители
 */

// Добавяме Firebase SDK
document.addEventListener('DOMContentLoaded', function() {
    // Добавяме Firebase скриптовете, ако още не са заредени
    if (!window.firebase) {
        loadFirebaseScripts();
    } else {
        initializeCounter();
    }
    
    // Функция за зареждане на Firebase скриптовете
    function loadFirebaseScripts() {
        const firebaseApp = document.createElement('script');
        firebaseApp.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
        firebaseApp.onload = function() {
            const firebaseDatabase = document.createElement('script');
            firebaseDatabase.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js';
            firebaseDatabase.onload = initializeCounter;
            document.head.appendChild(firebaseDatabase);
        };
        document.head.appendChild(firebaseApp);
    }
    
    // Инициализиране на брояча и Firebase
    function initializeCounter() {
        // Конфигурация на Firebase
        // Използваме безплатна Firebase база данни за демонстрация
        const firebaseConfig = {
            apiKey: "AIzaSyDxDZX6ySk28pW-GWqRnlKBl3OaJFEfpB0",
            authDomain: "xbethub-online-counter.firebaseapp.com",
            databaseURL: "https://xbethub-online-counter-default-rtdb.firebaseio.com",
            projectId: "xbethub-online-counter",
            storageBucket: "xbethub-online-counter.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:abcdef1234567890abcdef"
        };
        
        // Инициализиране на Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Създаваме елемента за брояча, ако още не съществува
        if (!document.getElementById('online-users-counter')) {
            const counterElement = document.createElement('div');
            counterElement.id = 'online-users-counter';
            counterElement.className = 'online-users-counter';
            
            // Съдържание на брояча
            const counterContent = `
                <div class="counter-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                        <path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                        <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
                    </svg>
                </div>
                <div class="counter-number" id="online-users-count">0</div>
                <div class="counter-text">online</div>
            `;
            
            counterElement.innerHTML = counterContent;
            
            // Добавяме брояча към body
            document.body.appendChild(counterElement);
        }
        
        // Референция към базата данни
        const database = firebase.database();
        const connectedRef = database.ref('.info/connected');
        const onlineUsersRef = database.ref('onlineUsers');
        
        // Генерираме уникален ID за потребителя
        const userId = generateUserId();
        
        // Проследяваме връзката на потребителя
        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Потребителят е онлайн
                const userRef = onlineUsersRef.child(userId);
                
                // Добавяме потребителя към списъка с онлайн потребители
                userRef.set({
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Актуализираме lastActive на всеки 30 секунди
                const updateInterval = setInterval(() => {
                    userRef.update({
                        lastActive: firebase.database.ServerValue.TIMESTAMP
                    });
                }, 30000);
                
                // Премахваме потребителя, когато се разкачи
                userRef.onDisconnect().remove();
                
                // Също премахваме интервала при разкачване
                window.addEventListener('beforeunload', () => {
                    clearInterval(updateInterval);
                });
            }
        });
        
        // Проследяваме броя на онлайн потребителите
        onlineUsersRef.on('value', (snapshot) => {
            const counterElement = document.getElementById('online-users-count');
            if (!counterElement) return;
            
            // Изчисляваме броя на онлайн потребителите
            const onlineUsers = snapshot.numChildren();
            
            // Анимирана промяна на числото
            animateCounter(counterElement, parseInt(counterElement.textContent), onlineUsers);
        });
        
        // Почистваме неактивните потребители (неактивни повече от 5 минути)
        setInterval(() => {
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            onlineUsersRef.once('value', (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    const userData = childSnapshot.val();
                    if (userData.lastActive < fiveMinutesAgo) {
                        childSnapshot.ref.remove();
                    }
                });
            });
        }, 60000); // Проверяваме на всяка минута
    }
    
    // Функция за генериране на уникален ID за потребителя
    function generateUserId() {
        // Проверяваме дали вече имаме ID в localStorage
        let userId = localStorage.getItem('xbethub_user_id');
        
        if (!userId) {
            // Генерираме нов ID
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('xbethub_user_id', userId);
        }
        
        return userId;
    }
    
    // Функция за анимиране на брояча
    function animateCounter(element, start, end) {
        let current = start;
        const increment = end > start ? 1 : -1;
        const duration = 500; // ms
        const steps = Math.abs(end - start);
        const stepTime = steps > 0 ? duration / steps : duration;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                clearInterval(timer);
                element.textContent = end;
            }
        }, stepTime);
    }
});
