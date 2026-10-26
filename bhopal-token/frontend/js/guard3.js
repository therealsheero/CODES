const guardToken = localStorage.getItem("guardToken");
if (!guardToken) {
  window.location.href = "guard-login.html";
}

async function loadServiceTypes() {
  const select = document.getElementById("service_type");

  try {
    const res = await fetch("/lucknow/api/manager/service-types");

    if (!res.ok) {
      throw new Error(`Failed to load service types: ${res.status}`);
    }

    const serviceTypes = await res.json();

    function populateServiceTypes() {
      const lang = window.i18n
        ? window.i18n.getLanguage()
        : "en";

      select.innerHTML = `
        <option value="">
          ${window.t(
            "guard3.select_service_type",
            "Select Service Type"
          )}
        </option>
      `;

      serviceTypes
        .filter(service => Number(service.active) === 1)
        .forEach(service => {
          const option = document.createElement("option");

          // Preserve the service name expected by the backend.
          option.value = service.english_name;

          option.textContent =
            lang === "hi"
              ? service.hindi_name || service.english_name
              : service.english_name;

          select.appendChild(option);
        });
    }

    populateServiceTypes();

    window.addEventListener(
      "languageChanged",
      populateServiceTypes
    );
  } catch (err) {
    console.error("Failed to load service types:", err);

    select.innerHTML = `
      <option value="">
        Unable to load service types
      </option>
    `;
  }
}

async function loadDistricts() {
    try {
        const res = await fetch("/lucknow/api/manager/district-master");

        const districts = await res.json();

        const select = document.getElementById("district");

        function populateDistricts() {

            const lang = window.i18n
                ? window.i18n.getLanguage()
                : "en";

            select.innerHTML = `
                <option value="">
                    ${window.t(
                        "guard3.select_district",
                        "Select District"
                    )}
                </option>
            `;

            districts
                .filter(d => d.active === 1)
                .forEach(d => {

                    let districtName = d.english_name || "";

                    if (lang === "hi") {
                        districtName =
                            d.hindi_name || d.english_name;
                    }

                    select.innerHTML += `
                        <option value="${d.english_name}">
                            ${districtName}
                        </option>
                    `;
                });
        }

        // Initial population
        populateDistricts();

        // Re-populate when language changes
        window.addEventListener("languageChanged", populateDistricts);

    } catch (err) {

        console.error("Failed to load districts:", err);

        document.getElementById("district").innerHTML = `
            <option value="">
                ${window.t(
                    "guard3.district_load_error",
                    "Unable to load districts"
                )}
            </option>
        `;
    }
}

function formatDateTime(dt) {

  return new Date(dt).toLocaleString("en-IN", {

    timeZone: "Asia/Kolkata",

    day: "2-digit",
    month: "short",
    year: "numeric",

    hour: "2-digit",
    minute: "2-digit",

    hour12: true
  });
}


  async function loadEntries() {

  const res = await fetch(
    "/lucknow/api/guard/physical-reference-entry",
    {
      headers: {
        "x-guard-token": guardToken
      }
    }
  );



  const rows = await res.json();
  const tbody =
    document.querySelector("#entryTable tbody");

  tbody.innerHTML = rows.map(r => `

    <tr>
      <td>${r.token}</td>
      <td>${r.name}</td>
      <td>${r.age}</td>
      <td>${r.mobile}</td>
      <td>${r.gender}</td>
      <td>${r.district}</td>
      <td>${r.eid || "-"}</td>
      <td>${r.service_type}</td>
      <td>${r.token_type}</td>
      <td>${formatDateTime(r.created_at)}</td>
      <td>${r.reference_of}</td>

    </tr>

  `).join("");
}
window.addEventListener("languageChanged", () => {
    loadEntries();
});
loadDistricts();
loadServiceTypes();
loadEntries();
document
  .getElementById("entryForm")
  .addEventListener("submit", async e => {

    e.preventDefault();

    const payload = {

      name:
        document.getElementById("name").value,

      age:
        document.getElementById("age").value,

      mobile:
        document.getElementById("mobile").value,

      aadhaar_last4:
        document.getElementById("aadhaar").value,

      gender:
        document.getElementById("gender").value,

      district:
        document.getElementById("district").value,
        eid:
    document.getElementById("eid").value,

      service_type:
        document.getElementById("service_type").value,
        
      reference_of:
        document.getElementById("reference_of").value,

      token_type:
        document.getElementById("token_type").value
    };

    await fetch(
      "/lucknow/api/guard/physical-reference-entry",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-guard-token": guardToken
        },

        body: JSON.stringify(payload)
      }
    );

    e.target.reset();

    loadEntries();
  });
  
  function logout() {
  localStorage.removeItem("guardToken");
  window.location.href = "guard-login.html";
}
