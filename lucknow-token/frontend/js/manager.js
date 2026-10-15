
const managerToken = localStorage.getItem("managerToken");
if (!managerToken) {
  window.location.href = "manager-login.html";
}

let currentTokensPerHour = 40; 
let districtChartInstance = null;
const calendar = document.getElementById("calendar");
const table = document.getElementById("tokenTable");
const tableHeading = document.getElementById("tableHeading");
const tbody = table.querySelector("tbody");
const actions = document.getElementById("tableActions");
const bulkDownloadBox =
  document.getElementById("bulkExportBox");
let currentDate = null;
let currentTableData = [];
let dashboardFieldVisibility = {};
const dashboardFields = {

    id: {
        label: "ID"
    },

    token: {
        label: "Token"
    },

    name: {
        label: "Name"
    },

    mobile: {
        label: "Mobile"
    },

    aadhaar_last4: {
        label: "Aadhaar Last 4"
    },

    age: {
        label: "Age"
    },

    gender: {
        label: "Gender"
    },

    divyang: {
        label: "Divyang"
    },

    district: {
        label: "District"
    },

    service_type: {
        label: "Service"
    },

    qrc: {
        label: "QRC"
    },

    date: {
        label: "Appointment / Walk-in Date"
    },

    mode: {
        label: "Mode"
    },

    priority: {
        label: "Priority"
    },

    created_at: {
        label: "Token Created"
    },

    device_id: {
        label: "Device ID"
    },

    token_type: {
        label: "Token Type"
    },

    visited: {
        label: "Visited"
    },

    visited_at: {
        label: "Serviced At"
    },

    distance_meters: {
        label: "Distance (m)"
    },

    token_seq: {
        label: "Token Sequence"
    },

    entry_marked: {
        label: "Entry Marked"
    },

    entry_time: {
        label: "Entry Time"
    },

    eid: {
        label: "EID"
    },

    identity_type: {
        label: "Identity Type"
    },

    sid: {
        label: "SID"
    },

    hardware_fp: {
        label: "Hardware Fingerprint"
    },

    service_other: {
        label: "Other Service"
    },

    // New dashboard-specific fields
    token_count: {
        label: "Token Count"
    },

    identity: {
        label: "EID / SID"
    },
    expected_time: {
        label: "Expected Time"
    },

    time_taken: {
        label: "Time Taken"
    },

    reference_of: {
        label: "Remarks"
    }

};
function renderDashboardTableHeader() {

    const header =
        document.getElementById("tokenTableHeader");

    header.innerHTML = "";

    // S.No. is always first
    const srTh = document.createElement("th");
    srTh.textContent = "S.No.";
    header.appendChild(srTh);

    const orderedFields =
        getOrderedVisibleDashboardFields();

    orderedFields.forEach(fieldKey => {

        const th =
            document.createElement("th");

        th.dataset.field = fieldKey;

        th.textContent =
            dashboardFields[fieldKey].label;

        header.appendChild(th);

    });
}

async function loadDashboardFieldVisibility(){

    const res =
        await fetch(
            "/lucknow/api/manager/dashboard-field-settings/MANAGER",
            {
                headers:{
                    "x-manager-token":managerToken
                }
            }
        );

    if(!res.ok){

        console.error(
            "Failed to load dashboard field visibility"
        );

        return;
    }

    const fields =
        await res.json();

    dashboardFieldVisibility = {};

    fields.forEach(field => {

        dashboardFieldVisibility[field.field_key] = {
            visible: Number(field.visible),
            display_order: Number(field.display_order)
        };

    });

    applyDashboardFieldVisibility();
}
function isDashboardFieldVisible(fieldKey){

    return (
        dashboardFieldVisibility[fieldKey]?.visible !== 0
    );

}
function getOrderedVisibleDashboardFields() {

    return Object.keys(dashboardFields)
        .filter(fieldKey => isDashboardFieldVisible(fieldKey))
        .sort((a, b) => {

            const orderA =
                dashboardFieldVisibility[a]?.display_order ?? 9999;

            const orderB =
                dashboardFieldVisibility[b]?.display_order ?? 9999;

            return orderA - orderB;
        });
}
function applyDashboardFieldVisibility(){

    renderDashboardTableHeader();

}
function openPrioritySettings() {
  window.location.href = "priority-settings.html";
}
async function loadOfficeName(){

    const res = await fetch(
        "/lucknow/api/manager/priority-settings"
    );

    const data = await res.json();

    const officeName =
        data.rules.find(
            r => r.rule_key === "office_short_name"
        )?.rule_value;

    if(officeName){

        document.getElementById(
            "dashboardHeading"
        ).innerText =
            "Manager Token Dashboard - " + officeName;

    }

}


