

document.addEventListener("DOMContentLoaded",() => {

const calendar = document.getElementById("calendar");
const slotInfo = document.getElementById("slotInfo");
const formWrapper = document.getElementById("formWrapper");
const form = document.getElementById("bookingForm");
const statusText = document.getElementById("status");

const agreeCheck =
  document.getElementById("agreeCheck");

const submitBtn =
  document.getElementById("submitBtn");

agreeCheck.addEventListener("change", () => {

  submitBtn.disabled =
    !agreeCheck.checked;

});

const serviceTypeSelect =
  document.getElementById("service_type");
  const stateSelect =
document.getElementById("state");
const otherServiceWrapper =
document.getElementById("otherServiceWrapper");

const otherServiceInput =
document.getElementById("other_service");

const districtSelect =
document.getElementById("district");

const eidSection =
  document.getElementById("eidSection");
  const eidFields =
  document.getElementById("eidFields");

const sidFields =
  document.getElementById("sidFields");

const identityRadios =
  document.querySelectorAll(
    'input[name="identity_type"]'
  );
  
const walkinWasFull = localStorage.getItem("walkinFull") === "true";

let priorityRules = {};

let services=[];
let currentServiceFields = {};

async function loadStates(){

try{

const res =
await fetch("/kerala/api/settings/states");

const states =
await res.json();

stateSelect.innerHTML =
`
<option value="">
Select State
</option>
`;

states.forEach(state=>{

stateSelect.innerHTML +=
`
<option value="${state}">
${state}
</option>
`;

});

}
catch(err){

stateSelect.innerHTML =
`
<option>
Unable to load states
</option>
`;

}

}
async function loadServiceFields(serviceId){


const res =
await fetch(
`/kerala/api/settings/service-form-settings/${serviceId}`
);


const fields =
await res.json();


currentServiceFields={};


fields.forEach(f=>{
f.enabled = Number(f.enabled);
f.mandatory = Number(f.mandatory);
currentServiceFields[f.field_key]=f;



const element =
document.querySelector(
`[name="${f.field_key}"]`
);


if(!element)
return;


const wrapper =
element.closest(".form-group")
||
element.parentElement;



if(f.enabled==0){

wrapper.style.display="none";


element.disabled=true;


}
else{


wrapper.style.display="block";


element.disabled=false;


}



if(f.mandatory==1){

element.required=true;


}
else{


element.required=false;


}



});


}

function toggleIdentitySection(){

    if(currentServiceFields.identity?.enabled !== 1){

        eidSection.style.display = "none";

        eidFields.style.display = "none";
        sidFields.style.display = "none";

        identityRadios.forEach(radio => {
            radio.checked = false;
        });

        document.getElementById("enrollment_no").value = "";
        document.getElementById("eid_date").value = "";
        document.getElementById("eid_hour").value = "";
        document.getElementById("eid_minute").value = "";
        document.getElementById("eid_second").value = "";
        document.getElementById("sid_no").value = "";

        document.getElementById("enrollment_no").required = false;
        document.getElementById("eid_date").required = false;
        document.getElementById("eid_hour").required = false;
        document.getElementById("eid_minute").required = false;
        document.getElementById("eid_second").required = false;
        document.getElementById("sid_no").required = false;

        return;
    }

    eidSection.style.display = "block";

    // Show neither until EID or SID is explicitly selected.
    eidFields.style.display = "none";
    sidFields.style.display = "none";

    identityRadios.forEach(radio => {
        radio.checked = false;
    });

}
function setIdentityMode(type){

    const enrollmentNo =
        document.getElementById("enrollment_no");

    const eidDate =
        document.getElementById("eid_date");

    const eidHour =
        document.getElementById("eid_hour");

    const eidMinute =
        document.getElementById("eid_minute");

    const eidSecond =
        document.getElementById("eid_second");

    const sidNo =
        document.getElementById("sid_no");


    if(type === "EID"){

        eidFields.style.display = "block";
        sidFields.style.display = "none";

        enrollmentNo.required = true;
        eidDate.required = true;
        eidHour.required = true;
        eidMinute.required = true;
        eidSecond.required = true;

        sidNo.required = false;
        sidNo.value = "";

    }

    else if(type === "SID"){

        eidFields.style.display = "none";
        sidFields.style.display = "block";

        enrollmentNo.required = false;
        eidDate.required = false;
        eidHour.required = false;
        eidMinute.required = false;
        eidSecond.required = false;

        sidNo.required = true;

        enrollmentNo.value = "";
        eidDate.value = "";
        eidHour.value = "";
        eidMinute.value = "";
        eidSecond.value = "";

    }

}

serviceTypeSelect.addEventListener(
"change",
async ()=>{
  const selectedOption =
serviceTypeSelect.options[
serviceTypeSelect.selectedIndex
];


const serviceId =
selectedOption.dataset.id;


await loadServiceFields(serviceId);
toggleIdentitySection();

    
    if(serviceTypeSelect.value==="Others"){

        otherServiceWrapper.style.display="block";
        otherServiceInput.required=true;

    }
    else{

        otherServiceWrapper.style.display="none";
        otherServiceInput.required=false;
        otherServiceInput.value="";

    }

});

async function loadServices(){

const res =
await fetch(
"/kerala/api/settings/service-types"
);

services =
await res.json();

serviceTypeSelect.innerHTML = `
  <option value="" selected disabled data-i18n="form.options.select_service_type">
    Select Service Type
  </option>
`;

services
.filter(s=>s.active)
.forEach(s=>{

serviceTypeSelect.innerHTML +=
`

<option 
value="${s.english_name}"
data-id="${s.id}">
${s.english_name}
/${s.hindi_name}
</option>

`;

});

toggleIdentitySection();
}

identityRadios.forEach(radio => {

    radio.addEventListener("change", () => {

        setIdentityMode(radio.value);

    });

});



function getTodayIST(){

return new Intl.DateTimeFormat(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
).format(new Date());

}
async function loadPriorityRules() {

    const res = await fetch(
        "/kerala/api/settings/priority-settings",
        {
            headers: {
                "x-manager-token":
                    localStorage.getItem("managerToken") || ""
            }
        }
    );

    const data = await res.json();

    priorityRules = {};

    data.rules.forEach(r => {

const timeFields = [
    "walkin_start_hour",
    "walkin_end_hour",
    "today_appointment_cutoff_hour",
    "geo_start_1",
    "geo_end_1",
    "geo_start_2",
    "geo_end_2"
];

if (timeFields.includes(r.rule_key)) {

    priorityRules[r.rule_key] = r.rule_value;

}
else {

    priorityRules[r.rule_key] = Number(r.rule_value);

}

    });

    const visibleDays =
        priorityRules.appointment_days_visible || 10;

    document.getElementById(
        "appointmentHeading"
    ).innerHTML = `
        Book Appointment / नियुक्ति तिथि चुनें
        <br>
        Appointment can be booked
        ${visibleDays}
        days in advance.
        <br>
        अपॉइंटमेंट
        ${visibleDays}
        दिन पहले बुक किया जा सकता है।
    `;

}

let selectedDate = null;

function getDeviceId() {
  let deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    deviceId = "DEV-" + crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }

  return deviceId;
}

  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 280;
      canvas.height = 60;
      const ctx = canvas.getContext("2d");

      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.font = "11pt 'Arial', 'Helvetica', sans-serif";
      ctx.fillText("Fingerprint,canvas! 🖐️", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.font = "18pt 'Georgia', 'Times', serif";
      ctx.fillText("Fingerprint,canvas! 🖐️", 4, 45);

      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgb(255,0,255)";
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    } catch {
      return "canvas-not-supported";
    }
  }

  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return "webgl-not-supported";

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown";
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown";

      return `${vendor}~${renderer}`;
    } catch {
      return "webgl-error";
    }
  }

  async function getAudioFingerprint() {
    try {
      const audioCtx = new OfflineAudioContext(1, 44100, 44100);

      const oscillator = audioCtx.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);

      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
      compressor.knee.setValueAtTime(40, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

      oscillator.connect(compressor);
      compressor.connect(audioCtx.destination);
      oscillator.start(0);

      const audioBuffer = await audioCtx.startRendering();
      const samples = audioBuffer.getChannelData(0);

      let sum = 0;
      for (let i = 4500; i < 5000; i++) {
        sum += Math.abs(samples[i]);
      }

      return sum.toString();
    } catch {
      return "audio-not-supported";
    }
  }

  async function hashSignals(signalArray, prefix) {
    const raw = signalArray.join("|");
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return prefix + hashHex;
  }

  async function generateDeviceFingerprint() {

    const webgl = getWebGLFingerprint();
    const hwSignals = [
      "webgl:" + webgl,
      "screen:" + screen.width + "x" + screen.height,
      "depth:" + screen.colorDepth,
      "mem:" + (navigator.deviceMemory || "unknown"),
      "cores:" + (navigator.hardwareConcurrency || "unknown"),
      "tz:" + Intl.DateTimeFormat().resolvedOptions().timeZone,
      "platform:" + (navigator.platform || "unknown"),
      "lang:" + (navigator.language || "unknown"),
      "touch:" + (navigator.maxTouchPoints || 0),
    ];

    const canvasFP = getCanvasFingerprint();
    const audioFP = await getAudioFingerprint();

    const fullSignals = [
      "canvas:" + canvasFP,
      ...hwSignals,
      "audio:" + audioFP,
    ];

    const fullFP = await hashSignals(fullSignals, "FP-");

    const hwFP = await hashSignals(hwSignals, "HW-");

    return { full: fullFP, hardware: hwFP };
  }
