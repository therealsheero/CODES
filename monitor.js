const basePath = "/monitor";
const API_BASE = `${basePath}/api`;
const TOKEN_KEY = "monitor_session_token";

let charts = {};
let mapInstance = null;

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function api(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", "x-monitor-token": getToken() || "" };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (res.status === 401) { clearToken(); window.location.href = `${basePath}/login.html`; return null; }
  return res.json();
}

function getFilters() {
  const region = document.getElementById("filterRegion").value;
  const from = document.getElementById("filterFrom").value;
  const to = document.getElementById("filterTo").value;
  let qs = `?region=${region}`;
  if (from) qs += `&from=${from}`;
  if (to) qs += `&to=${to}`;
  return qs;
}
function getHeatmapFilters() {
    const visitStatus =
        document.getElementById("heatmapVisitStatus")?.value || "all";

    const entryStatus =
        document.getElementById("heatmapEntryStatus")?.value || "all";

    let qs = getFilters();

    qs += `&visit_status=${encodeURIComponent(visitStatus)}`;
    qs += `&entry_status=${encodeURIComponent(entryStatus)}`;

    return qs;
}

function formatPdfDate(dateString) {
    if (!dateString) return "";

    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getPdfDateRange() {
    const fromInput = document.getElementById("filterFrom");
    const toInput = document.getElementById("filterTo");

    const selectedFrom = fromInput ? fromInput.value : "";
    const selectedTo = toInput ? toInput.value : "";


    if (selectedFrom && selectedTo) {
        return {
            from: selectedFrom,
            to: selectedTo
        };
    }

    const trendChart = charts.trendChart;

    if (trendChart && trendChart.data && trendChart.data.labels) {
        const labels = trendChart.data.labels.filter(Boolean);

        if (labels.length > 0) {
            const dataFrom = labels[0];
            const dataTo = labels[labels.length - 1];

            return {
                from: selectedFrom || dataFrom,
                to: selectedTo || dataTo
            };
        }
    }

    return {
        from: selectedFrom || "",
        to: selectedTo || ""
    };
}

function addPdfFooter(pdf) {
    const { from, to } = getPdfDateRange();

    const downloadedOn = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    let dateRangeText = "Data Range: ";

    if (from && to) {
        dateRangeText += `${formatPdfDate(from)} – ${formatPdfDate(to)}`;
    } else if (from) {
        dateRangeText += `${formatPdfDate(from)} – Present`;
    } else if (to) {
        dateRangeText += `Up to ${formatPdfDate(to)}`;
    } else {
        dateRangeText += "All available data";
    }

    const pageCount = pdf.internal.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
        pdf.setPage(page);

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.2);

        pdf.line(
            8,
            pageHeight - 13,
            pageWidth - 8,
            pageHeight - 13
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);

        pdf.text(
            dateRangeText,
            8,
            pageHeight - 7
        );

        pdf.text(
            `Downloaded On: ${downloadedOn}`,
            pageWidth - 8,
            pageHeight - 7,
            {
                align: "right"
            }
        );
    }
}

async function verifySession() {
  const data = await api("/verify-session");
  if (data && data.valid) {
    document.getElementById("dashboardApp").style.display = "block";
    loadDashboard();
  }
}

let dashboardLoading = false;
let pendingDashboardLoad = false;

async function loadDashboard() {
  if (dashboardLoading) {
    pendingDashboardLoad = true;
    return;
  }
  dashboardLoading = true;
  pendingDashboardLoad = false;

  try {
    const lastUpdatedElem = document.getElementById("lastUpdated");
    if (lastUpdatedElem) {
      lastUpdatedElem.innerText = `Last Updated: ${new Date().toLocaleTimeString()}`;
    }

    await Promise.all([
      loadKPI(),
      loadServiceChart(),
      loadModeChart(),
      loadHourlyChart(),
      loadDemographicChart(),
      loadTrendChart(),
      loadRegionCompare(),
      loadVisitChart(),
      loadMap(),
      loadDistrictTable(),
      loadSlotTable()
    ]);
  } catch (err) {
    console.error("Dashboard load error:", err);
  } finally {
    dashboardLoading = false;
    if (pendingDashboardLoad) {
      pendingDashboardLoad = false;
      loadDashboard();
    }
  }
}