async function downloadRangeCSV() {


const from =
  document.getElementById("fromDate").value;

const to =
  document.getElementById("toDate").value;
const res = await fetch(
  `/lucknow/api/manager/export-range-csv?from=${from}&to=${to}`,
  {
    headers: {
      "x-manager-token": managerToken
    }
  }
);

if (!res.ok) {
  alert("Export failed");
  return;
}

const blob = await res.blob();

const url = window.URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;

a.download =
  `tokens_${from}_to_${to}.csv`;

document.body.appendChild(a);

a.click();

a.remove();

window.URL.revokeObjectURL(url);
}


let WORK_START_TIME="11:00";

async function fetchWorkStartTime(date){

const res =
await fetch(
`/lucknow/api/manager/work-start-time?date=${date}`
);

const data =
await res.json();

WORK_START_TIME =
data.workStartTime || "11:00";

}



function getExpectedTime(tokenNumber, tokensPerHour) {

  const n = Number(tokenNumber);

  let slotIndex = Math.floor((n - 1) / tokensPerHour);

  if (slotIndex > 6) {
    slotIndex = 6;
  }

  const [hour, minute] =
    WORK_START_TIME.split(":").map(Number);

  let startMinutes =
    (hour * 60) + minute;

  startMinutes += slotIndex * 60;

  const endMinutes =
    startMinutes + 60;

  function formatTime(totalMinutes) {

    let h = Math.floor(totalMinutes / 60);

    const m = totalMinutes % 60;

    const ampm =
      h >= 12 ? "PM" : "AM";

    if (h > 12) {
      h -= 12;
    }

    if (h === 0) {
      h = 12;
    }

    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
}

function getTimeTaken(entry, visited) {

  const start = new Date(entry);
  const end = new Date(visited);

  const diffMs = end - start;

  const mins = Math.floor(diffMs / 60000);

  if (mins < 60) {
    return mins + " mins";
  }

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;

  return `${hrs} hr ${rem} mins`;
}
function renderSummaryTable(data) {
  const container = document.getElementById("dashboardBoxes");
  container.innerHTML = "";

  let html = `
    <table style="width:100%; border-collapse:collapse; background:white; font-size:12px;">
    <tr>
      <th style="padding:4px; font-weight:bold;">Sr No.</th>
      <th style="padding:4px; font-weight:bold;">Parameter</th>
      <th style="padding:4px; font-weight:bold;">Visited</th>
      <th style="padding:4px; font-weight:bold;">Not Visited</th>
      <th style="padding:4px; font-weight:bold;">Total</th>
    </tr>

  `;

  let sr = 1;



 data.gender.forEach(g => {
   html += `
     <tr style="background: #f1f8e9;">
       <td>${sr++}</td>
       <td>${g.gender}</td>
       <td style="color:green">${g.visited}</td>
       <td style="color:red">${g.not_visited}</td>
       <td>${g.total}</td>
     </tr>
   `;
 });

const genderVisited =
  data.gender.reduce((sum, g) => sum + g.visited, 0);

const genderNotVisited =
  data.gender.reduce((sum, g) => sum + g.not_visited, 0);

const genderTotal =
  data.gender.reduce((sum, g) => sum + g.total, 0);

html += `
  <tr style="background:#dbeafe; font-weight:bold;">
    <td colspan="2">Gender Grand Total</td>
    <td style="color:green">${genderVisited}</td>
    <td style="color:red">${genderNotVisited}</td>
    <td>${genderTotal}</td>
  </tr>
`;

html += `

    <tr style ="background: #f3e5f5;">
      <td>${sr++}</td>
      <td>Age 0-5</td>
      <td style="color:green">${data.age.age_0_5_visited}</td>
      <td style="color:red">${data.age.age_0_5_not}</td>
      <td>${data.age.age_0_5}</td>
    </tr>
    <tr style ="background: #f3e5f5;">
      <td>${sr++}</td>
      <td>Age 6-15</td>
      <td style="color:green">${data.age.age_6_15_visited}</td>
      <td style="color:red">${data.age.age_6_15_not}</td>
      <td>${data.age.age_6_15}</td>
    </tr>
    <tr style ="background: #f3e5f5;">
      <td>${sr++}</td>
      <td>Age 16-23</td>
      <td style="color:green">${data.age.age_16_23_visited}</td>
      <td style="color:red">${data.age.age_16_23_not}</td>
      <td>${data.age.age_16_23}</td>
    </tr>
    <tr style ="background: #f3e5f5;">
      <td>${sr++}</td>
      <td>Age 24+</td>
      <td style="color:green">${data.age.age_24_plus_visited}</td>
      <td style="color:red">${data.age.age_24_plus_not}</td>
      <td>${data.age.age_24_plus}</td>
    </tr>
  `;
  const ageVisited =
  data.age.age_0_5_visited +
  data.age.age_6_15_visited +
  data.age.age_16_23_visited +
  data.age.age_24_plus_visited;

const ageNot =
  data.age.age_0_5_not +
  data.age.age_6_15_not +
  data.age.age_16_23_not +
  data.age.age_24_plus_not;

const ageTotal =
  data.age.age_0_5 +
  data.age.age_6_15 +
  data.age.age_16_23 +
  data.age.age_24_plus;

html += `
  <tr style="background:#e9d5ff; font-weight:bold;">
    <td colspan="2">Age Grand Total</td>
    <td style="color:green">${ageVisited}</td>
    <td style="color:red">${ageNot}</td>
    <td>${ageTotal}</td>
  </tr>
`;

  html += `</table>`;

  html += `

    <table style="width:100%; border-collapse:collapse; background:white; font-size:12px;">
      <tr>
        <th style="padding:4px; font-weight:bold;">Sr No.</th>
        <th style="padding:4px; font-weight:bold;">Parameter</th>
        <th style="padding:4px; font-weight:bold;">Visited</th>
        <th style="padding:4px; font-weight:bold;">Not Visited</th>
        <th style="padding:4px; font-weight:bold;">Total</th>
      </tr>

  `;
  const serviceColors = [
  "#e8f5e9",
  "#e3f2fd",
  "#fff8e1",
  "#fce4ec",
  "#ede7f6",
  "#e0f7fa"
];

  data.services.forEach((s, index) => {
    const bg = serviceColors[index % serviceColors.length];
    html += `
      <tr style="background:${bg};">
        <td>${index + 1}</td>
        <td>${s.service_type}</td>
        <td style="color:green">${s.visited}</td>
        <td style="color:red">${s.not_visited}</td>
        <td>${s.total}</td>
      </tr>
    `;
  });
  const serviceVisited =
  data.services.reduce((sum, s) => sum + s.visited, 0);

const serviceNotVisited =
  data.services.reduce((sum, s) => sum + s.not_visited, 0);

const serviceTotal =
  data.services.reduce((sum, s) => sum + s.total, 0);

html += `
  <tr style="background:#dbeafe; font-weight:bold;">
    <td colspan="2">Service Grand Total</td>
    <td style="color:green">${serviceVisited}</td>
    <td style="color:red">${serviceNotVisited}</td>
    <td>${serviceTotal}</td>
  </tr>
`;

  html += `</table>`;



function getTokenTypeColor(tokenType) {
 if (tokenType === "AP") return "#fce4ec";
 if (tokenType === "AL") return "#e3f2fd";
 if (tokenType === "AN") return "#ffffff";

 if (tokenType === "WP") return "#fce4ec";
 if (tokenType === "WL") return "#e3f2fd";
 if (tokenType === "WN") return "#ffffff";
 
 if (tokenType === "PwD") return "#fff3cd";

 return "#ffffff";
}

let apTypes = ["AP", "AL", "AN"];

let wlTypes = ["WP", "WL", "WN"];
let physicalTypes = ["PT", "RT", "PwD"];
let apData = data.tokenTypes.filter(t => apTypes.includes(t.token_type));

let wlData =
  data.tokenTypes.filter(t => wlTypes.includes(t.token_type));

let physicalData =
  data.tokenTypes.filter(t => physicalTypes.includes(t.token_type));
let apVisited = 0, apNot = 0, apTotal = 0;
let wlVisited = 0, wlNot = 0, wlTotal = 0;

html += `
<table style="width:100%; border-collapse:collapse; background:white;">
<tr style="background:#f2f2f2;">
  <th>Sr No.</th>
  <th>Token Type</th>
  <th>Visited</th>
  <th>Not Visited</th>
  <th>Total</th>
  <th>Completion %</th>
</tr>
`;

let srNo = 1;


apData.forEach(t => {
  apVisited += t.visited;
  apNot += t.not_visited;
  apTotal += t.total;

  const bg = getTokenTypeColor(t.token_type);

  html += `
  <tr style="background:${bg};">
    <td>${srNo++}</td>
    <td>${t.token_type}</td>
    <td>${t.visited}</td>
    <td>${t.not_visited}</td>
    <td>${t.total}</td>
    <td>${t.total ? ((t.visited/t.total)*100).toFixed(1) : 0}%</td>
  </tr>
  `;
});

html += `
<tr style="background:#ffd8cc; font-weight:bold;">
  <td colspan="2">Appointment Subtotal</td>
  <td>${apVisited}</td>
  <td>${apNot}</td>
  <td>${apTotal}</td>
  <td>${apTotal ? ((apVisited/apTotal)*100).toFixed(1) : 0}%</td>
</tr>
`;

wlData.forEach(t => {
  wlVisited += t.visited;
  wlNot += t.not_visited;
  wlTotal += t.total;

  const bg = getTokenTypeColor(t.token_type);

  html += `
  <tr style="background:${bg};">
    <td>${srNo++}</td>
    <td>${t.token_type}</td>
    <td>${t.visited}</td>
    <td>${t.not_visited}</td>
    <td>${t.total}</td>
    <td>${t.total ? ((t.visited/t.total)*100).toFixed(1) : 0}%</td>
  </tr>
  `;
});
physicalData.forEach(t => {

  wlVisited += t.visited;
  wlNot += t.not_visited;
  wlTotal += t.total;

  const bg = getTokenTypeColor(t.token_type);

  html += `
  <tr style="background:${bg};">
    <td>${srNo++}</td>
    <td>${t.token_type}</td>
    <td>${t.visited}</td>
    <td>${t.not_visited}</td>
    <td>${t.total}</td>
    <td>${t.total ? ((t.visited/t.total)*100).toFixed(1) : 0}%</td>
  </tr>
  `;
});

html += `
<tr style="background:#cdeccd; font-weight:bold;">
  <td colspan="2">Walk-in Subtotal</td>
  <td>${wlVisited}</td>
  <td>${wlNot}</td>
  <td>${wlTotal}</td>
  <td>${wlTotal ? ((wlVisited/wlTotal)*100).toFixed(1) : 0}%</td>
</tr>
`;



const grandVisited = apVisited + wlVisited;
const grandNot = apNot + wlNot;
const grandTotal = apTotal + wlTotal;

html += `
<tr style="background:#f9f9f9; font-weight:bold;">
  <td colspan="2">Grand Total</td>
  <td>${grandVisited}</td>
  <td>${grandNot}</td>
  <td>${grandTotal}</td>
  <td>${grandTotal ? ((grandVisited/grandTotal)*100).toFixed(1) : 0}%</td>
</tr>
`;

html += `</table>`;

html += `
<table style="width:100%; border-collapse:collapse; background:white;">
<tr style="background:#f2f2f2;">
  <th>Sr No.</th>
  <th>Time Slot</th>
  <th>Visited</th>
</tr>
`;

data.hourlyStats.forEach((h, index) => {

  html += `
    <tr>
      <td>${index + 1}</td>
      <td>${h.label}</td>
      <td style="color:green">${h.visited}</td>
    </tr>
  `;
});

html += `</table>`;



const ctx = document.getElementById("districtChart");


if (districtChartInstance) {
  districtChartInstance.destroy();
}

if (ctx && data.districts && data.districts.length > 0) {
  districtChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: data.districts.map(d => d.district),
      datasets: [{
        data: data.districts.map(d => d.total),
        backgroundColor: [
          "#4CAF50",
          "#2196F3",
          "#FF9800",
          "#9C27B0",
          "#F44336",
          "#00BCD4",
          "#8BC34A",
          "#FFEB3B",
          "#E91E63",
          "#3F51B5"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
          text: "Visited Distribution by District"
        }
      }
    }
  });
}

  container.innerHTML = html;
}

