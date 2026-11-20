
const basePath = "/monitor";

document.getElementById("loginForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginBtn");

    errorDiv.style.display = "none";
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {

        const res = await fetch(`${basePath}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success && data.token) {

            localStorage.setItem("monitor_session_token", data.token);

            window.location.replace(`${basePath}/bulk.html`);

        } else {

            errorDiv.style.display = "block";
            errorDiv.innerText = data.message || "Invalid credentials";

        }

    } catch (err) {

        console.error("Bulk login error:", err);

        errorDiv.style.display = "block";
        errorDiv.innerText = "Login failed. Server might be down.";

    } finally {

        loginBtn.disabled = false;
        loginBtn.textContent = "Login";

    }

});
