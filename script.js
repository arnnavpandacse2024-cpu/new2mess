// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Please create a free Firebase project, enable Realtime Database (Test Mode),
// and paste your configuration object here.
const firebaseConfig = {
  // apiKey: "YOUR_API_KEY",
  // authDomain: "YOUR_AUTH_DOMAIN",
  // databaseURL: "YOUR_DATABASE_URL",
  // projectId: "YOUR_PROJECT_ID",
  // storageBucket: "YOUR_STORAGE_BUCKET",
  // messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  // appId: "YOUR_APP_ID"
};

let db = null;
if (firebaseConfig.apiKey && typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}
// ------------------------------

const pages = ["page1","page2","page3","page4"];
const SETTINGS_KEY = "nist_mess_settings";
const defaultSettings = {
  openMonday: true,
  openSaturday: false,
  specialSundayBreakfast: false,
  everydayStart: "18:00",
  everydayEnd: "21:30",
  saturdayStart: "13:30",
  saturdayEnd: "16:30",
  specialStart: "18:00",
  specialEnd: "21:30",
  tokenLink: "https://nist-university-admin.example.com"
};
let adminSettings = { ...defaultSettings };

const dayTimeMap = {
  Monday:["Day"],
  Tuesday:["Night"],
  Wednesday:["Night"],
  Thursday:["Night"],
  Friday:["Night"],
  Saturday:["Day"],
  Sunday:["Day","Night"],
  "Special Breakfast (Mon-Fri)": ["Day"]
};

const bookingToTokenDays = {
  Sunday:["Monday","Special Breakfast (Mon-Fri)"],
  Monday:["Tuesday"],
  Tuesday:["Wednesday"],
  Wednesday:["Thursday"],
  Thursday:["Friday"],
  Friday:["Saturday"],
  Saturday:["Sunday"]
};

const menuByDayTime = {
  "Monday|Day": { veg:["Paneer"], nonveg:["Egg Curry"] },
  "Tuesday|Night": { veg:["Baby Corn Chilli","Aloo Gobi Masala"], nonveg:["Egg Curry"] },
  "Wednesday|Night": { veg:["Paneer Curry"], nonveg:["Chicken Curry","Chicken Chilli"] },
  "Thursday|Night": { veg:["Mixed Veg"], nonveg:["Chicken Curry"] },
  "Friday|Night": { veg:["Paneer Masala"], nonveg:["Fish Curry","Fish Fry"] },
  "Saturday|Day": { veg:["Paneer"], nonveg:["Egg Curry"] },
  "Sunday|Day": { veg:["Mushroom Curry"], nonveg:["Egg Curry"] },
  "Sunday|Night": { veg:["Paneer Do Pyaza"], nonveg:["Chicken Butter Masala"] },
  "Special Breakfast (Mon-Fri)|Day": { veg:["Vegetable Upma","Poha"], nonveg:["Egg Sandwich","Egg Bhurji"] }
};

let studentData = {};

const studentForm = document.getElementById("studentForm");
const dayForm = document.getElementById("dayForm");
const menuForm = document.getElementById("menuForm");
const error1 = document.getElementById("error1");
const error2 = document.getElementById("error2");
const error3 = document.getElementById("error3");

const daySelect = document.getElementById("day");
const timeSelect = document.getElementById("time");
const foodType = document.getElementById("foodType");
const menuItem = document.getElementById("menuItem");
const selectedDay = document.getElementById("selectedDay");
const selectedTime = document.getElementById("selectedTime");

const steps = ["step1dot","step2dot","step3dot","step4dot"].map(id=>document.getElementById(id));

async function loadAdminSettings(){
  if (db) {
    try {
      const snapshot = await db.ref('settings').once('value');
      if (snapshot.exists()) {
        adminSettings = {...defaultSettings, ...snapshot.val()};
        return;
      }
    } catch(e) { console.error("Firebase read error", e); }
  }
  // Fallback
  try { const raw = localStorage.getItem(SETTINGS_KEY); if(raw) adminSettings = {...defaultSettings, ...JSON.parse(raw)}; }
  catch(e){ adminSettings = {...defaultSettings}; }
}

