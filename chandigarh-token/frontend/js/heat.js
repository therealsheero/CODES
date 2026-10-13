

let geojsonLayer;
let currentConfig;
let currentSheetType = "appointment";

let currentDistrictRows = [];
let states = [];
let currentDistrictName = "";
const sheetConfigs = [

    

    {
        title: "DISTRICT-WISE APPOINTMENT HEATMAP",
        
        duration: "DURATION 3rd Feb to 22nd May",

        totalLabel: "Appointment Visits"
    },

    

    {
        title: "DISTRICT-WISE WALK-IN HEATMAP",

        duration: "DURATION 3rd Feb to 22nd May",

        totalLabel: "Walk-In Visits"
    },

    

    {
        title: "DISTRICT-WISE TOKENS WITH EID/ SID HEATMAP",

        duration: "DURATION 8th May to 22nd May",

        totalLabel: "Walk-In EID Visits"
    },

    

    {
        title: "DISTRICT-WISE TOTAL VISITS HEATMAP",

        duration: "DURATION 3rd Feb to 22nd May",

        totalLabel: "Total Visits"
    },
        {
    title: "DISTRICT-WISE PT/ RT/ PwD HEATMAP",

    duration: "PHYSICAL REFERENCE",

    totalLabel: "Physical Reference Visits"
}

];
const districtNameMap = {

    "Allahabad": "Prayagraj",

    "Faizabad": "Ayodhya",

    "Sant Ravidas Nagar": "Bhadohi",

    "Mahrajganj": "Maharajganj",

    "Muradabad": "Moradabad",

    "Siddharth Nagar": "Siddharthnagar",

    "Shrawasti": "Shravasti",

    "Mahamaya Nagar": "Hathras",

    "Jyotiba Phule Nagar": "Amroha",

    "Kheri": "Lakhimpur Kheri",

    "Badaun": "Budaun"
};
const map = L.map('map').setView([27.0, 80.9], 7);

map.on(
    "zoomend",
    resizeLabels
);
map.getContainer().style.background = 'white';
L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png?key=cb1_32yl_1_371f04ce9965bc6829c6a293',
    {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }
).addTo(map);
map.getContainer().style.background =
    "#f8f8f8";
function addNeighbourLabels() {

    const labels = [

    {
        name: "KARNATAKA",
        lat: 15.2,
        lng: 76.2
    },

    {
        name: "TAMIL NADU",
        lat: 10.8,
        lng: 78.5
    },

    {
        name: "SRI LANKA",
        lat: 7.8,
        lng: 80.7
    },

    {
        name: "ARABIAN SEA",
        lat: 11.5,
        lng: 71.5
    },

    {
        name: "MALDIVES",
        lat: 3.5,
        lng: 73.2
    }
];

    labels.forEach(label => {

        L.marker([label.lat, label.lng], {

            icon: L.divIcon({

                className: 'state-label',

                html: `
                    <div>
                        ${label.name}
                    </div>
                `
            })

        }).addTo(map);

    });
}











let districtData = {};
let currentRanges = [];

async function loadStates(){

    const res =
        await fetch("/chandigarh/api/settings/states");

    states =
        await res.json();

    const select =
        document.getElementById("stateFilter");
            select.innerHTML = `

        <option value="">
            All States
        </option>

    `;


    states.forEach(state=>{

        select.innerHTML +=
        `
        <option value="${state}">
            ${state}
        </option>
        `;

    });

}
document
.getElementById("stateFilter")
.addEventListener(
"change",
async function(){

    if(geojsonLayer){

        map.removeLayer(
            geojsonLayer
        );
        geojsonLayer = null;

    }


    await loadSheet(
        0
    );


});



function resizeLabels(){

    const zoom =
        map.getZoom();


    let nameSize =
        zoom * 1.9;


    let valueSize =
        zoom * 2.5;


    document
    .querySelectorAll(
        ".district-name"
    )
    .forEach(el=>{

        el.style.fontSize =
            nameSize + "px";

    });


    document
    .querySelectorAll(
        ".district-value"
    )
    .forEach(el=>{

        el.style.fontSize =
            valueSize + "px";

    });
}

