const guardToken = localStorage.getItem("guardToken");
if (!guardToken) {
  window.location.href = "guard-login.html";
}

const tbody = document.querySelector("#tokenTable tbody");
let currentTableData = [];
let TOKENS_PER_HOUR = 30; 
let dashboardFieldVisibility = {};
const dashboardFields = {

    created_at: {
        labelKey: "guard.columns.created_at",
        label: "Token Created"
    },

    date: {
        labelKey: "guard.columns.date",
        label: "Appointment / Walk-in Date"
    },

    token_count: {
        labelKey: "guard.columns.token_count",
        label: "Token Count"
    },

    token_type: {
        labelKey: "guard.columns.token_type",
        label: "Token Type"
    },

    name: {
        labelKey: "guard.columns.name",
        label: "Name"
    },

    mobile: {
        labelKey: "guard.columns.mobile",
        label: "Mobile"
    },

    gender: {
        labelKey: "guard.columns.gender",
        label: "Gender"
    },

    age: {
        labelKey: "guard.columns.age",
        label: "Age"
    },

    district: {
        labelKey: "guard.columns.district",
        label: "District"
    },

    service_type: {
        labelKey: "guard.columns.service_type",
        label: "Service"
    },

    expected_time: {
        labelKey: "guard.columns.expected_time",
        label: "Expected Time"
    },

    entry_time: {
        labelKey: "guard.columns.entry_time",
        label: "Entry Time"
    },

    visited_at: {
        labelKey: "guard.columns.visited_at",
        label: "Serviced At"
    },

    aadhaar_last4: {
        labelKey: "guard.columns.aadhaar_last4",
        label: "Aadhaar Last 4"
    },

    qrc: {
        labelKey: "guard.columns.qrc",
        label: "QRC"
    },

    divyang: {
        labelKey: "guard.columns.divyang",
        label: "Divyang"
    },

    mode: {
        labelKey: "guard.columns.mode",
        label: "Mode"
    },

    priority: {
        labelKey: "guard.columns.priority",
        label: "Priority"
    },

    device_id: {
        labelKey: "guard.columns.device_id",
        label: "Device ID"
    },

    visited: {
        labelKey: "guard.columns.visited",
        label: "Visited"
    },

    distance_meters: {
        labelKey: "guard.columns.distance_meters",
        label: "Distance"
    },

    token_seq: {
        labelKey: "guard.columns.token_seq",
        label: "Token Sequence"
    },

    entry_marked: {
        labelKey: "guard.columns.entry_marked",
        label: "Entry Marked"
    },

    eid: {
        labelKey: "guard.columns.eid",
        label: "EID"
    },

    identity_type: {
        labelKey: "guard.columns.identity_type",
        label: "Identity Type"
    },

    sid: {
        labelKey: "guard.columns.sid",
        label: "SID"
    },

    hardware_fp: {
        labelKey: "guard.columns.hardware_fp",
        label: "Hardware Fingerprint"
    }

};
async function loadDashboardFieldVisibility() {

    const res = await fetch(
        "/odisha/api/manager/dashboard-field-settings/GUARD2"
    );

    if (!res.ok) {
        console.error(
            "Failed to load Guard2 field visibility"
        );
        return;
    }

    const fields = await res.json();

    dashboardFieldVisibility = {};

    fields.forEach(field => {

        dashboardFieldVisibility[field.field_key] = {
            visible: Number(field.visible),
            display_order: Number(field.display_order)
        };

    });

    renderDashboardTableHeader();
}
function isDashboardFieldVisible(fieldKey) {

    return (
        dashboardFieldVisibility[fieldKey]?.visible !== 0
    );

}
function getOrderedVisibleDashboardFields() {

    return Object.keys(dashboardFields)
        .filter(fieldKey =>
            isDashboardFieldVisible(fieldKey)
        )
        .sort((a, b) => {

            const orderA =
                dashboardFieldVisibility[a]?.display_order ?? 9999;

            const orderB =
                dashboardFieldVisibility[b]?.display_order ?? 9999;

            return orderA - orderB;

        });

}
function renderDashboardTableHeader() {

    const header =
        document.querySelector("#tokenTable thead tr");

    header.innerHTML = "";

    // Always first
    const srTh = document.createElement("th");
    srTh.textContent = window.t(
    "guard.csv.serial_number",
    "#"
);
    header.appendChild(srTh);

    const fields =
        getOrderedVisibleDashboardFields();

    fields.forEach(fieldKey => {

        const th =
            document.createElement("th");

        th.dataset.field = fieldKey;

        th.textContent = window.t(
    dashboardFields[fieldKey].labelKey,
    dashboardFields[fieldKey].label
);

        header.appendChild(th);

    });

    // Serve / Undo is always present
    const actionTh =
        document.createElement("th");

    actionTh.textContent = window.t(
    "guard.serve",
    "Serve"
);

    actionTh.dataset.fixed = "serve";

    header.appendChild(actionTh);
}
function isUndoAllowed(visitedAt) {
  if (!visitedAt) return false;


const visitedTime = new Date(
  visitedAt.replace(" ","T")
).getTime();
  const now = Date.now();
  const diffMinutes = (now - visitedTime) / 60000;

  return diffMinutes <= 10;
}