function fillTimeDropdowns() {

  const hour =
    document.getElementById("eid_hour");

  const minute =
    document.getElementById("eid_minute");

  const second =
    document.getElementById("eid_second");

  for (let i = 0; i < 60; i++) {

    const val =
      String(i).padStart(2, "0");

    if (i < 24) {
      hour.innerHTML +=
        `<option value="${val}">${val}</option>`;
    }

    minute.innerHTML +=
      `<option value="${val}">${val}</option>`;

    second.innerHTML +=
      `<option value="${val}">${val}</option>`;
  }
}

fillTimeDropdowns();

async function loadOfficeDetails(){

const res =
await fetch("/kerala/api/settings");

const response =
await res.json();

const rules={};

const data =
response.rules || response;

data.forEach(r=>{

rules[r.rule_key]=r.rule_value;

});

const box =
document.getElementById("officeAddress");

if(
rules.office_display_en
){

box.innerHTML =
`
${rules.office_display_en}
<br>
${rules.office_display_hi || ""}
`;

}
else{

box.innerHTML =
"";

}

}
function timeToMinutes(str){

    const [h,m] =
    str.split(":").map(Number);

    return h*60+m;

}

async function loadDistricts(state){

if(!state){

districtSelect.innerHTML=
`
<option value="">
Select District
</option>
`;

return;

}

const res =
await fetch(
`/kerala/api/settings/districts-by-state?state=${encodeURIComponent(state)}`
);

const districts =
await res.json();

districtSelect.innerHTML=
`
<option value="">
Select District
</option>
`;

districts.forEach(d=>{

districtSelect.innerHTML +=
`
<option value="${d.english_name}">
${d.english_name}
/
${d.hindi_name}
</option>
`;

});

}
stateSelect.addEventListener(
"change",
()=>{

loadDistricts(
stateSelect.value
);

});
function isTodayAppointmentAllowed(selectedDate) {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const todayStr = ist.toISOString().split("T")[0];

  if (selectedDate !== todayStr) {
    return true;
  }

  const currentMinutes = ist.getHours() * 60 + ist.getMinutes();

const limitMinutes =
timeToMinutes(
priorityRules.today_appointment_cutoff_hour || "06:00"
);

  return currentMinutes <= limitMinutes;
}

