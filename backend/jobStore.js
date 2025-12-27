const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "jobs.json");

function loadJobs() {
  if (!fs.existsSync(FILE)) return new Map();

  try {
    const raw = fs.readFileSync(FILE);
    const data = JSON.parse(raw);

    const map = new Map();
    for (const id in data) {
      map.set(id, {
        ...data[id],
        process: null,
        running: false
      });
    }

    return map;
  } catch (e) {
    console.error("❌ Failed to load jobs:", e.message);
    return new Map();
  }
}

function saveJobs(jobs) {
  const obj = {};
  for (const [id, job] of jobs) {
    obj[id] = {
      id: job.id,
      video: job.video,
      thumbnail: job.thumbnail,
      streamUrl: job.streamUrl,
      metadata: job.metadata,
	  schedule: job.schedule
    };
  }

  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

module.exports = {
  loadJobs,
  saveJobs
};