async function saveAdminSettings(){
  if (db) {
    try {
      await db.ref('settings').set(adminSettings);
      return;
    } catch(e) { console.error("Firebase write error", e); }
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(adminSettings));
}
function isDayOpen(day){
  if(day === "Monday") return adminSettings.openMonday;
  if(day === "Saturday") return adminSettings.openSaturday;
  return ["Tuesday","Wednesday","Thursday","Friday","Sunday"].includes(day);
}

function isSpecialSundayBreakfastOpen(){
  if(!adminSettings.specialSundayBreakfast) return false;
  const now = new Date();
  const min = parseTimeToMinutes(adminSettings.specialStart) ?? 18*60;
  const max = parseTimeToMinutes(adminSettings.specialEnd) ?? 21*60 + 30;
  const current = now.getHours() * 60 + now.getMinutes();
  return now.toLocaleDateString(undefined,{weekday:'long'}) === 'Sunday' && current >= min && current <= max;
}

function setAdminCheckboxes(){
  const mon = document.getElementById("adminMondayOpen");
  const sat = document.getElementById("adminSaturdayOpen");
  const spec = document.getElementById("adminSpecialSundayBreakfast");
  if(mon) mon.checked = adminSettings.openMonday;
  if(sat) sat.checked = adminSettings.openSaturday;
  if(spec) spec.checked = adminSettings.specialSundayBreakfast;
  const everydayStart = document.getElementById("everydayStart");
  const everydayEnd = document.getElementById("everydayEnd");
  const saturdayStart = document.getElementById("saturdayStart");
  const saturdayEnd = document.getElementById("saturdayEnd");
  const specialStart = document.getElementById("specialStart");
  const specialEnd = document.getElementById("specialEnd");
  if(everydayStart) everydayStart.value = adminSettings.everydayStart;
  if(everydayEnd) everydayEnd.value = adminSettings.everydayEnd;
  if(saturdayStart) saturdayStart.value = adminSettings.saturdayStart;
  if(saturdayEnd) saturdayEnd.value = adminSettings.saturdayEnd;
  if(specialStart) specialStart.value = adminSettings.specialStart;
  if(specialEnd) specialEnd.value = adminSettings.specialEnd;
  const adminTokenLink = document.getElementById("adminTokenLink");
  if(adminTokenLink) adminTokenLink.value = adminSettings.tokenLink || "";
}

function parseTimeToMinutes(time){
  const parts = time.split(":");
  if(parts.length!==2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if(Number.isNaN(h)||Number.isNaN(m)) return null;
  return h*60 + m;
}

function isDailyWindowOpen() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const everydayStart = parseTimeToMinutes(adminSettings.everydayStart) ?? 18*60;
  const everydayEnd = parseTimeToMinutes(adminSettings.everydayEnd) ?? 21*60+30;
  const isEverydayOpen = minutes >= everydayStart && minutes <= everydayEnd;
  const saturdayStart = parseTimeToMinutes(adminSettings.saturdayStart) ?? 13*60+30;
  const saturdayEnd = parseTimeToMinutes(adminSettings.saturdayEnd) ?? 16*60+30;
  const isSaturdayOpen = now.toLocaleDateString(undefined,{weekday:'long'}) === 'Saturday' && minutes >= saturdayStart && minutes <= saturdayEnd;
  return isEverydayOpen || isSaturdayOpen;
}