async function fetchHeatmapData(type) {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    const state = document.getElementById("stateFilter").value;
    const day = document.getElementById("dayFilter").value;

    const visitStatus =
        document.getElementById("visitStatusFilter").value;

    const entryStatus =
        document.getElementById("entryStatusFilter").value;

    const params = new URLSearchParams({
        from,
        to,
        day,
        type,
        state,
        visit_status: visitStatus,
        entry_status: entryStatus
    });

    const res = await fetch(
        `/chandigarh/api/heatmap-data?${params.toString()}`
    );

    if (!res.ok) {
        throw new Error(`Heatmap request failed: ${res.status}`);
    }

    return await res.json();
}




function calculateQuantiles(values) {

    if(values.length === 0){

        return [0,0,0,0,0];
    }

    const sorted =
        [...values].sort((a,b)=>a-b);

    const n =
        sorted.length;

    function q(p){

        return sorted[
            Math.min(
                Math.floor(n*p),
                n-1
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

function closeDistrictPanel() {

    document
      .getElementById(
        "districtPanel"
      )
      .classList.remove("open");

}
function renderPhysicalTable(rows){

let html = `

<div style="padding:10px;overflow-x:auto">

<table style="
width:100%;
border-collapse:collapse;
background:white;
">

<tr style="
background:#0b2e6b;
color:white;
">

<th>Token</th>
<th>Name</th>
<th>Mobile</th>
<th>Age</th>
<th>Gender</th>
<th>District</th>
<th>Service</th>
<th>Type</th>
<th>Reference Of</th>
<th>Date</th>

</tr>

`;


rows.forEach(r=>{


html+=`

<tr>

<td>${r.token || "-"}</td>

<td>${r.name}</td>

<td>${r.mobile}</td>

<td>${r.age}</td>

<td>${r.gender}</td>

<td>${r.district}</td>

<td>${r.service_type}</td>

<td>${r.token_type}</td>

<td>${r.reference_of}</td>

<td>${r.created_at}</td>


</tr>

`;

});


html+=`

</table>

</div>

`;


document
.getElementById("districtTableContainer")
.innerHTML=html;


document
.getElementById("districtPanel")
.classList.add("open");


}
function downloadPhysicalCSV(){


let csv =
"Token,Name,Mobile,Age,Gender,District,Service,Type,Reference Of,Date\n";


currentDistrictRows.forEach(r=>{


csv += [

r.token,
r.name,
r.mobile,
r.age,
r.gender,
r.district,
r.service_type,
r.token_type,
r.reference_of,
r.created_at

]
.map(v=>`"${v || ""}"`)
.join(",")
+"\n";


});


const blob =
new Blob(
[csv],
{
type:"text/csv"
}
);


const link=document.createElement("a");

link.href=
URL.createObjectURL(blob);


link.download=
`${currentDistrictName}_Physical_Reference.csv`;


link.click();


}
function downloadSlotCSV(){

    if(
        !window.slotSummaryData ||
        window.slotSummaryData.length === 0
    ){

        alert("No slot data available");
        return;

    }


    let csv =
"Date,Appointment Released,Appointment Booked,Appointment Footfall,Walkin Released,Walkin Booked,Walkin Footfall,PT/RT/PwD,Total\n";


    window.slotSummaryData.forEach(row=>{

        csv +=`${row.date},${row.appointment_released},${row.appointment_booked},${row.appointment_footfall},${row.walkin_released},${row.walkin_booked},${row.walkin_footfall},${row.physical_count},${row.total}\n`;

    });


    const blob =
    new Blob(
        [csv],
        {
            type:"text/csv"
        }
    );


    const url =
    URL.createObjectURL(blob);


    const a =
    document.createElement("a");


    a.href=url;

    a.download =
    "slot_summary.csv";


    a.click();


    URL.revokeObjectURL(url);

}
async function openSlotSummary(){


const from =
document.getElementById("fromDate").value;


const to =
document.getElementById("toDate").value;
const day =
document.getElementById("dayFilter").value;


const res =
await fetch(
`/chandigarh/api/slot-summary?from=${from}&to=${to}&day=${day}`
);


const rows =
await res.json();

window.slotSummaryData = rows;

let html=`

<table>

<tr>

<th>Date</th>
<th>Day</th>
<th>Appointment Released</th>
<th>Appointment Booked</th>
<th>Appointment Footfall</th>

<th>Walk-in Released</th>
<th>Walk-in Booked</th>
<th>Walk-in Footfall</th>

<th>PT/RT/PwD</th>

<th>Total</th>

</tr>

`;


rows.forEach(row=>{


html+=`

<tr>

<td>${row.date}</td>
<td>${row.day}</td>

<td>${row.appointment_released}</td>

<td>${row.appointment_booked}</td>

<td>${row.appointment_footfall}</td>


<td>${row.walkin_released}</td>

<td>${row.walkin_booked}</td>

<td>${row.walkin_footfall}</td>


<td>${row.physical_count}</td>


<td>${row.total}</td>


</tr>

`;

});


html+=`</table>`;


document
.getElementById("slotTableContainer")
.innerHTML=html;



document
.getElementById("slotPanel")
.classList.add("open");


}



function closeSlotSummary(){


document
.getElementById("slotPanel")
.classList.remove("open");


}
async function showDistrictResidents(
    
    district
) {


    const from =
      document.getElementById(
        "fromDate"
      ).value;

    const to =
      document.getElementById(
        "toDate"
      ).value;



    

    
    const state =
document.getElementById("stateFilter").value;

const visitStatus =
    document.getElementById("visitStatusFilter").value;

const entryStatus =
    document.getElementById("entryStatusFilter").value;


let url;

if (currentSheetType === "physical") {
    // Physical/reference entries are always treated as
    // visited and entered.
    if (
        visitStatus === "not_visited" ||
        entryStatus === "not_entered"
    ) {
        currentDistrictRows = [];
        currentDistrictName = district;
        renderPhysicalTable([]);
        return;
    }

    url =
        `/chandigarh/api/physical-district-residents` +
        `?district=${encodeURIComponent(district)}` +
        `&state=${encodeURIComponent(state)}` +
        `&from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}`;
} else {
    const params = new URLSearchParams({
        district,
        state,
        from,
        to,
        type: currentSheetType,
        visit_status: visitStatus,
        entry_status: entryStatus
    });

    url = `/chandigarh/api/district-residents?${params.toString()}`;
}



const res =
await fetch(url);

    const rows =
      await res.json();
      currentDistrictRows = rows;
currentDistrictName = district;


    

document
.getElementById("districtTitle")
.innerHTML = `

<div style="
display:flex;
align-items:center;
justify-content:space-between;
gap:20px;
">

<div>

📍 ${district}

<br>

<span style="
font-size:13px;
font-weight:normal;
">

${from} to ${to}

</span>

</div>


<button onclick="${currentSheetType==="physical" ? "downloadPhysicalCSV()" : "downloadDistrictCSV()"}"
style="
background:#16a34a;
color:white;
border:none;
padding:8px 12px;
border-radius:6px;
cursor:pointer;
">

⬇ CSV

</button>

</div>

`;

    let html = `
      <div style="
padding:10px;
overflow-x:auto;
">

<table
style="
width:100%;
border-collapse:collapse;
background:white;
font-size:13px;
box-shadow:0 2px 8px rgba(0,0,0,0.1);
">
      <tr style="
background:#0b2e6b;
color:white;
position:sticky;
top:0;
">

    <th style="padding:10px;">Token</th>
    <th style="padding:10px;">Name</th>
    <th style="padding:10px;">Mobile</th>
    <th style="padding:10px;">Age</th>
    <th style="padding:10px;">Gender</th>
    <th style="padding:10px;">Service</th>
    <th style="padding:10px;">Mode</th>
    <th style="padding:10px;">Date</th>

</tr>
    `;

    


    

    

    
if(currentSheetType==="physical"){

    renderPhysicalTable(rows);

    return;

}
    
    rows.forEach((r,index) => {

    const bg =
        index % 2 === 0
        ? "#f8fafc"
        : "#ffffff";

    html += `
      <tr style="background:${bg};">

        <td style="padding:8px;">
            ${r.token || "-"}
        </td>

        <td style="padding:8px;">
            ${r.name}
        </td>

        <td style="padding:8px;">
            ${r.mobile}
        </td>

        <td style="padding:8px;">
            ${r.age}
        </td>

        <td style="padding:8px;">
            ${r.gender}
        </td>

        <td style="padding:8px;">
            <span style="
                background:#fef3c7;
                padding:4px 8px;
                border-radius:6px;
            ">
                ${r.service_type}
            </span>
        </td>

        <td style="padding:8px;">

            <span style="
                padding:4px 8px;
                border-radius:20px;
                font-weight:bold;
                background:
                ${r.mode === "A"
                    ? "#dbeafe"
                    : "#dcfce7"};
            ">

            ${r.mode === "A"
                ? "Appointment"
                : "Walk-In"}

            </span>

        </td>

        <td style="padding:8px;">
            ${r.date}
        </td>

      </tr>
    `;
});

    
    html += `
</table>
</div>
`;

    document
      .getElementById(
        "districtTableContainer"
      )
      .innerHTML = html;

    document
      .getElementById(
        "districtPanel"
      )
      .classList.add("open");
}
async function loadSheet(sheetIndex) {

    currentConfig =
        sheetConfigs[sheetIndex];

    document.querySelector(
        '#mapTitle h2'
    ).innerText =
        currentConfig.title;


const from =
    document.getElementById(
        "fromDate"
    ).value;

const to =
    document.getElementById(
        "toDate"
    ).value;

document.querySelector(
    '#mapTitle h3'
).innerText =
    `${from} to ${to}`;

    districtData = {};

    


    


    


    
    currentSheetType = "appointment";

if(sheetIndex === 1) {

    currentSheetType = "walkin";

}

else if(sheetIndex === 2) {

    currentSheetType = "eid";

}

else if(sheetIndex === 3) {

    currentSheetType = "total";

}
else if(sheetIndex === 4) {

    currentSheetType = "physical";

}

    const rows =
        await fetchHeatmapData(currentSheetType);

    let totalVisits = 0;
    const values =
    rows.map(r => Number(r.visits)||0);

currentRanges =
    calculateQuantiles(values);

    rows.forEach(row => {

        const value =
            Number(row.visits) || 0;

        totalVisits += value;


        
        districtData[
    row.district
        .split("/")[0]
        .trim()
        .toLowerCase()
] = value;
    });

    document.getElementById(
        'totalCount'
    ).innerText = totalVisits;

    if(geojsonLayer) {

        map.removeLayer(
            geojsonLayer
        );
    }

    updateLegend();

    drawMap();
}

function reloadCurrentSheet() {

    const index =
        sheetConfigs.indexOf(
            currentConfig
        );

    loadSheet(index);
}





function updateLegend(){

    const r =
        currentRanges;

    document
    .querySelector(".legend")
    .innerHTML = `

<h4>Visited Count</h4>

<div class="legend-row">

<i style="background:#b10026"></i>

<span>

Very High

(${r[0]}+)

</span>

</div>

<div class="legend-row">

<i style="background:#f03b20"></i>

<span>

High

(${r[1]}-${r[0]-1})

</span>

</div>

<div class="legend-row">

<i style="background:#fd8d3c"></i>

<span>

Medium

(${r[2]}-${r[1]-1})

</span>

</div>

<div class="legend-row">

<i style="background:#fbe106"></i>

<span>

Low

(${r[3]}-${r[2]-1})

</span>

</div>

<div class="legend-row">

<i style="background:#a1d76a"></i>

<span>

Very Low

(${r[4]}-${r[3]-1})

</span>

</div>

<div class="legend-row">

<i style="background:#66bd63"></i>

<span>

Below ${r[4]}

</span>

</div>

`;

}





function getColor(value){

    const r =
        currentRanges;

    return value >= r[0] ? '#b10026' :

           value >= r[1] ? '#f03b20' :

           value >= r[2] ? '#fd8d3c' :

           value >= r[3] ? '#fbe106' :

           value >= r[4] ? '#a1d76a' :

                           '#66bd63';

}



async function drawMap() {


    const state =
        document.getElementById(
            "stateFilter"
        ).value;


    const configRes =
        await fetch(
            `/chandigarh/api/manager/geojson?state=${encodeURIComponent(state)}`
        );


    const config =
        await configRes.json();



    let geojsonFiles = [];


    if(Array.isArray(config)){

        geojsonFiles = config;

    }
    else if(config){

        geojsonFiles = [config];

    }
    else{



        return;
    }



    let combinedFeatures = [];



    for(const file of geojsonFiles){



        const geoRes =
            await fetch("." + file.file_path);



        const data =
            await geoRes.json();



        combinedFeatures.push(
            ...data.features
        );


    }



    const combinedGeoJSON = {

        type:"FeatureCollection",

        features:combinedFeatures

    };



    geojsonLayer =
    L.geoJSON(
        combinedGeoJSON,
        {


        style:function(feature){


            let district =
                feature.properties.district ||
                feature.properties.DISTRICT ||
                feature.properties.name ||
                feature.properties.NAME;



            district =
                districtNameMap[district]
                ||
                district;



            district =
                district
                .split("/")[0]
                .trim()
                .toLowerCase();



            const value =
                districtData[district]
                ||
                0;



            return {

                fillColor:
                    getColor(value),

                weight:1,

                color:"white",

                opacity:0.7,

                fillOpacity:0.9
            };

        },



        onEachFeature:function(feature,layer){



            let district =
                feature.properties.district ||
                feature.properties.DISTRICT ||
                feature.properties.name ||
                feature.properties.NAME;



            district =
                districtNameMap[district]
                ||
                district;



            const normalized =
                district
                .split("/")[0]
                .trim()
                .toLowerCase();



            const value =
                districtData[normalized]
                ||
                0;



            layer.bindTooltip(

            `
            <div class="label-box">

            <span class="district-name">
            ${district}
            </span>

            <span class="district-value">
            ${value}
            </span>

            </div>
            `,

            {

                permanent:true,

                direction:"center",

                className:"district-tooltip"

            });



            layer.on(
                "click",
                function(){

                    showDistrictResidents(
                        district
                    );

                }
            );

        }


    }).addTo(map);



    map.fitBounds(
        geojsonLayer.getBounds()
    );



    setTimeout(
        resizeLabels,
        300
    );


    addNeighbourLabels();


}


const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {

    const div = L.DomUtil.create('div', 'info legend');




    

    
    
    div.innerHTML="";

return div;
};

legend.addTo(map);

setTimeout(() => {

    const legendEl =
        document.querySelector('.legend');

    document
        .getElementById('legendContainer')
        .appendChild(legendEl);

}, 500);

function downloadMap() {

    const button =
        document.getElementById('downloadBtn');

    const controls =
        document.querySelector(
            '.leaflet-control-container'
        );

    button.style.display = 'none';

    controls.style.display = 'none';

    setTimeout(() => {

        html2canvas(
            document.getElementById('capture'),
            {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scale: 3
            }

        ).then(canvas => {

            const link =
                document.createElement('a');

            link.download =
                'Heatmap.png';

            link.href =
                canvas.toDataURL('image/png');

            link.click();

            button.style.display = 'block';

            controls.style.display = 'block';

        });

    }, 1000);
}


function downloadDistrictCSV() {

    if(
        currentDistrictRows.length === 0
    ){
        alert("No data available");
        return;
    }


    let csv =
    "Token,Name,Mobile,Age,Gender,Service,Mode,Date\n";


    currentDistrictRows.forEach(r=>{

        csv +=
        [
            r.token,
            r.name,
            r.mobile,
            r.age,
            r.gender,
            r.service_type,
            r.mode,
            r.date
        ]
        .map(v => `"${v || ""}"`)
        .join(",")
        + "\n";

    });


    const blob =
        new Blob(
            [csv],
            {
                type:"text/csv"
            }
        );


    const link =
        document.createElement("a");


    link.href =
        URL.createObjectURL(blob);


    link.download =
        `${currentDistrictName}_Residents.csv`;


    link.click();
}


document
    .getElementById("visitStatusFilter")
    .addEventListener("change", reloadCurrentSheet);

document
    .getElementById("entryStatusFilter")
    .addEventListener("change", reloadCurrentSheet);

loadStates();
loadSheet(0);