async function loadPhysicalReferenceEntries() {

  try {

    const res = await fetch(
      "/odisha/api/guard/physical-reference-entry-guard2",
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
        "Failed to load physical/reference entries"
      );
    }

    const rows = await res.json();

    const tbody =
      document.querySelector(
        "#physicalReferenceTable tbody"
      );

    if (!rows.length) {

      tbody.innerHTML = `
        <tr>
          <td colspan="12">
            No physical/reference entries today.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = rows.map(r => `

      <tr>

        <td>${r.token || "-"}</td>

        <td>${r.name || "-"}</td>

        <td>${r.age ?? "-"}</td>

        <td>${r.mobile || "-"}</td>

        <td>${r.gender || "-"}</td>


        <td>${r.district || "-"}</td>

        <td>${r.eid || "-"}</td>

        <td>${r.service_type || "-"}</td>

        <td>${r.token_type || "-"}</td>

        <td>
          ${
            r.created_at
              ? formatDateTime(r.created_at)
              : "-"
          }
        </td>

        <td>${r.reference_of || "-"}</td>

      </tr>

    `).join("");

  } catch (err) {

    console.error(
      "Error loading physical/reference entries:",
      err
    );

  }

}

function getExpectedTime(tokenNumber) {

  const n = Number(tokenNumber);

  let slotIndex =
    Math.floor((n - 1) / TOKENS_PER_HOUR);

  if (slotIndex > 6) slotIndex = 6;

  const startHour = 11 + slotIndex;
  const endHour = startHour + 1;

  const format = h => {
    const hour = h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hour} ${ampm}`;
  };

  return `${format(startHour)} - ${format(endHour)}`;
}


async function undoVisited(tokenId) {
  await fetch("/odisha/api/guard/undo-visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-guard-token": guardToken
    },
    body: JSON.stringify({ token_id: tokenId })
  });

  loadTokens();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
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