function setActive(pageId) {
  pages.forEach(p=>document.getElementById(p).classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  const idx = pages.indexOf(pageId);
  steps.forEach((s,i)=> s.classList.toggle("active", i<=idx));
}

function showError(el, msg) { el.textContent = msg; if(msg) setTimeout(()=>{el.textContent = "";}, 4000); }

async function fetchRecordsFromBackend(){
  if (db) {
    try {
      const snapshot = await db.ref('records').once('value');
      if (snapshot.exists()) {
        const data = snapshot.val();
        // convert object to array
        return Object.values(data);
      }
      return [];
    } catch(e) { console.error("Firebase records read error", e); return []; }
  }
  try {
    const r = await fetch('/api/list');
    if(r.ok) {
      const j = await r.json();
      return j.records || [];
    }
  } catch(e){}
  const raw = localStorage.getItem("nist_mess_records");
  return raw ? JSON.parse(raw) : [];
}

function getBookingDate() {
  return new Date().toISOString().slice(0,10);
}

async function isRollUsedOnDate(roll, bookingDate){
  const records = await fetchRecordsFromBackend();
  return records.some(r => {
    if(!r.roll) return false;
    const sameRoll = r.roll.toLowerCase() === roll.toLowerCase();
    if(!sameRoll) return false;
    if(r.bookingDate) return r.bookingDate === bookingDate;
    // For legacy records without bookingDate, fallback: compare day name to today day name.
    if(r.day){
      const todayDayName = new Date(bookingDate).toLocaleDateString(undefined,{weekday:'long'});
      return r.day === todayDayName;
    }
    return false;
  });
}

async function saveStudent(record){
  if (db) {
    try {
      const newRef = db.ref('records').push();
      await newRef.set(record);
      return;
    } catch(e) { console.error("Firebase write error", e); }
  }
  try {
    const r = await fetch('/api/submit', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(record) });
    const j = await r.json();
    if(j.success) return;
  } catch(e){ }
  const records = await fetchRecordsFromBackend();
  records.push(record);
  records.sort((a,b)=>a.roll.localeCompare(b.roll, undefined, {numeric:true, sensitivity:'base'}));
  localStorage.setItem("nist_mess_records", JSON.stringify(records));
}

async function getSavedRecords(){
  return await fetchRecordsFromBackend();
}

let globalBookingOpen = true; // updated by firebase listener

function updateTimeLimitUI() {
  const info = document.getElementById("bookingWindowInfo");
  const anyInput = document.querySelectorAll("#studentForm input, #studentForm select, #studentForm button.primary");
  const dailyOpen = isDailyWindowOpen();

  if(!globalBookingOpen) {
    if(info) {
      info.innerHTML = `<span style="color:red; font-weight:bold;">BOOKING IS CURRENTLY CLOSED BY ADMIN.</span>`;
      info.style.background = "#ffebee";
      info.style.borderColor = "#ffcdd2";
    }
    anyInput.forEach(i => i.disabled = true);
    return;
  }

  if(!dailyOpen) {
    if(info) {
      info.innerHTML = `Outside of automatic booking hours. Wait for admin to open manually.`;
      info.style.background = "#fff3e0";
      info.style.borderColor = "#ffe0b2";
    }
    anyInput.forEach(i => i.disabled = false);
    return;
  }

  if(info) {
    info.innerHTML = `Booking is open.`;
    info.style.background = "#eef6ff";
    info.style.borderColor = "#bae1ff";
  }
  anyInput.forEach(i => i.disabled = false);
}

function isBookingOpen() {
  return true;
}

function updateDayTime() {
  const now = new Date();
  const today = now.toLocaleDateString(undefined,{weekday:'long'});
  document.getElementById("todayDate").textContent = now.toLocaleDateString();
  document.getElementById("todayDay").textContent = today;

  daySelect.innerHTML = "";
  const hint = document.getElementById("dayHint");

  const dailyOpen = isDayOpen(today) && isDailyWindowOpen();
  const specialOpen = isSpecialSundayBreakfastOpen();
  if (!dailyOpen && !specialOpen) {
    daySelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = `No booking available today (${today}).`;
    daySelect.append(opt);
    timeSelect.innerHTML = "<option value=''>No time slot available</option>";
    hint.textContent = `Today is ${today}. Booking is closed for this day or outside booking hours.`;
    return;
  }

  const tokenDays = bookingToTokenDays[today] ? [...bookingToTokenDays[today]] : [];
  if (today === 'Sunday' && specialOpen) {
    if(!tokenDays.includes("Special Breakfast (Mon-Fri)")) {
      tokenDays.push("Special Breakfast (Mon-Fri)");
    }
  }

  if(tokenDays.length === 0) {
    daySelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No token days mapped for today's booking.";
    daySelect.append(opt);
    timeSelect.innerHTML = "<option value=''>No time slot available</option>";
    hint.textContent = "Contact admin to configure booking tokens.";
    return;
  }

  daySelect.disabled = false;
  daySelect.innerHTML = "<option value=''>Select token day</option>";
  tokenDays.forEach(day=>{
    const opt = document.createElement("option");
    opt.value = day;
    const label = day === "Special Breakfast (Mon-Fri)" ? "Special Breakfast token (Mon-Fri)" : `${day} token (booked today)`;
    opt.textContent = label;
    daySelect.append(opt);
  });
  hint.textContent = `Booking today (${today}). You can book tokens for: ${tokenDays.join(", ")}.`;
  updateTimeForDay(tokenDays[0]);
}