async function loadDashboard(date) {
await fetchWorkStartTime(date);

  const res = await fetch(
    `/lucknow/api/manager/dashboard?date=${date}`,
    {
      headers: { "x-manager-token": managerToken }
    }
  );

  const data = await res.json();

currentTokensPerHour =
  data.tokensPerHour ??
  currentTokensPerHour;


  renderSummaryTable(data);
}



function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


function formatDateTime(dt) {

  if(!dt) return "-";

  const fixed =
    dt.replace(" ", "T");

  return new Date(fixed).toLocaleString(
    "en-IN",
    {
      timeZone:"Asia/Kolkata",
      day:"2-digit",
      month:"short",
      year:"numeric",
      hour:"2-digit",
      minute:"2-digit",
      hour12:true
    }
  );
}

function parseToken(token) {
  const parts = token.split("-");
  return {

    count: parts[0],     
    type: parts[1],      
    aadhaar: parts[2]    

  };
}


function refreshCurrent() {
  if (currentDate) {
    loadTokens(currentDate);
  } else {
    loadCalendar();
  }
}
async function saveTokensPerHour(date) {
  const input = document.getElementById(`tph-${date}`);
  const value = Number(input.value);

  if (!value || value <= 0) {
    alert("Enter valid number");
    return;
  }

  await fetch("/lucknow/api/manager/set-tokens-per-hour", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-manager-token": managerToken
    },
    body: JSON.stringify({
      date,
      tokens_per_hour: value
    })
  });

  alert("Updated successfully");
}