async function loadKPI() {
  const res = await api(`/kpi/summary${getFilters()}`);
  if (!res || !res.data) return;
  const d = res.data;

  document.getElementById('kpiTotalTokens').innerText = (d.total_tokens || 0).toLocaleString();
  document.getElementById('kpiTotalVisits').innerText = (d.total_visits || 0).toLocaleString();
  document.getElementById('kpiNotVisited').innerText = (d.not_visited || 0).toLocaleString();
  document.getElementById('kpiVisitRate').innerText = ((d.visit_rate || 0) * 100).toFixed(1) + "%";
  document.getElementById('kpiAppointment').innerText = (d.appointment_tokens || 0).toLocaleString();
  document.getElementById('kpiWalkin').innerText = (d.walkin_tokens || 0).toLocaleString();
  document.getElementById('kpiMale').innerText = (d.male_count || 0).toLocaleString();
  document.getElementById('kpiFemale').innerText = (d.female_count || 0).toLocaleString();
  document.getElementById('kpiOthers').innerText =
    (d.others_count || 0).toLocaleString();

  const hourData = await api(`/tokens/by-hour${getFilters()}`);
  if (hourData && hourData.data && hourData.data.length > 0) {
    const busiest = hourData.data.reduce((max, current) => current.count > max.count ? current : max, hourData.data[0]);
    document.getElementById('kpiBusiestHour').innerText = busiest.hour + ":00";
  }
}

