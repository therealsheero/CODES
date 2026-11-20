
(function () {

    const STORAGE_KEY = "uidai_total_visits";

    // Starting baseline carried over from the old backend fallback
    const INITIAL_COUNT = 186845;

    let currentVisitorCount = null;

    function getVisitorOrdinal(count) {

        const lastTwo = count % 100;
        const lastOne = count % 10;

        if (lastTwo >= 11 && lastTwo <= 13) return "th";

        if (lastOne === 1) return "st";
        if (lastOne === 2) return "nd";
        if (lastOne === 3) return "rd";

        return "th";
    }

    function renderVisitorCounter() {

        const element =
            document.getElementById("visitorCounterText");

        if (!element) return;

        const language =
            window.i18n?.getLanguage?.() || "hi";

        const formattedCount =
            currentVisitorCount.toLocaleString("en-IN");

        const displayCount =
            language === "en"
                ? formattedCount + getVisitorOrdinal(currentVisitorCount)
                : formattedCount;

        element.textContent = window.t
            ? window.t(
                "visitor_counter",
                "You are the {count} visitor",
                { count: displayCount }
            )
            : `You are the ${displayCount} visitor`;

    }

    function updateVisitorCount() {

        try {

            let storedCount =
                localStorage.getItem(STORAGE_KEY);

            if (storedCount === null) {

                currentVisitorCount = INITIAL_COUNT + 1;

            } else {

                currentVisitorCount =
                    Number(storedCount) + 1;

            }

            localStorage.setItem(
                STORAGE_KEY,
                currentVisitorCount.toString()
            );

            renderVisitorCounter();

        } catch (error) {

            console.error(
                "Visitor counter error:",
                error
            );

        }

    }

    // Update translated text without incrementing the count
    window.addEventListener(
        "languageChanged",
        renderVisitorCounter
    );

    document.addEventListener(
        "DOMContentLoaded",
        updateVisitorCount
    );

})();