function updateTimeForDay(day){
  timeSelect.innerHTML = "";
  if(!day){ timeSelect.innerHTML = "<option value=''>Choose day first</option>"; return; }
  const slots = dayTimeMap[day] || [];
  if(slots.length===0){ timeSelect.innerHTML = "<option value=''>No slots available</option>"; return; }
  timeSelect.innerHTML = "<option value=''>Select time</option>";
  slots.forEach(t => { const opt = document.createElement("option"); opt.value=t; opt.textContent=t; timeSelect.append(opt); });
}

function fillMenuOptions(){
  const day = studentData.day; const time = studentData.time;
  const key = `${day}|${time}`;
  const choices = menuByDayTime[key];
  if(!choices){ menuItem.innerHTML = "<option value=''>No menu found</option>"; return; }
  selectedDay.value = day; selectedTime.value = time;
  menuItem.innerHTML = "<option value=''>Choose menu item</option>";
  if(foodType.value === "veg") choices.veg.forEach(i => { const opt=document.createElement("option"); opt.value=i; opt.textContent=i; menuItem.append(opt);} );
  if(foodType.value === "nonveg") choices.nonveg.forEach(i => { const opt=document.createElement("option"); opt.value=i; opt.textContent=i; menuItem.append(opt);} );
}

function generateTokenId(){
  const rand = Math.floor(Math.random()*9000)+1000;
  const now = Date.now().toString().slice(-5);
  return `NIST-${now}-${rand}`;
}

function renderToken() {
  const tokenDate = studentData.tokenDate || new Date().toLocaleString();
  studentData.tokenDate = tokenDate;
  studentData.tokenId = studentData.tokenId || generateTokenId();

  document.getElementById("tokenName").textContent = studentData.name;
  document.getElementById("tokenRoll").textContent = studentData.roll;
  document.getElementById("tokenMobile").textContent = studentData.mobile;
  document.getElementById("tokenHostel").textContent = studentData.hostel;
  document.getElementById("tokenRoom").textContent = studentData.room;
  document.getElementById("tokenDay").textContent = studentData.day;
  document.getElementById("tokenTime").textContent = studentData.time;
  document.getElementById("tokenFood").textContent = studentData.menuItem;
  document.getElementById("tokenId").textContent = studentData.tokenId;
  document.getElementById("tokenDate").textContent = studentData.tokenDate;
  const tokenLinkEl = document.getElementById("tokenLink");
  if(tokenLinkEl){
    const baseUrl = window.location.origin + window.location.pathname;
    const snapshot = { ...studentData };
    delete snapshot.tokenLink;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))));
    const link = baseUrl + "?token=" + encoded;
    studentData.tokenLink = link;
    tokenLinkEl.textContent = "View Digital Token";
    tokenLinkEl.href = link;
  }
}

function getAdminFilters(){
  return {
    hostel: document.getElementById("adminHostelFilter").value,
    roll: document.getElementById("adminRollFilter").value.trim().toLowerCase(),
    foodType: document.getElementById("adminFoodTypeFilter").value,
    date: document.getElementById("adminDateFilter").value
  };
}