async function loadServiceChart() {
  const data = await api(`/tokens/by-service${getFilters()}`);
  if (!data || !data.data) return;
  
  const ctx = document.getElementById('serviceChart').getContext('2d');
  if (charts.serviceChart) charts.serviceChart.destroy();
  
  charts.serviceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.data.map(d => d.service_type),
      datasets: [{
        data: data.data.map(d => d.count),
        backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function loadModeChart() {
  const data = await api(`/tokens/by-mode${getFilters()}`);
  if (!data || !data.data) return;
  
  const ctx = document.getElementById('modeChart').getContext('2d');
  if (charts.modeChart) charts.modeChart.destroy();
  
  charts.modeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.data.map(d => d.label || d.mode),
      datasets: [{
        data: data.data.map(d => d.count),
        backgroundColor: data.data.map(d => {
    if (d.mode === 'A') return '#10b981';
    if (d.mode === 'W') return '#f59e0b';
    return '#6366f1';
})
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function loadHourlyChart() {
  const data = await api(`/tokens/by-hour${getFilters()}`);
  if (!data || !data.data) return;
  
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  if (charts.hourlyChart) charts.hourlyChart.destroy();
  
  charts.hourlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.data.map(d => d.hour + ':00'),
      datasets: [{
        label: 'Tokens',
        data: data.data.map(d => d.count),
        backgroundColor: '#3b82f6'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function loadDemographicChart() {
  const data = await api(`/tokens/by-age-gender${getFilters()}`);
  if (!data || !data.data) return;
  
  const grouped = {};
  data.data.forEach(d => {
    if (!grouped[d.age_group]) grouped[d.age_group] = { male: 0, female: 0, other: 0 };
    const gen = d.gender.toLowerCase();
    if (gen.startsWith('m')) grouped[d.age_group].male += d.count;
    else if (gen.startsWith('f')) grouped[d.age_group].female += d.count;
    else grouped[d.age_group].other += d.count;
  });
  
  const labels = Object.keys(grouped).sort();
  
  const ctx = document.getElementById('demographicChart').getContext('2d');
  if (charts.demographicChart) charts.demographicChart.destroy();
  
  charts.demographicChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Male', data: labels.map(l => grouped[l].male), backgroundColor: '#3b82f6' },
        { label: 'Female', data: labels.map(l => grouped[l].female), backgroundColor: '#ec4899' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true }
      }
    }
  });
}

async function loadTrendChart() {
  const data = await api(`/tokens/trend${getFilters()}`);
  if (!data || !data.data) return;
  
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (charts.trendChart) charts.trendChart.destroy();
  
  charts.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.data.map(d => d.date),
      datasets: [{
        label: 'Tokens Generated',
        data: data.data.map(d => d.count),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function loadRegionCompare() {
  const data = await api(`/region-compare${getFilters()}`);
  if (!data || !data.data) return;
  
  const ctx = document.getElementById('regionCompareChart').getContext('2d');
  if (charts.regionCompareChart) charts.regionCompareChart.destroy();
  
  charts.regionCompareChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.data.map(d => d.label),
      datasets: [{
        label: 'Total Tokens',
        data: data.data.map(d => d.total_tokens),
        backgroundColor: '#8b5cf6'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function loadVisitChart() {
  const data = await api(`/tokens/visit-analysis${getFilters()}`);
  if (!data || !data.data) return;
  
  const ctx = document.getElementById('visitChart').getContext('2d');
  if (charts.visitChart) charts.visitChart.destroy();
  
  charts.visitChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.data.map(d => d.month),
      datasets: [
        { label: 'Visited', data: data.data.map(d => d.visited), backgroundColor: '#10b981' },
        { label: 'Not Visited', data: data.data.map(d => d.not_visited), backgroundColor: '#ef4444' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function loadDistrictTable() {
  const data = await api(`/tokens/by-district${getFilters()}`);
  if (!data || !data.data) return;
  
  const tbody = document.getElementById('districtTableBody');
  tbody.innerHTML = '';
  data.data.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.district}</td>
      <td>${d.count.toLocaleString()}</td>
      <td>${(d.percentage || 0).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadSlotTable() {
  const data = await api(`/slots/status`);
  if (!data || !data.data) return;
  
  const tbody = document.getElementById('slotTableBody');
  tbody.innerHTML = '';
  data.data.forEach(d => {
    const total = d.appointment_total + d.walkin_total;
    const booked = d.appointment_booked + d.walkin_booked;
    const utilized = total > 0 ? ((booked / total) * 100).toFixed(1) : 0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.label || d.region}</td>
      <td>${d.appointment_total}</td>
      <td>${d.appointment_booked}</td>
      <td>${d.walkin_total}</td>
      <td>${d.walkin_booked}</td>
      <td>${utilized}%</td>
    `;
    tbody.appendChild(tr);
  });
}


async function loadMap() {

    const data = await api(`/geo/heatmap${getHeatmapFilters()}`);

    if (!data || !data.regions) return;

    if (mapInstance) {
        mapInstance.remove();
    }

    mapInstance = L.map('mapContainer');

    L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_32yl_1_371f04ce9965bc6829c6a293',
        {
            attribution:
                '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }
    ).addTo(mapInstance);

    try {

        const coverageRes = await fetch(
            `${basePath}/js/geojson/ro_coverage.json`
        );

        if (!coverageRes.ok) {
            throw new Error(
                `Failed to load ro_coverage.json: ${coverageRes.status}`
            );
        }

        const roCoverage = await coverageRes.json();

        const selectedRegion =
            document.getElementById("filterRegion")?.value || "all";


        /*
         * ============================================================
         * ALL REGIONS VIEW
         * ============================================================
         */

        if (selectedRegion === "all") {

            const geoRes = await fetch(
                `${basePath}/js/geojson/india.geojson`
            );

            if (!geoRes.ok) {
                throw new Error(
                    `Failed to load india.geojson: ${geoRes.status}`
                );
            }

            const geoData = await geoRes.json();


            /*
             * Build state -> RO mapping
             */

            const stateToRegion = {};

            Object.entries(roCoverage).forEach(
                ([region, states]) => {

                    states.forEach(state => {
                        stateToRegion[state.toLowerCase()] = region;
                    });

                }
            );


            /*
             * RO token totals
             */

            const regionTokenCount = {};

            data.regions.forEach(r => {

                regionTokenCount[r.region.toLowerCase()] =
                    Number(r.total_tokens || 0);

            });


            /*
             * RO values used for legend
             */

            const tokenValues = data.regions
                .map(r => Number(r.total_tokens || 0))
                .filter(v => v > 0);


            function calculateQuantiles(values) {

                if (values.length === 0) {
                    return [0, 0, 0, 0, 0];
                }

                const sorted = [...values].sort(
                    (a, b) => a - b
                );

                function q(p) {

                    return sorted[
                        Math.min(
                            Math.floor(sorted.length * p),
                            sorted.length - 1
                        )
                    ];

                }

                return [
                    q(0.80),
                    q(0.60),
                    q(0.40),
                    q(0.20),
                    sorted[0]
                ];

            }


            const colorRanges =
                calculateQuantiles(tokenValues);


            function getColor(value) {

                if (!value || value <= 0) {
                    return '#f1f5f9';
                }

                const r = colorRanges;

                return value >= r[0] ? '#b10026' :
                       value >= r[1] ? '#f03b20' :
                       value >= r[2] ? '#fd8d3c' :
                       value >= r[3] ? '#fbe106' :
                       value >= r[4] ? '#a1d76a' :
                                      '#66bd63';
            }


            /*
             * RO legend
             */

            const legend = L.control({
                position: 'bottomright'
            });

            legend.onAdd = function () {

                const div =
                    L.DomUtil.create('div', 'info legend');

                const r = colorRanges;

                div.innerHTML = `
                    <div style="
                        background:white;
                        padding:10px 12px;
                        border-radius:6px;
                        box-shadow:0 1px 5px rgba(0,0,0,0.25);
                        font-size:12px;
                    ">

                        <strong>RO Token Volume</strong>

                        <div>
                            <span style="
                                display:inline-block;
                                width:14px;
                                height:14px;
                                background:#b10026;
                                margin-right:6px;
                            "></span>
                            ${Number(r[0]).toLocaleString()}+
                        </div>

                        <div>
                            <span style="
                                display:inline-block;
                                width:14px;
                                height:14px;
                                background:#f03b20;
                                margin-right:6px;
                            "></span>
                            ${Number(r[1]).toLocaleString()}
                            – ${Number(r[0] - 1).toLocaleString()}
                        </div>

                        <div>
                            <span style="
                                display:inline-block;
                                width:14px;
                                height:14px;
                                background:#fd8d3c;
                                margin-right:6px;
                            "></span>
                            ${Number(r[2]).toLocaleString()}
                            – ${Number(r[1] - 1).toLocaleString()}
                        </div>

                        <div>
                            <span style="
                                display:inline-block;
                                width:14px;
                                height:14px;
                                background:#fbe106;
                                margin-right:6px;
                            "></span>
                            ${Number(r[3]).toLocaleString()}
                            – ${Number(r[2] - 1).toLocaleString()}
                        </div>

                        <div>
                            <span style="
                                display:inline-block;
                                width:14px;
                                height:14px;
                                background:#a1d76a;
                                margin-right:6px;
                            "></span>
                            ${Number(r[4]).toLocaleString()}
                            – ${Number(r[3] - 1).toLocaleString()}
                        </div>

                        <div>
                            <span style="
                                display:inline-block;
                                width:14px;
                                height:14px;
                                background:#66bd63;
                                margin-right:6px;
                            "></span>
                            Below ${Number(r[4]).toLocaleString()}
                        </div>

                    </div>
                `;

                return div;
            };

            legend.addTo(mapInstance);


            /*
             * State-level RO map
             */

            L.geoJSON(geoData, {

                style: function (feature) {

                    const stateName =
                        feature.properties.st_nm ||
                        feature.properties.NAME_1 ||
                        feature.properties.name ||
                        "";

                    const stateKey =
                        stateName.toLowerCase();

                    const region =
                        stateToRegion[stateKey];

                    const regionData = region
                        ? data.regions.find(
                            r =>
                                r.region.toLowerCase() === region
                        )
                        : null;

                    const roTokens = regionData
                        ? Number(regionData.total_tokens || 0)
                        : 0;

                    return {
                        fillColor: roTokens > 0
                            ? getColor(roTokens)
                            : '#f1f5f9',
                        weight: 1,
                        opacity: 1,
                        color: '#ffffff',
                        fillOpacity: roTokens > 0
                            ? 0.85
                            : 0.4
                    };

                },


                onEachFeature: function (feature, layer) {

                    const stateName =
                        feature.properties.st_nm ||
                        feature.properties.NAME_1 ||
                        feature.properties.name ||
                        "Unknown";

                    const stateKey =
                        stateName.toLowerCase();

                    const region =
                        stateToRegion[stateKey];

                    if (!region) {
                        layer.bindPopup(
                            `<b>${stateName}</b>`
                        );
                        return;
                    }

                    const regionData =
                        data.regions.find(
                            r =>
                                r.region.toLowerCase() === region
                        );

                    if (!regionData) return;

                    layer.bindTooltip(
                        `<b>${stateName}</b><br>
                         RO: ${regionData.label || regionData.region}<br>
                         Tokens: ${Number(
                             regionData.total_tokens || 0
                         ).toLocaleString()}`,
                        {
                            sticky: true
                        }
                    );

                    layer.bindPopup(`
                        <b>${stateName}</b><br>
                        RO: ${regionData.label || regionData.region}<br>
                        Tokens: ${Number(
                            regionData.total_tokens || 0
                        ).toLocaleString()}
                    `);

                }

            }).addTo(mapInstance);


            mapInstance.setView([22.5, 82.5], 4.5);

            return;
        }


        /*
         * ============================================================
         * SELECTED RO → DISTRICT VIEW
         * ============================================================
         */

        const selectedStates =
            roCoverage[selectedRegion] || [];


        if (selectedStates.length === 0) {

            console.warn(
                `No states configured for RO: ${selectedRegion}`
            );

            mapInstance.setView([22.5, 82.5], 4.5);

            return;
        }


        /*
         * Get district-level data for selected RO
         */

        const districtData =
            await api(`/tokens/by-district${getHeatmapFilters()}`);

        if (!districtData || !districtData.data) {
            console.error(
                "District data unavailable"
            );
            return;
        }


        /*
         * Build:
         *
         * district name -> count
         */

        const districtMap = {};

        districtData.data.forEach(d => {

            const key =
                String(d.district || "")
                    .trim()
                    .toLowerCase();

            if (!key) return;

            districtMap[key] = {
                district: d.district,
                count: Number(d.count || 0),
                percentage: Number(d.percentage || 0)
            };

        });


        /*
         * District values for legend
         */

        const districtValues =
            districtData.data
                .map(d => Number(d.count || 0))
                .filter(v => v > 0);


        function calculateDistrictQuantiles(values) {

            if (values.length === 0) {
                return [0, 0, 0, 0, 0];
            }

            const sorted =
                [...values].sort((a, b) => a - b);

            function q(p) {

                return sorted[
                    Math.min(
                        Math.floor(sorted.length * p),
                        sorted.length - 1
                    )
                ];

            }

            return [
                q(0.80),
                q(0.60),
                q(0.40),
                q(0.20),
                sorted[0]
            ];

        }


        const districtRanges =
            calculateDistrictQuantiles(
                districtValues
            );


        /*
         * District colour
         */

        function getDistrictColor(value) {

            if (!value || value <= 0) {
                return '#f1f5f9';
            }

            const r = districtRanges;

            return value >= r[0] ? '#b10026' :
                   value >= r[1] ? '#f03b20' :
                   value >= r[2] ? '#fd8d3c' :
                   value >= r[3] ? '#fbe106' :
                   value >= r[4] ? '#a1d76a' :
                                  '#66bd63';

        }


        /*
         * District legend
         */

        const districtLegend =
            L.control({
                position: 'bottomright'
            });


        districtLegend.onAdd = function () {

            const div =
                L.DomUtil.create(
                    'div',
                    'info legend'
                );

            const r = districtRanges;

            div.innerHTML = `
                <div style="
                    background:white;
                    padding:10px 12px;
                    border-radius:6px;
                    box-shadow:0 1px 5px rgba(0,0,0,0.25);
                    font-size:12px;
                ">

                    <strong>District Token Volume</strong>

                    <div>
                        <span style="
                            display:inline-block;
                            width:14px;
                            height:14px;
                            background:#b10026;
                            margin-right:6px;
                        "></span>
                        ${Number(r[0]).toLocaleString()}+
                    </div>

                    <div>
                        <span style="
                            display:inline-block;
                            width:14px;
                            height:14px;
                            background:#f03b20;
                            margin-right:6px;
                        "></span>
                        ${Number(r[1]).toLocaleString()}
                        – ${Number(r[0] - 1).toLocaleString()}
                    </div>

                    <div>
                        <span style="
                            display:inline-block;
                            width:14px;
                            height:14px;
                            background:#fd8d3c;
                            margin-right:6px;
                        "></span>
                        ${Number(r[2]).toLocaleString()}
                        – ${Number(r[1] - 1).toLocaleString()}
                    </div>

                    <div>
                        <span style="
                            display:inline-block;
                            width:14px;
                            height:14px;
                            background:#fbe106;
                            margin-right:6px;
                        "></span>
                        ${Number(r[3]).toLocaleString()}
                        – ${Number(r[2] - 1).toLocaleString()}
                    </div>

                    <div>
                        <span style="
                            display:inline-block;
                            width:14px;
                            height:14px;
                            background:#a1d76a;
                            margin-right:6px;
                        "></span>
                        ${Number(r[4]).toLocaleString()}
                        – ${Number(r[3] - 1).toLocaleString()}
                    </div>

                    <div>
                        <span style="
                            display:inline-block;
                            width:14px;
                            height:14px;
                            background:#66bd63;
                            margin-right:6px;
                        "></span>
                        Below ${Number(r[4]).toLocaleString()}
                    </div>

                </div>
            `;

            return div;

        };


        districtLegend.addTo(mapInstance);


        /*
         * State name → GeoJSON filename
         *
         * These correspond to your existing files.
         */

        const stateFileMap = {

            "andaman and nicobar islands":
                "andaman-and-nicobar-islands.geojson",

            "andhra pradesh":
                "andhra-pradesh.geojson",

            "arunachal pradesh":
                "arunachal-pradesh.geojson",

            "assam":
                "assam.geojson",

            "bihar":
                "bihar.geojson",

            "chandigarh":
                "chandigarh.geojson",

            "chhattisgarh":
                "chhattisgarh.geojson",

            "delhi":
                "delhi.geojson",

            "dadra and nagar haveli and daman and diu":
                "dnh-and-dd.geojson",

            "goa":
                "goa.geojson",

            "gujarat":
                "gujarat.geojson",

            "haryana":
                "haryana.geojson",

            "himachal pradesh":
                "himachal-pradesh.geojson",

            "jammu and kashmir":
                "jammu-and-kashmir.geojson",

            "jharkhand":
                "jharkhand.geojson",

            "karnataka":
                "karnataka.geojson",

            "kerala":
                "kerala.geojson",

            "ladakh":
                "ladakh.geojson",

            "lakshadweep":
                "lakshadweep.geojson",

            "madhya pradesh":
                "madhya-pradesh.geojson",

            "maharashtra":
                "maharashtra.geojson",

            "manipur":
                "manipur.geojson",

            "meghalaya":
                "meghalaya.geojson",

            "mizoram":
                "mizoram.geojson",

            "nagaland":
                "nagaland.geojson",

            "odisha":
                "odisha.geojson",

            "puducherry":
                "puducherry.geojson",

            "punjab":
                "punjab.geojson",

            "rajasthan":
                "rajasthan.geojson",

            "sikkim":
                "sikkim.geojson",

            "tamil nadu":
                "tamil-nadu.geojson",

            "telangana":
                "telangana.geojson",

            "tripura":
                "tripura.geojson",

            "uttar pradesh":
                "uttar-pradesh.geojson",

            "uttarakhand":
                "uttarakhand.geojson",

            "west bengal":
                "west-bengal.geojson"

        };


        /*
         * Load all state GeoJSON files belonging
         * to the selected RO.
         */

        const geoJsonLayers = [];

        for (const state of selectedStates) {

            const stateKey =
                String(state)
                    .trim()
                    .toLowerCase();

            const fileName =
                stateFileMap[stateKey];

            if (!fileName) {

                console.warn(
                    `No GeoJSON mapping found for state: ${state}`
                );

                continue;
            }

            try {

                const response = await fetch(
                    `${basePath}/js/geojson/${fileName}`
                );

                if (!response.ok) {

                    console.warn(
                        `Failed to load ${fileName}: ${response.status}`
                    );

                    continue;
                }

                const geoData =
                    await response.json();


                const layer =
                    L.geoJSON(geoData, {

                        style: function (feature) {

                            const districtName =
                                feature.properties.district ||
                                feature.properties.DISTRICT ||
                                feature.properties.NAME_2 ||
                                feature.properties.name ||
                                "";

                            const key =
                                String(districtName)
                                    .trim()
                                    .toLowerCase();

                            const district =
                                districtMap[key];

                            const count =
                                district
                                    ? district.count
                                    : 0;

                            return {

                                fillColor:
                                    getDistrictColor(count),

                                weight: 1,

                                opacity: 1,

                                color: '#ffffff',

                                fillOpacity:
                                    count > 0
                                        ? 0.85
                                        : 0.35

                            };

                        },


                        onEachFeature:
                            function (feature, layer) {

                                const districtName =
                                    feature.properties.district ||
                                    feature.properties.DISTRICT ||
                                    feature.properties.NAME_2 ||
                                    feature.properties.name ||
                                    "Unknown";

                                const key =
                                    String(districtName)
                                        .trim()
                                        .toLowerCase();

                                const district =
                                    districtMap[key];


                                const count =
                                    district
                                        ? district.count
                                        : 0;

                                const percentage =
                                    district
                                        ? district.percentage
                                        : 0;


                                /*
                                 * Hover
                                 */

                                layer.bindTooltip(
                                    `
                                    <b>${districtName}</b><br>
                                    Tokens: ${count.toLocaleString()}
                                    `,
                                    {
                                        sticky: true
                                    }
                                );


                                /*
                                 * Click
                                 */

                                layer.bindPopup(
                                    `
                                    <div style="
                                        min-width:180px;
                                        font-size:13px;
                                    ">

                                        <strong>
                                            ${districtName}
                                        </strong>

                                        <hr style="
                                            margin:6px 0;
                                            border:0;
                                            border-top:1px solid #e5e7eb;
                                        ">

                                        <div>
                                            <b>Tokens:</b>
                                            ${count.toLocaleString()}
                                        </div>

                                        <div>
                                            <b>Share:</b>
                                            ${percentage.toFixed(2)}%
                                        </div>

                                        <div>
                                            <b>RO:</b>
                                            ${selectedRegion}
                                        </div>

                                    </div>
                                    `
                                );

                            }

                    });


                layer.addTo(mapInstance);

                geoJsonLayers.push(layer);

            } catch (err) {

                console.error(
                    `Error loading ${fileName}:`,
                    err
                );

            }

        }


        /*
         * Fit map to selected RO's districts.
         */

        if (geoJsonLayers.length > 0) {

            const group =
                L.featureGroup(geoJsonLayers);

            mapInstance.fitBounds(
                group.getBounds(),
                {
                    padding: [20, 20]
                }
            );

        } else {

            mapInstance.setView(
                [22.5, 82.5],
                4.5
            );

        }


    } catch (err) {

        console.error(
            "Failed to load map data",
            err
        );

    }

}
document
    .getElementById("heatmapVisitStatus")
    ?.addEventListener("change", loadMap);

document
    .getElementById("heatmapEntryStatus")
    ?.addEventListener("change", loadMap);
document.addEventListener('DOMContentLoaded', verifySession);

document.getElementById('refreshBtn')?.addEventListener('click', loadDashboard);
document.getElementById('filterRegion')?.addEventListener('change', loadDashboard);
document.getElementById('filterFrom')?.addEventListener('change', loadDashboard);
document.getElementById('filterTo')?.addEventListener('change', loadDashboard);

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: { 'x-monitor-token': getToken() || '' }
  });
  clearToken();
  window.location.href = `${basePath}/login.html`;
});

document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {

    const element = document.getElementById('dashboardApp');

    if (!element) {
        console.error('Dashboard element not found');
        return;
    }

    const button = document.getElementById('exportPdfBtn');

    try {

        if (button) {
            button.disabled = true;
            button.innerText = 'Generating PDF...';
        }


        const originalScrollY = window.scrollY;
        const originalScrollX = window.scrollX;

        window.scrollTo(0, 0);

        await new Promise(resolve => setTimeout(resolve, 300));


        const filterBar = document.querySelector('.filter-bar');
        const tableHeaders = document.querySelectorAll('.data-table th');
        const tableContainers = document.querySelectorAll('.table-container');

        const originalFilterPosition = filterBar
            ? filterBar.style.position
            : '';

        const originalHeaderPositions = [];
        const originalContainerOverflows = [];

        if (filterBar) {
            filterBar.style.position = 'static';
        }

        tableHeaders.forEach(th => {
            originalHeaderPositions.push(th.style.position);
            th.style.position = 'static';
        });

        tableContainers.forEach(container => {
            originalContainerOverflows.push(container.style.overflow);
            container.style.overflow = 'visible';
            container.style.maxHeight = 'none';
        });


        const originalTransform = element.style.transform;
        const originalOverflow = element.style.overflow;
        const originalHeight = element.style.height;

        element.style.transform = 'none';
        element.style.overflow = 'visible';
        element.style.height = 'auto';

        await new Promise(resolve => setTimeout(resolve, 500));

        const opt = {
            margin: [8, 8, 16, 8],

            filename: 'UIDAI_CEO_Monitor_Dashboard.pdf',

            image: {
                type: 'jpeg',
                quality: 0.95
            },

            html2canvas: {
                scale: 1.5,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#f8fafc',


                scrollX: 0,
                scrollY: 0,

                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            },

            jsPDF: {
                unit: 'mm',
                format: 'a3',
                orientation: 'landscape',
                compress: true
            },

            pagebreak: {
                mode: ['css']
            }
        };

        // Generate the PDF
        const pdf = await html2pdf()
    .set(opt)
    .from(element)
    .toPdf()
    .get("pdf");

addPdfFooter(pdf);

pdf.save(opt.filename);

        element.style.transform = originalTransform;
        element.style.overflow = originalOverflow;
        element.style.height = originalHeight;

        if (filterBar) {
            filterBar.style.position = originalFilterPosition;
        }

        tableHeaders.forEach((th, index) => {
            th.style.position = originalHeaderPositions[index];
        });

        tableContainers.forEach((container, index) => {
            container.style.overflow = originalContainerOverflows[index];
            container.style.maxHeight = '';
        });

        window.scrollTo(originalScrollX, originalScrollY);

    } catch (err) {

        console.error('PDF export failed:', err);

        alert('Failed to generate PDF. Please try again.');

    } finally {

        if (button) {
            button.disabled = false;
            button.innerText = 'Export PDF';
        }

    }

});
if (typeof lucide !== "undefined") {
  lucide.createIcons();
}