function parseToken(token) {
  const parts = token.split("-");
  return {
    count: parts[0],     
    type: parts[1],      
    aadhaar: parts[2]    
  };
}
async function markEntry(tokenId) {
  await fetch("/odisha/api/guard/entry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-guard-token": guardToken
    },
    body: JSON.stringify({ token_id: tokenId })
  });

  loadTokens();
}
async function loadTokens() {
    const tphRes = await fetch("/odisha/api/guard/tokens-per-hour2", {
        headers: { "x-guard-token": guardToken }
        });

  const tphData = await tphRes.json();

TOKENS_PER_HOUR =
  tphData.tokensPerHour ??
  TOKENS_PER_HOUR;
tbody.innerHTML = `
    <tr>
        <td colspan="13">
            ${window.t("guard.status.loading", "Loading...")}
        </td>
    </tr>
`;

  const res = await fetch("/odisha/api/guard/service-tokens", {
    headers: { "x-guard-token": guardToken }
  });

  if (!res.ok) {
alert(
    window.t(
        "guard.status.session_expired",
        "Session expired"
    )
);
    logout();
    return;
  }

  const data = await res.json();
  currentTableData = data;
  tbody.innerHTML = "";
  const total = data.length;
  const visited = data.filter(r => r.visited === 1).length;
  const pending = total - visited;

  data.forEach((row, i) => {
    const tr = document.createElement("tr");
    const tokenParts = row.token.split("-");
    const tokenCount = tokenParts[0];
    const expectedTime = getExpectedTime(tokenCount);

    const { count, type } = parseToken(row.token);
    tr.classList.add(type.toLowerCase());

let visitedCell = "";

if (row.visited === 1) {

  if (isUndoAllowed(row.visited_at)) {

     visitedCell = `
            ${window.t("guard.served", "Served")}
            <button onclick="undoVisited(${row.id})">
                ${window.t("guard.undo", "Undo")}
            </button>
        `;

  } else {

    visitedCell =
            window.t("guard.served", "Served");
  }

} else {

  visitedCell = `
        <button onclick="markVisited(${row.id})">
            ${window.t("guard.serve", "Serve")}
        </button>
    `;
}


let cells = "";

const orderedFields =
    getOrderedVisibleDashboardFields();

orderedFields.forEach(fieldKey => {

    switch (fieldKey) {

        case "created_at":
            cells += `
                <td>
                    ${formatDateTime(row.created_at)}
                </td>
            `;
            break;

        case "date":
            cells += `
                <td>
                    ${formatDate(row.date)}
                </td>
            `;
            break;

        case "token_count":
            cells += `
                <td>
                    ${count || "-"}
                </td>
            `;
            break;

        case "token_type":
            cells += `
                <td>
                    ${type || "-"}
                </td>
            `;
            break;

        case "name":
            cells += `
                <td>
                    ${row.name || "-"}
                </td>
            `;
            break;

        case "mobile":
            cells += `
                <td>
                    ${row.mobile || "-"}
                </td>
            `;
            break;

        case "gender":
            cells += `
                <td>
                    ${row.gender || "-"}
                </td>
            `;
            break;

        case "age":
            cells += `
                <td>
                    ${row.age ?? "-"}
                </td>
            `;
            break;

        case "district":
            cells += `
                <td>
                    ${row.district || "-"}
                </td>
            `;
            break;

        case "service_type":
            cells += `
                <td>
                    ${row.service_type || "-"}
                </td>
            `;
            break;

        case "expected_time":
            cells += `
                <td>
                    ${expectedTime}
                </td>
            `;
            break;

        case "entry_time":
            cells += `
                <td>
                    ${
                        row.entry_time
                            ? formatDateTime(row.entry_time)
                            : "-"
                    }
                </td>
            `;
            break;

        case "visited_at":
            cells += `
                <td>
                    ${
                        row.visited_at
                            ? formatDateTime(row.visited_at)
                            : "-"
                    }
                </td>
            `;
            break;

        case "aadhaar_last4":
            cells += `
                <td>
                    ${row.aadhaar_last4 || "-"}
                </td>
            `;
            break;

        case "qrc":
            cells += `
                <td>
                    ${row.qrc || "-"}
                </td>
            `;
            break;

        case "divyang":
            cells += `
                <td>
                    ${row.divyang ?? "-"}
                </td>
            `;
            break;

        case "mode":
            cells += `
                <td>
                    ${row.mode || "-"}
                </td>
            `;
            break;

        case "priority":
            cells += `
                <td>
                    ${row.priority ?? "-"}
                </td>
            `;
            break;

        case "device_id":
            cells += `
                <td>
                    ${row.device_id || "-"}
                </td>
            `;
            break;

        case "visited":
            cells += `
                <td>
                    ${row.visited ?? "-"}
                </td>
            `;
            break;

        case "distance_meters":
            cells += `
                <td>
                    ${row.distance_meters ?? "-"}
                </td>
            `;
            break;

        case "token_seq":
            cells += `
                <td>
                    ${row.token_seq ?? "-"}
                </td>
            `;
            break;

        case "entry_marked":
            cells += `
                <td>
                    ${row.entry_marked ?? "-"}
                </td>
            `;
            break;

        case "eid":
            cells += `
                <td>
                    ${row.eid || "-"}
                </td>
            `;
            break;

        case "identity_type":
            cells += `
                <td>
                    ${row.identity_type || "-"}
                </td>
            `;
            break;

        case "sid":
            cells += `
                <td>
                    ${row.sid || "-"}
                </td>
            `;
            break;

        case "hardware_fp":
            cells += `
                <td>
                    ${row.hardware_fp || "-"}
                </td>
            `;
            break;

    }

});
tr.innerHTML = `
    <td>${i + 1}</td>
    ${cells}
    <td style="text-align:center">
        ${visitedCell}
    </td>
`;

    tbody.appendChild(tr);
  });
}
async function markVisited(tokenId) {
  await fetch("/odisha/api/guard/visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-guard-token": guardToken
    },
    body: JSON.stringify({ token_id: tokenId })
  });
  loadTokens();
  await loadPhysicalReferenceEntries();
}

function downloadCSV() {
  if (!currentTableData.length) {
    alert("No data to export");
    return;
  }

  const header = [
    "S.No",
    "Token Created",
    "Appointment / Walk-in Date",
    "Token Count",
    "Token Type",
    "Full Token",
    "Name",
    "Mobile",
    "Gender",
    "Age",
    "PWD",
    "District",
    "Service"
  ];

  let csv = header.join(",") + "\n";

  currentTableData.forEach((row, i) => {
    const { count, type, aadhaar } = parseToken(row.token);

    const line = [
      i + 1,
      formatDateTime(row.created_at),
      formatDate(row.date),
      count,
      type,
      row.token,
      row.name,
      row.mobile,
      row.gender,
      row.district,
      row.service_type
    ]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",");

    csv += line + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `guard_tokens_today.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

function logout() {
  localStorage.removeItem("guardToken");
  window.location.href = "guard-login.html";
}
window.addEventListener("languageChanged", () => {
    renderDashboardTableHeader();
    loadTokens();


});

(async () => {

    await loadDashboardFieldVisibility();

    loadTokens();

})();




