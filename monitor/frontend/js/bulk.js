const basePath = "/monitor";
const API_BASE = `${basePath}/api`;
const TOKEN_KEY = "monitor_session_token";

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function redirectToLogin() {
    clearToken();
    window.location.replace(`${basePath}/bulk-login.html`);
}

async function verifySession() {
    const token = getToken();

    if (!token) {
        redirectToLogin();
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/verify-session`, {
            method: "GET",
            headers: {
                "x-monitor-token": token
            }
        });

        if (!response.ok) {
            redirectToLogin();
            return false;
        }

        const data = await response.json();

        if (!data.valid) {
            redirectToLogin();
            return false;
        }

        document.getElementById("bulkApp").classList.add("visible");

        return true;

    } catch (error) {
        console.error("Session verification failed:", error);

        document.getElementById("statusMessage").textContent =
            "Unable to verify session. Please try again.";

        return false;
    }
}

async function downloadCSV(table) {
    const from = document.getElementById("filterFrom").value;
    const to = document.getElementById("filterTo").value;

    const status = document.getElementById("statusMessage");
    const buttons = document.querySelectorAll(".download-btn");

    if (!from || !to) {
        status.textContent = "Please select both dates.";
        return;
    }

    if (from > to) {
        status.textContent = "Start date cannot be after end date.";
        return;
    }

    const token = getToken();

    if (!token) {
        redirectToLogin();
        return;
    }

    buttons.forEach(button => button.disabled = true);

    status.textContent = "Preparing your CSV export. Please wait...";

    try {
        const params = new URLSearchParams({
            table,
            from,
            to
        });

        const response = await fetch(
            `${API_BASE}/bulk-export?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    "x-monitor-token": token
                }
            }
        );

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            let errorMessage = "Export failed.";

            try {
                const error = await response.json();
                errorMessage = error.message || error.error || errorMessage;
            } catch (_) {}

            throw new Error(errorMessage);
        }

        const blob = await response.blob();

        if (!blob.size) {
            throw new Error("The downloaded file is empty.");
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${table}_${from}_to_${to}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        // Give the browser time to begin downloading before revoking.
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        status.textContent = `${table} CSV downloaded successfully.`;

    } catch (error) {
        console.error("CSV download error:", error);
        status.textContent = error.message;

    } finally {
        buttons.forEach(button => button.disabled = false);
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    document
        .getElementById("downloadTokensBtn")
        .addEventListener("click", () => {
            downloadCSV("tokens");
        });

    document
        .getElementById("downloadPhysicalBtn")
        .addEventListener("click", () => {
            downloadCSV("physical_reference_entries");
        });

    await verifySession();

});