const guardToken = localStorage.getItem("guardToken");

let states = [];

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

async function loadStates() {

    try {

        const res = await fetch(
            "/bengaluru/api/settings/states"
        );

        if (!res.ok) {
            throw new Error("Failed to load states");
        }

        states = await res.json();

        renderStateOptions();

    } catch (err) {

        console.error("Error loading states:", err);

        document.getElementById("state").innerHTML = `
            <option value="">
                ${window.t(
                    "guard3.state_load_error",
                    "Unable to load states"
                )}
            </option>
        `;
    }
}


function renderStateOptions() {

    const select =
        document.getElementById("state");

    const currentValue =
        select.value;

    select.innerHTML = `
        <option value="">
            ${window.t(
                "guard3.select_state",
                "Select State"
            )}
        </option>
    `;

    states.forEach(state => {

        select.innerHTML += `
            <option value="${state}">
                ${state}
            </option>
        `;

    });

    if (
        currentValue &&
        states.includes(currentValue)
    ) {
        select.value = currentValue;
    }
}


async function loadDistrictsByState(state) {

    const districtSelect =
        document.getElementById("district");

    districtSelect.innerHTML = `
        <option value="">
            ${window.t(
                "guard3.select_district",
                "Select District"
            )}
        </option>
    `;

    if (!state) {
        return;
    }

    try {

        const res = await fetch(
            `/bengaluru/api/settings/districts-by-state?state=${encodeURIComponent(state)}`
        );

        if (!res.ok) {
            throw new Error("Failed to load districts");
        }

        const districts =
            await res.json();

        districts.forEach(d => {


            const englishName =
                d.english_name || "";

            const hindiName =
                d.hindi_name || "";

            districtSelect.innerHTML += `
                <option value="${englishName}">
                    ${englishName} / ${hindiName}
                </option>
            `;

        });

    } catch (err) {

        console.error(
            "Error loading districts:",
            err
        );

        districtSelect.innerHTML = `
            <option value="">
                ${window.t(
                    "guard3.district_load_error",
                    "Unable to load districts"
                )}
            </option>
        `;
    }
}


document
    .getElementById("state")
    .addEventListener(
        "change",
        function () {

            loadDistrictsByState(
                this.value
            );

        }
    );


function formatDateTime(dt) {

    return new Date(dt).toLocaleString(
        "en-IN",
        {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );

}


async function loadEntries() {

    try {

        const res = await fetch(
            "/bengaluru/api/guard/physical-reference-entry",
            {
                headers: {
                    "x-guard-token": guardToken
                }
            }
        );

        if (!res.ok) {

            if (res.status === 401) {

                alert(
                    window.t(
                        "guard.status.session_expired",
                        "Session expired"
                    )
                );

                logout();

                return;
            }

            throw new Error(
                "Failed to load entries"
            );
        }

        const rows =
            await res.json();

        const tbody =
            document.querySelector(
                "#entryTable tbody"
            );

        tbody.innerHTML =
            rows.map(r => `

                <tr>

                    <td>
                        ${r.token || "-"}
                    </td>

                    <td>
                        ${r.name || "-"}
                    </td>

                    <td>
                        ${r.age ?? "-"}
                    </td>

                    <td>
                        ${r.mobile || "-"}
                    </td>

                    <td>
                        ${r.gender || "-"}
                    </td>

                    <td>
                        ${r.state || "-"}
                    </td>

                    <td>
                        ${r.district || "-"}
                    </td>

                    <td>
                        ${r.eid || "-"}
                    </td>

                    <td>
                        ${r.service_type || "-"}
                    </td>

                    <td>
                        ${r.token_type || "-"}
                    </td>

                    <td>
                        ${formatDateTime(
                            r.created_at
                        )}
                    </td>

                    <td>
                        ${r.reference_of || "-"}
                    </td>

                </tr>

            `).join("");

    } catch (err) {

        console.error(
            "Error loading entries:",
            err
        );

    }
}



document
    .getElementById("entryForm")
    .addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const payload = {

                name:
                    document
                        .getElementById("name")
                        .value
                        .trim(),

                age:
                    document
                        .getElementById("age")
                        .value,

                mobile:
                    document
                        .getElementById("mobile")
                        .value
                        .trim(),

                aadhaar_last4:
                    document
                        .getElementById("aadhaar")
                        .value
                        .trim(),

                gender:
                    document
                        .getElementById("gender")
                        .value,

                state:
                    document
                        .getElementById("state")
                        .value,

                district:
                    document
                        .getElementById("district")
                        .value,

                eid:
                    document
                        .getElementById("eid")
                        .value
                        .trim(),

                service_type:
                    document
                        .getElementById("service_type")
                        .value,

                reference_of:
                    document
                        .getElementById("reference_of")
                        .value
                        .trim(),

                token_type:
                    document
                        .getElementById("token_type")
                        .value

            };


            try {

                const res = await fetch(
                    "/bengaluru/api/guard/physical-reference-entry",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "x-guard-token":
                                guardToken
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );


                if (!res.ok) {

                    if (res.status === 401) {

                        alert(
                            window.t(
                                "guard.status.session_expired",
                                "Session expired"
                            )
                        );

                        logout();

                        return;
                    }

                    const errorData =
                        await res.json()
                            .catch(() => ({}));

                    throw new Error(
                        errorData.message ||
                        "Failed to save entry"
                    );
                }



                e.target.reset();



                renderStateOptions();



                document
                    .getElementById("district")
                    .innerHTML = `
                        <option value="">
                            ${window.t(
                                "guard3.select_district",
                                "Select District"
                            )}
                        </option>
                    `;


                await loadEntries();


            } catch (err) {

                console.error(
                    "Error saving entry:",
                    err
                );

                alert(
                    err.message ||
                    "Unable to save entry"
                );
            }

        }
    );


window.addEventListener(
    "languageChanged",
    () => {

        renderStateOptions();


        const selectedState =
            document.getElementById("state").value;

        if (selectedState) {

            loadDistrictsByState(
                selectedState
            );

        } else {

            document
                .getElementById("district")
                .innerHTML = `
                    <option value="">
                        ${window.t(
                            "guard3.select_district",
                            "Select District"
                        )}
                    </option>
                `;
        }

    }
);


function logout() {

    localStorage.removeItem(
        "guardToken"
    );

    window.location.href =
        "guard-login.html";
}



(async function () {

    await loadStates();
    await loadServiceTypes();

    await loadEntries();

})();
