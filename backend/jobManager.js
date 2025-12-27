const { spawn } = require("child_process");
const path = require("path");
const jobStore = require("./jobStore");
const logger = require("./logger");

const jobs = jobStore.loadJobs();

/* ===============================
   AUTO RESUME (ON BOOT)
================================ */
setTimeout(() => {
  for (const job of jobs.values()) {
    if (job.running && job.video && job.streamUrl) {
      logger.info("🔁 Auto resume job", { id: job.id });
      safeStart(job.id);
    }
  }
}, 3000);

/* ===============================
   CORE HELPERS
================================ */

function persist() {
  jobStore.saveJobs(jobs);
}

function getJob(id) {
  return jobs.get(id);
}

function safeStart(id) {
  try {
    start(id);
  } catch (e) {
    logger.error("Start failed", { id, error: e.message });
  }
}

/* ===============================
   JOB API
================================ */

function createJob() {
  const id = Date.now().toString();

  const job = {
    id,
    video: null,
    thumbnail: null,
    streamUrl: null,

    process: null,
    running: false,

    autoRestart: true,
    restartCount: 0,
    stoppedByUser: false,
    lastOutput: null,

    metadata: {
      title: "",
      description: "",
      tags: [],
      visibility: "public",
      categoryId: "22",
      audience: { madeForKids: false },
      chat: { enabled: true },
      dvr: true,
      latency: "normal",
      monetization: false
    },

    schedule: {
      enabled: false,
      everyDay: true,
      days: [],
      time: null,
      lastRun: null
    }
  };

  jobs.set(id, job);
  persist();
  return job;
}

function setVideo(id, filename) {
  const job = getJob(id);
  if (!job) throw new Error("Job tidak ditemukan");

  job.video = filename;
  persist();
}

function setStream(id, url) {
  const job = getJob(id);
  if (!job) throw new Error("Job tidak ditemukan");

  job.streamUrl = url;
  persist();
}

function setThumbnail(id, filename) {
  const job = getJob(id);
  if (!job) throw new Error("Job tidak ditemukan");

  job.thumbnail = filename;
  persist();
}

function setMetadata(id, meta) {
  const job = getJob(id);
  if (!job) throw new Error("Job tidak ditemukan");

  job.metadata = {
    ...job.metadata,
    ...meta,
    audience: {
      madeForKids: meta.madeForKids ?? job.metadata.audience.madeForKids
    }
  };
  persist();
}

function setSchedule(id, data) {
  const job = getJob(id);
  if (!job) throw new Error("Job tidak ditemukan");

  job.schedule = { ...job.schedule, ...data };
  persist();
}

/* ===============================
   START / STOP
================================ */

function start(id) {
  const job = getJob(id);
  if (!job) throw new Error("Job tidak ditemukan");
  if (job.running) return;
  if (!job.video || !job.streamUrl)
    throw new Error("Video / Stream URL belum diset");

  const videoPath = path.join(__dirname, "uploads", job.video);

  logger.info("▶️ Starting FFmpeg", { id });

  job.stoppedByUser = false;
  job.restartCount = 0;

  job.process = spawn("ffmpeg", [
    "-re",
    "-i", videoPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "aac",
    "-f", "flv",
    job.streamUrl
  ]);

  job.running = true;
  job.lastOutput = Date.now();
  persist();

  job.process.stderr.on("data", data => {
    job.lastOutput = Date.now();
    logger.debug("FFmpeg", { id, msg: data.toString() });
  });

  job.process.on("exit",(code, signal) => {
    logger.warn("FFmpeg exited", { id });

    job.process = null;
    job.running = false;
	job.lastEndedAt = Date.now();
job.lastExitCode = code;
job.lastExitSignal = signal;

    persist();

    if (job.autoRestart && !job.stoppedByUser && job.restartCount < 5) {
      job.restartCount++;
      setTimeout(() => safeStart(id), 5000);
    }
  });
}

function stop(id) {
  const job = getJob(id);
  if (!job?.process) return;

  logger.info("⏹ Stopping FFmpeg", { id });

  job.stoppedByUser = true;
  job.autoRestart = false;

  job.process.kill("SIGINT");
  job.process = null;
  job.running = false;

  persist();
}

/* ===============================
   STATUS
================================ */

function status(id) {
  const job = getJob(id);
  if (!job) return null;

  return {
    id: job.id,
    video: job.video,
    thumbnail: job.thumbnail,
    streamUrl: job.streamUrl,
    running: job.running && !!job.process,
    metadata: job.metadata
  };
}

function getAllJobs() {
  return Array.from(jobs.values());
}

/* ===============================
   SCHEDULER
================================ */

setInterval(() => {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const today = now.toISOString().slice(0, 10);
  const day = ["sun","mon","tue","wed","thu","fri","sat"][now.getDay()];

  for (const job of jobs.values()) {
    const s = job.schedule;
    if (!s.enabled || job.running) continue;
    if (!s.everyDay && !s.days.includes(day)) continue;
    if (s.time !== hhmm || s.lastRun === today) continue;

    logger.info("⏰ Scheduled start", { id: job.id });
    safeStart(job.id);

    job.schedule.lastRun = today;
    persist();
  }
}, 60_000);

/* ===============================
   FREEZE DETECTOR
================================ */

setInterval(() => {
  const now = Date.now();

  for (const job of jobs.values()) {
    if (!job.running || !job.process || !job.lastOutput) continue;

    if (now - job.lastOutput > 60_000) {
      logger.error("❄️ FFmpeg freeze", { id: job.id });

      job.process.kill("SIGKILL");
      job.process = null;
      job.running = false;
      persist();

      if (job.autoRestart) safeStart(job.id);
    }
  }
}, 30_000);

/* ===============================
   EXPORT
================================ */

module.exports = {
  createJob,
  getJob,
  getAllJobs,
  setVideo,
  setStream,
  setThumbnail,
  setMetadata,
  setSchedule,
  start,
  stop,
  status
};
