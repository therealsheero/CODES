const basePath = window.location.pathname.includes('/monitor') ? '/monitor' : '.';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.style.display = 'none';

    try {
        const res = await fetch(`${basePath}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success && data.token) {
            localStorage.setItem('monitor_session_token', data.token);
            window.location.href = `${basePath}/monitor.html`;
        } else {
            errorDiv.style.display = 'block';
            errorDiv.innerText = data.message || 'Invalid credentials';
        }
    } catch (err) {
        console.error('Login error:', err);
        errorDiv.style.display = 'block';
        errorDiv.innerText = 'Login failed. Server might be down.';
    }
});