async function loadCalendar() {
  calendar.innerHTML = "Loading...";

  const res = await fetch("/lucknow/api/manager/calendar", {
    headers: { "x-manager-token": managerToken }
  });

  if (!res.ok) {
    calendar.innerHTML = "Failed to load calendar";
    return;
  }

  const data = await res.json();

  if (!Array.isArray(data)) {

    calendar.innerHTML = "Invalid calendar data";
    return;
  }

  calendar.innerHTML = "";

  data.forEach(d => {
    const div = document.createElement("div");
    div.className = "date-box";

div.innerHTML = `
  <b>${d.date}</b><br>
  Appointment: ${d.appointment_booked}/${d.appointment_total}<br>
  Walk-in: ${d.walkin_booked}/${d.walkin_total}<br><br>

  <small>Tokens / Hour:</small><br>
  <input type="number" 
         value="${d.tokens_per_hour ?? currentTokensPerHour}"
         min="1"
         style="width:60px;"
         id="tph-${d.date}">
  
  <button class="mini-btn save-btn" onclick="saveTokensPerHour('${d.date}')">
    Save
  </button>
`;

div.innerHTML += `
  <br>
  <button class="mini-btn edit-btn"
    onclick="editSlots('${d.date}', ${d.appointment_total}, ${d.walkin_total}); event.stopPropagation();">
    Edit Slots
  </button>
`;

    div.onclick = () => loadTokens(d.date);
    calendar.appendChild(div);
  });
}
async function editSlots(date, ap, wl) {


  const newAp = prompt("Enter Appointment Slots:", ap);
  if (newAp === null) return;

  const newWl = prompt("Enter Walk-in Slots:", wl);
  if (newWl === null) return;

  await fetch("/lucknow/api/manager/update-slots", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-manager-token": managerToken
    },
    body: JSON.stringify({
      date,
      appointment_total: Number(newAp),
      walkin_total: Number(newWl)
    })
  });

  alert("Slots updated");
  loadCalendar();
}


