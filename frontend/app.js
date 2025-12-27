async function checkLogin() {
  const res = await fetch("/api/me");
  const data = await res.json();

  const el = document.getElementById("loginStatus");

  if (data.loggedIn) {
    el.innerHTML = `✅ Login sebagai <b>${data.email}</b>`;
  } else {
    el.innerHTML = `❌ Belum login <a href="/oauth/login">Login Google</a>`;
  }
}

async function saveSchedule() {
  const start = document.getElementById("startTime").value;
  const stop = document.getElementById("stopTime").value;

  if (!start || !stop) {
    alert("Start & Stop wajib diisi");
    return;
  }

  const res = await fetch("/api/daily-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, stop })
  });

  const data = await res.json();
  document.getElementById("scheduleStatus").innerText = data.message;
}

async function goLive() {
  const payload = {
    title: "🌧 ASMR Rain Live",
    description: "Relaxing Rain Sounds for Sleep & Focus",
    privacy: "public",
    categoryId: "10",
    language: "en",
    madeForKids: false
  };

  const res = await fetch("/api/go-live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  alert(data.message || "Live dimulai");
}

async function stopLive() {
  await fetch("/api/stop", { method: "POST" });
  alert("Live dihentikan");
}

checkLogin();
