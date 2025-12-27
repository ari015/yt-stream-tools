console.log("✅ script.js loaded");


/* ===== ELEMENTS ===== */
const goBtn = document.getElementById("goLiveBtn");
const stopBtn = document.getElementById("stopLive");
const saveBtn = document.getElementById("saveScheduleBtn");

const startEl = document.getElementById("startTime");
const stopEl = document.getElementById("stopTime");

const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const privacyEl = document.getElementById("privacy");
const tagsEl = document.getElementById("tags");
const categoryEl = document.getElementById("category");
const latencyEl = document.getElementById("latency");
const resolutionEl = document.getElementById("resolution");
const modeSelect = document.getElementById("mode");

const madeForKidsEl = document.getElementById("madeForKids");
const enableDvrEl = document.getElementById("enableDvr");
const closedCaptionsEl = document.getElementById("closedCaptions");

const loginStatus = document.getElementById("loginStatus");
const liveStatus = document.getElementById("liveStatus");
const scheduleStatus = document.getElementById("scheduleStatus");

const uploadProgress = document.getElementById("uploadProgress");
const uploadPercent = document.getElementById("uploadPercent");

const videoInput = document.getElementById("videoFile");
const uploadBtn = document.getElementById("uploadVideoBtn");
const videoStatus = document.getElementById("videoStatus");
const logBox = document.getElementById("logBox");

let videoReady = false;
// ===== THUMBNAIL ELEMENTS =====
const thumbInput = document.getElementById("thumbnailFile");
const thumbBtn = document.getElementById("uploadThumbnailBtn");
const thumbStatus = document.getElementById("thumbnailStatus");

let thumbnailReady = false;
// ===== UPLOAD THUMBNAIL =====
thumbBtn.onclick = async () => {
  const file = thumbInput.files[0];

  if (!file) {
    alert("⛔ Pilih thumbnail dulu");
    return;
  }

  const formData = new FormData();
  formData.append("thumbnail", file);

  thumbStatus.innerText = "⬆ Uploading...";

  const res = await fetch("/api/upload-thumbnail", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    thumbStatus.innerText = "❌ Upload gagal";
    return;
  }

  thumbnailReady = true;
  thumbStatus.innerText = "✅ Thumbnail siap";
};

/* ================= VIDEO UPLOAD ================= */

uploadBtn.onclick = () => {
  const file = videoInput.files[0];

  if (!file) {
    alert("⛔ Pilih video dulu");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".mp4")) {
    alert("⛔ Hanya file MP4");
    videoInput.value = "";
    return;
  }

  const formData = new FormData();
  formData.append("video", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/upload");

  uploadProgress.value = 0;
  uploadPercent.innerText = "0%";
  videoStatus.innerText = "⬆ Uploading...";

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const p = Math.round((e.loaded / e.total) * 100);
      uploadProgress.value = p;
      uploadPercent.innerText = p + "%";
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      videoReady = true;
      videoStatus.innerText = "✅ Video siap";
      uploadPercent.innerText = "100%";
    } else {
      videoStatus.innerText = "❌ Upload gagal";
    }
  };

  xhr.onerror = () => {
    videoStatus.innerText = "❌ Upload error";
  };

  xhr.send(formData);
};

/* ================= LOGIN ================= */

async function loadMe() {
  const res = await fetch("/api/me");
  const data = await res.json();

  loginStatus.innerText = data.loggedIn
    ? "🔐 " + data.email
    : "🔓 Not Logged In";

  if (!data.loggedIn) {
    goBtn.disabled = true;
    saveBtn.disabled = false;
  }
}

/* ================= GO LIVE ================= */

goBtn.onclick = async () => {
  if (!videoReady) {
    alert("⛔ Upload video dulu");
    return;
  }

  goBtn.disabled = true;
  goBtn.innerText = "⏳ Starting...";

  const res = await fetch("/api/go-live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
  title: titleEl.value,
  description: descEl.value,
  privacy: privacyEl.value,

  tags: tagsEl.value
    .split(",")
    .map(t => t.trim())
    .filter(Boolean),

  categoryId: categoryEl.value,
  latency: latencyEl.value,
  resolution: resolutionEl.value,

  madeForKids: madeForKidsEl.checked,
  enableDvr: enableDvrEl.checked,
  closedCaptions: closedCaptionsEl.checked
})

  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "GO LIVE gagal");
    goBtn.disabled = false;
    goBtn.innerText = "🔥 GO LIVE";
    return;
  }

  goBtn.innerText = "🔴 LIVE";
};
function normalizeTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/* ================= SAVE SCHEDULE ================= */

function isValid24H(time) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

saveBtn.onclick = async () => {
  const start = startEl.value.trim();
  const stop = stopEl.value.trim();

  if (!isValid24H(start) || !isValid24H(stop)) {
    alert("⛔ Format jam harus HH:MM (24 jam)");
    return;
  }

  const res = await fetch("/api/daily-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, stop })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Gagal set schedule");
    return;
  }

  scheduleStatus.innerText = data.message;
};





/* ================= STOP ================= */

stopBtn.onclick = async () => {
  await fetch("/api/stop", { method: "POST" });
};

/* ================= REALTIME STATUS ================= */

async function refreshStatusRealtime() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
// 🔒 LOCK SAVE SCHEDULE JIKA MODE 24/7
if (data.mode === "always") {
  saveBtn.disabled = true;
  saveBtn.style.opacity = 0.4;
} else {
  saveBtn.disabled = false;
  saveBtn.style.opacity = 1;
}

    if (data.running) {
      liveStatus.innerText = "🔴 LIVE";
      liveStatus.style.color = "#22c55e";
    } else {
      liveStatus.innerText = "⏹ STOPPED";
      liveStatus.style.color = "#ef4444";
    }
if (data.schedule) {
  scheduleStatus.innerText = data.schedule.crossDay
    ? `⏰ ${data.schedule.start} → ${data.schedule.stop} (lintas hari)`
    : `⏰ ${data.schedule.start} - ${data.schedule.stop}`;
}

    if (data.nextStart && data.nextStop) {
      scheduleStatus.innerText =
        `⏰ Aktif: ${data.nextStart} - ${data.nextStop}`;
    }

   // ================= BUTTON RULES (FIXED) =================

// GO LIVE:
// hanya disabled jika schedule SUDAH ADA
goBtn.disabled = !!data.nextStart;
goBtn.style.opacity = goBtn.disabled ? 0.5 : 1;

// SAVE SCHEDULE:
// BOLEH diklik selama:
// - BELUM ada schedule

saveBtn.style.opacity = saveBtn.disabled ? 0.5 : 1;


  } catch (err) {
    console.error(err);
  }
}

/* ================= LOG STREAM ================= */

const evtSource = new EventSource("/api/logs");
evtSource.onmessage = (e) => {
  const logs = JSON.parse(e.data);
  logBox.textContent = logs.join("\n");
  logBox.scrollTop = logBox.scrollHeight;
};
modeSelect.onchange = async () => {
  await fetch("/api/mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: modeSelect.value })
  });
};

/* ================= INIT ================= */

loadMe();
refreshStatusRealtime();
setInterval(refreshStatusRealtime, 3000);