async function showMessList(applyFilter = true) {
  const records = await getSavedRecords();
  const {hostel, roll, foodType, date} = getAdminFilters();
  const tbody = document.querySelector("#messTable tbody");
  tbody.innerHTML = "";

  let filtered = records;
  if(applyFilter){
    filtered = records.filter(r=>{
      let keep = true;
      if(hostel !== "all") keep = keep && r.hostel === hostel;
      if(roll) keep = keep && r.roll.toLowerCase().includes(roll);
      if(foodType !== "all") {
        const type = (r.foodType || "").toLowerCase();
        keep = keep && (type === foodType);
      }
      if(date) {
        keep = keep && ((r.bookingDate || "") === date);
      }
      return keep;
    });
  }

  const totalCount = filtered.length;
  const vegCount = filtered.filter(r=> (r.foodType || "").toLowerCase() === "veg").length;
  const nonvegCount = filtered.filter(r=> (r.foodType || "").toLowerCase() === "nonveg").length;
  document.getElementById("adminTotalCount").textContent = totalCount;
  document.getElementById("adminVegCount").textContent = vegCount;
  document.getElementById("adminNonVegCount").textContent = nonvegCount;

  if(filtered.length===0){ tbody.innerHTML = '<tr><td colspan="10" style="text-align:center">No submissions match filters</td></tr>'; return; }
  filtered.forEach(r=>{
    const tr=document.createElement("tr");
    const foodTypeLabel = r.foodType ? (r.foodType.toLowerCase()==='veg' ? 'Veg' : 'Non-Veg') : '--';
    const bookingDate = r.bookingDate ? r.bookingDate : '';
    const dayLabel = r.day ? r.day : '';
    const tokenLinkCell = r.tokenLink ? `<a href="${r.tokenLink}" target="_blank" rel="noopener noreferrer">Link</a>` : "-";
    tr.innerHTML = `<td>${r.roll}</td><td>${r.name}</td><td>${r.hostel}</td><td>${r.room}</td><td>${r.mobile}</td><td>${bookingDate}</td><td>${dayLabel}</td><td>${r.time}</td><td>${foodTypeLabel}</td><td>${r.menuItem}</td><td>${tokenLinkCell}</td>`;
    tbody.append(tr);
  });
 }

studentForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const name = studentForm.name.value.trim();
  const roll = studentForm.roll.value.trim();
  const room = studentForm.room.value.trim();
  const hostel = studentForm.hostel.value;
  const mobile = studentForm.mobile.value.trim();
  if(!name||!roll||!room||!hostel||!mobile){ showError(error1, "Please complete all required fields."); return; }
  if(!/^\d{10}$/.test(mobile)){ showError(error1, "Enter a 10-digit mobile number."); return; }
  studentData = { name, roll, room, hostel, mobile };
  setActive("page2");
});

daySelect.addEventListener("change", ()=>{ updateTimeForDay(daySelect.value); });

dayForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const day = daySelect.value;
  const time = timeSelect.value;
  if(!day || !time){ showError(error2, "Please select day and time slot."); return; }
  const bookingDate = getBookingDate();
  if(await isRollUsedOnDate(studentData.roll, bookingDate)){
    showError(error2, "This roll number already has a token for today. Try again tomorrow.");
    return;
  }
  studentData.day = day;
  studentData.time = time;
  studentData.bookingDate = bookingDate;
  foodType.value = "";
  menuItem.innerHTML = "<option value=''>Choose food type first</option>";
  setActive("page3");
});

foodType.addEventListener("change", fillMenuOptions);

menuForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const type=foodType.value;
  const item=menuItem.value;
  if(!type||!item){ showError(error3, "Choose food type and menu item."); return; }
  studentData.foodType = type;
  studentData.menuItem = item;
  studentData.bookingDate = studentData.bookingDate || getBookingDate();
  renderToken();
  const record = { ...studentData };
  await saveStudent(record);
  setActive("page4");
});

document.getElementById("backTo1").addEventListener("click", ()=> setActive("page1"));
document.getElementById("backTo2").addEventListener("click", ()=> setActive("page2"));