function isValidIndianMobile(mobile) {

  return /^[6-9]\d{9}$/.test(mobile);
}

function disableTodayInCalendar() {
  const today=getTodayIST();

  document.querySelectorAll(".calendar-day").forEach(day => {
    if (day.dataset.date === today) {
      day.classList.add("disabled");
      day.onclick = null;
      day.innerHTML += "<br><small>Walk-in only</small>";
    }
  });
}
function shouldDisableTodayAppointment() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins > 16 * 60;
}

async function loadAvailability() {

  calendar.innerHTML = "Loading...";

  try {

    const distance = Number(localStorage.getItem("distance_meters") || 9999);
    const now = new Date();
    const ist = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

const disableToday =
(
ist.getHours()*60 +
ist.getMinutes()
)
>=
timeToMinutes(
priorityRules.today_appointment_cutoff_hour || "06:00"
);

  

    const res = await fetch(
      `/kerala/api/availability?disableToday=${disableToday}`
    );

    const data = await res.json();

    calendar.innerHTML = "";
    
    const currentMinutes = ist.getHours() * 60 + ist.getMinutes();

const afterCutoff =
currentMinutes >
timeToMinutes(
priorityRules.today_appointment_cutoff_hour
);

    const todayStr = ist.toISOString().split("T")[0];

    data.forEach(d => {

      const div = document.createElement("div");
      div.dataset.date = d.date;

      div.className = `calendar-day ${
        d.status === "AVAILABLE"
          ? "available"
          : d.status === "FULL"
          ? "full"
          : "holiday"
      }`;

      const dateObj = new Date(d.date);

      div.innerHTML = `
        <strong>${dateObj.toDateString()}</strong><br>
        Slots available:
        <small>${d.available_slots}</small>
      `;

      if(d.date===todayStr && afterCutoff) {

        div.classList.remove("available");
        div.classList.add("full");

        div.innerHTML = `
          <strong>${dateObj.toDateString()}</strong><br>
          <small style="color:red; font-weight:bold;">
            Closed for today
          </small>
        `;

        div.onclick = null;
      }

      else if (d.status === "AVAILABLE") {

        div.onclick = () => {

          selectedDate = d.date;

          document
            .querySelectorAll(".calendar-day")
            .forEach(el => el.classList.remove("selected"));

          div.classList.add("selected");

          slotInfo.style.display = "block";
          slotInfo.innerHTML = window.t("messages.appointment_slots_available", `🟢 <strong>${d.available_slots}</strong> appointment slots available`, { count: d.available_slots });

          formWrapper.style.display = "block";
          statusText.innerText = window.t("messages.fill_appointment_form", "Please fill appointment form");
        };
      }

      calendar.appendChild(div);
    });
    if (walkinWasFull) {
      statusText.innerText =
        window.t("messages.walkin_full_redirect_appointment", "Walk-in slots are full. Appointment booking available from tomorrow.");

      disableTodayInCalendar();

      localStorage.removeItem("walkinFull");
    }

  } catch {

    calendar.innerHTML = window.t("messages.unable_load_calendar", "Unable to load calendar");
  }
}