async function loadTokens(date) {
  
  currentDate = date;
  await loadDashboard(date);
  tbody.innerHTML = "Loading...";
  table.style.display = "table";
  tableHeading.innerText = "Token Details for " + formatDate(date);
  tableHeading.style.display = "block";
  actions.style.display = "flex";
  bulkDownloadBox.style.display = "flex";

  const res = await fetch(`/lucknow/api/manager/tokens?date=${date}`, {
    headers: { "x-manager-token": managerToken }
  });
  
const data = await res.json();
document.getElementById("summaryHeading").style.display = "block";
document.getElementById("summaryHeading").innerText =
  "Dashboard Summary for " + formatDate(date);

currentTableData = data; 
  tbody.innerHTML = "";
  let previousSource = null;
  data.forEach((row, i) => {
     if (
  row.source_type === "physical_reference" &&
  previousSource !== row.source_type
) {

      const dividerRow = document.createElement("tr");

      dividerRow.innerHTML = `
        <td
    colspan="${getOrderedVisibleDashboardFields().length + 1}"
            style="
              background:#1e293b;
              color:white;
              text-align:center;
              font-weight:bold;
              font-size:14px;
              padding:12px;
            ">
          ${
            row.source_type === "physical_reference"
              ? "PHYSICAL / REFERENCE TOKENS"
              : "NORMAL TOKENS"
          }
        </td>
      `;

      tbody.appendChild(dividerRow);

      previousSource = row.source_type;
    }
  
  
  
    const tr = document.createElement("tr");

const tokenValue = row.token || "-";

const tokenParts =
  tokenValue.includes("-")
    ? tokenValue.split("-")
    : [tokenValue, "-", "-"];

const tokenCount = tokenParts[0] || "-";
const tokenType  = tokenParts[1] || row.token_type || "-";
    const expectedTime =
  row.source_type === "physical_reference"
    ? "-"
    : getExpectedTime(tokenCount,currentTokensPerHour);
    const aadhaar    = tokenParts[2];
const identity =
    row.eid ||
    row.sid ||
    "-";
    const timeTaken =
    row.entry_time && row.visited_at
    ? getTimeTaken(
        row.entry_time,
        row.visited_at
    )
    : "-";
 if (tokenType === "AP") tr.style.background = "#fce4ec";
else if (tokenType === "AL") tr.style.background = "#e3f2fd";
else if (tokenType === "AN") tr.style.background = "#ffffe0";

else if (tokenType === "WP") tr.style.background = "#fce4ec";
else if (tokenType === "WL") tr.style.background = "#e3f2fd";
else if (tokenType === "WN") tr.style.background = "#ffffff";
let cells = "";

const orderedFields =
    getOrderedVisibleDashboardFields();

orderedFields.forEach(fieldKey => {

    switch (fieldKey) {

        case "id":
            cells += `
                <td>
                    ${row.id ?? "-"}
                </td>
            `;
            break;

        case "token":
            cells += `
                <td>
                    ${row.token || "-"}
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

        case "aadhaar_last4":
            cells += `
                <td>
                    ${row.aadhaar_last4 || "-"}
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

        case "gender":
            cells += `
                <td>
                    ${row.gender || "-"}
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

        case "district":
            cells += `
                <td>
                    ${
                        row.district
                            ? row.district.split("/")[0].trim()
                            : "-"
                    }
                </td>
            `;
            break;

        case "service_type":
            cells += `
                <td>
                    ${
                        row.service_type
                            ? row.service_type.split("/")[0].trim()
                            : "-"
                    }
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

        case "date":
            cells += `
                <td>
                    ${formatDate(row.date)}
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

        case "created_at":
            cells += `
                <td>
                    ${formatDateTime(row.created_at)}
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

        case "token_type":
            cells += `
                <td>
                    ${tokenType}
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

        case "visited_at":
            cells += `
                <td
                    style="
                        color:${row.visited_at ? "green" : "red"};
                        font-weight:bold;
                    "
                >
                    ${
                        row.visited_at
                            ? formatDateTime(row.visited_at)
                            : "Not Visited"
                    }
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

        case "entry_time":
            cells += `
                <td
                    style="
                        color:${row.entry_time ? "blue" : "red"};
                        font-weight:bold;
                    "
                >
                    ${
                        row.entry_time
                            ? formatDateTime(row.entry_time)
                            : "Not Entered"
                    }
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

        case "service_other":
            cells += `
                <td>
                    ${row.service_other || "-"}
                </td>
            `;
            break;

        case "token_count":
            cells += `
                <td>
                    ${tokenCount}
                </td>
            `;
            break;

        case "identity":
            cells += `
                <td>
                    ${identity}
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

        case "time_taken":
            cells += `
                <td>
                    ${timeTaken}
                </td>
            `;
            break;

        case "reference_of":
            cells += `
                <td>
                    ${row.reference_of || "-"}
                </td>
            `;
            break;
    }

});

tr.innerHTML = `
    <td>${i + 1}</td>
    ${cells}
`;

    tbody.appendChild(tr);
    
    
  });
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
    "EID/ SID",
    "QRC",
    "Name",
    "Mobile",
    "Service Type",
    "Gender",
    "Age",
    "District",
    "Reference Of",
    "Entry Time",
    "Visited Time"
  ];

  let csv = header.join(",") + "\n";

  currentTableData.forEach((row, i) => {

const safeToken = row.token || "-";

const { count, type, aadhaar } =
  safeToken.includes("-")
    ? parseToken(safeToken)
    : {
        count: safeToken,
        type: row.token_type || "-",
        aadhaar: "-"
      };

    const cleanService = row.service_type
  ? row.service_type.split("/")[0].trim()
  : "";

    const cleanDistrict = row.district
      ? row.district.split("/")[0].trim()
      : "";

    const line = [
      i + 1,
      formatDateTime(row.created_at),
      row.date,
      count,
      type,
      row.token,

      row.eid ? `="${row.eid}"` : row.sid,
      row.qrc,
      row.name,
      row.mobile,
      cleanService,      
      row.gender,
      row.age,
      cleanDistrict,
      row.reference_of || "-",
      row.entry_time ? formatDateTime(row.entry_time) : "Not Entered",
      row.visited_at ? formatDateTime(row.visited_at) : "Not Visited"     
    ]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",");

    csv += line + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `tokens_${currentDate}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

function logout() {
  localStorage.removeItem("managerToken");
  window.location.href = "manager-login.html";
}
(async () => {

    await loadDashboardFieldVisibility();

    loadCalendar();

    loadOfficeName();

    bulkDownloadBox.style.display = "none";

})();