document.getElementById("printToken").addEventListener("click", ()=> window.print());
document.getElementById("copyTokenLink").addEventListener("click", ()=>{
  const link = studentData.tokenLink || "";
  if(!link){
    alert("No token link available. Generate a token first.");
    return;
  }
  navigator.clipboard.writeText(link).then(()=>{
    alert("Token link copied to clipboard.");
  }).catch(()=>{
    prompt("Copy this token link:", link);
  });
});
document.getElementById("downloadToken").addEventListener("click", ()=>{
  const div = document.getElementById("tokenCard");
  const html = `<html><head><title>Mess Token</title><style>body{font-family:Arial;}</style></head><body>${div.outerHTML}</body></html>`;
  const blob = new Blob([html],{type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${studentData.roll || 'token'}-mess-token.html`;
  a.click();
  URL.revokeObjectURL(a.href);
});

const ADMIN_PASSWORD = "nist"; // simplified for test
async function openAdminView(){
  window.location.href = 'admin.html';
}

function attachAdminButtons(){
  const showListBtn = document.getElementById("showList");
  if(showListBtn){ showListBtn.addEventListener("click", async ()=>{ await openAdminView(); }); }
  const adminLoginButton = document.getElementById("adminLoginPre");
  if(adminLoginButton){ adminLoginButton.addEventListener("click", async ()=>{ await openAdminView(); }); }
  const adminResetBtn = document.getElementById("adminResetTimeLimit");
  if(adminResetBtn){
    adminResetBtn.addEventListener("click", ()=>{
      updateTimeLimitUI();
      showError(error3, "Admin settings refreshed.");
    });
  }
}

window.addEventListener("DOMContentLoaded", async ()=> {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');
  if (tokenParam) {
    try {
      studentData = JSON.parse(decodeURIComponent(escape(atob(tokenParam))));
      renderToken();
      document.querySelector(".progress-wrap").style.display = "none";
      const showListBtn = document.getElementById("showList");
      if(showListBtn) {
        showListBtn.textContent = "New Token Booking";
        const clone = showListBtn.cloneNode(true);
        showListBtn.parentNode.replaceChild(clone, showListBtn);
        clone.addEventListener("click", (e)=> { e.preventDefault(); window.location.href = window.location.pathname; });
      }
      setActive("page4");
      const page1 = document.getElementById("page1");
      if(page1) page1.classList.remove("active");
  
      return;
    } catch(e) {
      console.error("Invalid token link", e);
    }
  }

  const applyAdminFilterBtn = document.getElementById("applyAdminFilter");
  if(applyAdminFilterBtn){ applyAdminFilterBtn.addEventListener("click", async ()=>{ await showMessList(); }); }
  const adminHostelFilter = document.getElementById("adminHostelFilter");
  if(adminHostelFilter){ adminHostelFilter.addEventListener("change", async ()=>{ await showMessList(); }); }
  const adminRollFilter = document.getElementById("adminRollFilter");
  if(adminRollFilter){ adminRollFilter.addEventListener("input", async ()=>{ await showMessList(); }); }
  const adminFoodTypeFilter = document.getElementById("adminFoodTypeFilter");
  if(adminFoodTypeFilter){ adminFoodTypeFilter.addEventListener("change", async ()=>{ await showMessList(); }); }
  const adminDateFilter = document.getElementById("adminDateFilter");
  if(adminDateFilter){ adminDateFilter.addEventListener("change", async ()=>{ await showMessList(); }); }
  const adminDownloadBtn = document.getElementById("adminDownloadCSV");
  if(adminDownloadBtn){ adminDownloadBtn.addEventListener("click", async ()=>{
      const records = await getSavedRecords();
      const rows = ["Roll,Name,Hostel,Room,Mobile,BookingDate,Day,Time,FoodType,FoodItem"];
      records.forEach(r=> rows.push([r.roll,r.name,r.hostel,r.room,r.mobile,r.bookingDate||'',r.day||'',r.time,r.foodType||'',r.menuItem||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")));
      const blob = new Blob([rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mess-tokens.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }); }
  const adminClearBtn = document.getElementById("adminClearAll");
  if(adminClearBtn){ adminClearBtn.addEventListener("click", async ()=>{
      if(window.confirm('Clear all token records from local storage and refresh?')) {
        localStorage.removeItem('nist_mess_records');
        await showMessList(true);
        showError(error3, 'All local records cleared.');
      }
    }); }
  const adminPrintBtn = document.getElementById("adminPrint");
  if(adminPrintBtn){ adminPrintBtn.addEventListener("click", ()=>{ window.print(); }); }
  const backToStartBtn = document.getElementById("backToStart");
  if(backToStartBtn){ backToStartBtn.addEventListener("click", ()=>{ document.getElementById("page5").classList.remove("active"); setActive("page1"); studentForm.reset(); dayForm.reset(); menuForm.reset(); updateDayTime(); }); }
  const closeTableBtn = document.getElementById("closeTable");
  if(closeTableBtn){ closeTableBtn.addEventListener("click", ()=>{ setActive("page4"); document.getElementById("page5").classList.remove("active"); }); }
  await loadAdminSettings();
  setAdminCheckboxes();
  setActive("page1");
  updateDayTime();

  const mondayToggle = document.getElementById("adminMondayOpen");
  const saturdayToggle = document.getElementById("adminSaturdayOpen");
  const specialToggle = document.getElementById("adminSpecialSundayBreakfast");
  const everydayStart = document.getElementById("everydayStart");
  const everydayEnd = document.getElementById("everydayEnd");
  const saturdayStart = document.getElementById("saturdayStart");
  const saturdayEnd = document.getElementById("saturdayEnd");
  const specialStart = document.getElementById("specialStart");
  const specialEnd = document.getElementById("specialEnd");
  const updateWindowButton = document.getElementById("adminSaveTimeWindow");

  if(mondayToggle){
    mondayToggle.addEventListener("change", async ()=>{
      adminSettings.openMonday = mondayToggle.checked;
      await saveAdminSettings();
      updateDayTime();
      updateTimeLimitUI();
    });
  }
  if(saturdayToggle){
    saturdayToggle.addEventListener("change", async ()=>{
      adminSettings.openSaturday = saturdayToggle.checked;
      await saveAdminSettings();
      updateDayTime();
      updateTimeLimitUI();
    });
  }
  if(specialToggle){
    specialToggle.addEventListener("change", async ()=>{
      adminSettings.specialSundayBreakfast = specialToggle.checked;
      await saveAdminSettings();
      updateDayTime();
      updateTimeLimitUI();
    });
  }

  const adminTokenLink = document.getElementById("adminTokenLink");
  if(adminTokenLink){
    adminTokenLink.addEventListener("input", async ()=>{
      adminSettings.tokenLink = adminTokenLink.value.trim() || defaultSettings.tokenLink;
      await saveAdminSettings();
    });
  }

  if(updateWindowButton){
    updateWindowButton.addEventListener("click", async (e)=>{
      e.preventDefault();
      if(everydayStart && everydayEnd && saturdayStart && saturdayEnd && specialStart && specialEnd){
        adminSettings.everydayStart = everydayStart.value || adminSettings.everydayStart;
        adminSettings.everydayEnd = everydayEnd.value || adminSettings.everydayEnd;
        adminSettings.saturdayStart = saturdayStart.value || adminSettings.saturdayStart;
        adminSettings.saturdayEnd = saturdayEnd.value || adminSettings.saturdayEnd;
        adminSettings.specialStart = specialStart.value || adminSettings.specialStart;
        adminSettings.specialEnd = specialEnd.value || adminSettings.specialEnd;
        await saveAdminSettings();
        updateTimeLimitUI();
        updateDayTime();
        showError(error3, "Time windows updated and active.");
      }
    });
  }

  attachAdminButtons();
  updateTimeLimitUI();

  // Handle Admin Auth Overlay on admin.html
  const adminOverlay = document.getElementById("adminLoginOverlay");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const adminPwInput = document.getElementById("adminPasswordInput");
  const adminLoginError = document.getElementById("adminLoginError");

  if(adminOverlay) {
    adminLoginBtn.addEventListener("click", () => {
      const pw = adminPwInput.value;
      if (pw === "nist2026") {
        adminOverlay.style.display = "none";
        showMessList(true);
      } else {
        adminLoginError.textContent = "Incorrect password.";
      }
    });
  }

  // --- Realtime Firebase Sync for Open/Close Status ---
  if (db) {
    const statusRef = db.ref('status/isOpen');
    
    // Listen for global open/close changes
    statusRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        globalBookingOpen = snapshot.val();
      } else {
        globalBookingOpen = true; // default
      }
      updateTimeLimitUI();
      
      // If we are on admin page, update admin UI
      const badge = document.getElementById("adminBookingStatusBadge");
      if (badge) {
        if (globalBookingOpen) {
          badge.textContent = "Open";
          badge.style.color = "#2e7d32";
        } else {
          badge.textContent = "Closed";
          badge.style.color = "#d32f2f";
        }
      }
    });

    const openBtn = document.getElementById("adminOpenBookingBtn");
    const closeBtn = document.getElementById("adminCloseBookingBtn");
    if (openBtn) openBtn.addEventListener("click", () => statusRef.set(true));
    if (closeBtn) closeBtn.addEventListener("click", () => statusRef.set(false));
  } else {
    // Show warning if firebase isn't configured
    console.warn("Firebase is not configured yet. Fallback to local mode.");
  }
});