form.addEventListener("submit", async (e) => {

  e.preventDefault();
localStorage.removeItem("tokenData");

  localStorage.removeItem("tokenData");

let mobileValue="";

if(currentServiceFields.mobile?.enabled===1){

mobileValue =
document.getElementById("mobile")
.value.trim();

if(!isValidIndianMobile(mobileValue)){

statusText.innerText =
window.t("messages.valid_mobile", "❌ Enter a valid Indian mobile number");

return;

}

}

  if (!selectedDate) {
    statusText.innerText = window.t("messages.select_date", "Please select appointment date");
    return;
  }

  if (!isTodayAppointmentAllowed(selectedDate)) {
    statusText.innerText =
     window.t("appointment.today_cutoff_warning", "⛔ Appointments for today can be booked only till 6:00 AM");
    return;
  }

if(currentServiceFields.name?.enabled===1){

    const nameValue =
        document.getElementById("name")
        .value.trim();

    const nameRegex =
        /^[A-Za-z\s]{2,50}$/;

    if(!nameRegex.test(nameValue)){

        statusText.innerText =
        window.t("messages.valid_name", "❌ Name should contain only alphabets.");  

        return;
    }

}

const service =
  document.getElementById("service_type").value;

const skipIdentityServices = [
  "Lost Aadhaar",
  "Lock Aadhaar"
];

const serviceType =
  document.getElementById("service_type").value;
  
  const selectedService =
services.find(
    s => s.english_name === serviceType
);

const identityType =
  document.querySelector(
    'input[name="identity_type"]:checked'
  )?.value;

if(
    currentServiceFields.identity?.enabled===1 &&
    identityType === "EID"
) {

const eidDate =
document.getElementById("eid_date").value;

if(!eidDate){

statusText.innerText =
"Enrollment date required";

return;

}

const year =
eidDate.split("-")[0];

if(year.length !==4){

statusText.innerText =
"Invalid enrollment date year";

return;

}

}

if(!stateSelect.value){

statusText.innerText =
"Please select state";

return;

}

if(!districtSelect.value){

statusText.innerText =
"Please select district";

return;

}
  const deviceFingerprint = await generateDeviceFingerprint();
  const deviceId =
    getDeviceId();

  const payload = {
    mode: "A",
    device_id: deviceId,

    hardware_fp: deviceFingerprint.hardware,
    selected_date: selectedDate,
    name: document.getElementById("name").value.trim(),
    mobile: mobileValue,
    aadhaar_last4: document.getElementById("aadhaar").value.trim(),
    gender: document.getElementById("gender").value,
    age: Number(document.getElementById("age").value),
    state:
stateSelect.value,
    district: document.getElementById("district").value,
    service_type: document.getElementById("service_type").value,
    service_other:
serviceTypeSelect.value==="Others"
?
otherServiceInput.value.trim()
:
null,
    qrc: document.getElementById("qrc").value.trim(),
    distance_meters: Number(localStorage.getItem("distance_meters") || 0),

...(currentServiceFields.identity?.enabled===1 && {

  identity_type:
    document.querySelector(
      'input[name="identity_type"]:checked'
    )?.value || null,

  enrollment_no:
    document.getElementById("enrollment_no").value,

  eid_date:
    document.getElementById("eid_date").value,

  eid_time:
    `${document.getElementById("eid_hour").value}:` +
    `${document.getElementById("eid_minute").value}:` +
    `${document.getElementById("eid_second").value}`,

  sid:
    document.getElementById("sid_no").value.trim()

}),
  };

  statusText.innerText = "Processing...";
  localStorage.removeItem("tokenData");

  try {

    const res = await fetch("/kerala/api/generate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok) {
      statusText.innerText = result.message;
      return;
    }

    localStorage.setItem(
      "tokenData",
      JSON.stringify({ ...payload, ...result })
    );

    window.location.href = "/kerala/confirmation";

  } catch (err) {

  statusText.innerText =
    "Server not reachable";
}

});

(async () => {

    await loadPriorityRules();

    await loadServices();
    const firstService =
serviceTypeSelect.options[0];

if(firstService){

await loadServiceFields(
firstService.dataset.id
);
toggleIdentitySection();
}
    await loadStates();

    
    await loadOfficeDetails();



    loadAvailability();

})();

});

