document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/admin';
        return;
    }

    // Handle form submission
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/admin';
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred. Please try again.');
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}
