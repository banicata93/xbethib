/**
 * Динамичен брояч на онлайн потребители
 * Използва симулирани данни с polling на всеки 10 секунди
 */

document.addEventListener('DOMContentLoaded', function() {
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
            <div class="counter-text">онлайн</div>
        `;
        
        counterElement.innerHTML = counterContent;
        
        // Добавяме брояча към body
        document.body.appendChild(counterElement);
    }
    
    // Функция за актуализиране на брояча
    function updateOnlineUsers() {
        const counterElement = document.getElementById('online-users-count');
        if (!counterElement) return;
        
        // В реален случай тук би имало заявка към сървъра
        // За демонстрация използваме случайно число между базовата стойност и максимума
        const baseUsers = 15; // Минимален брой потребители
        const maxRandomUsers = 10; // Максимален случаен брой за добавяне
        const currentUsers = baseUsers + Math.floor(Math.random() * maxRandomUsers);
        
        // Анимирана промяна на числото
        animateCounter(counterElement, parseInt(counterElement.textContent), currentUsers);
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
    
    // Първоначално актуализиране
    updateOnlineUsers();
    
    // Актуализиране на всеки 10 секунди
    setInterval(updateOnlineUsers, 10000);
});
