require("dotenv").config();
const express = require("express");
const upload = require("./upload");
const uploadThumbnail = require("./uploadThumbnail");
const jobManager = require("./jobManager");
const logger = require("./logger");
const path = require("path");
const fs = require("fs");
const auth = require("./auth");
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));



const server = app.listen(3000, () => {
  console.log("[INFO] Server started on port 3000");
});

app.post("/api/job", auth,(req, res) => {
  const job = jobManager.createJob();
  res.json({
    id: job.id,
    video: job.video,
    streamUrl: job.streamUrl,
    running: job.running
  });
});

app.get("/api/jobs", (req, res) => {
  res.json(jobManager.getAllJobs());
});

app.post("/api/meta/:jobId", (req, res) => {
  try {
    jobManager.setMetadata(req.params.jobId, req.body);

    logger.info("Metadata updated", {
      jobId: req.params.jobId,
      meta: req.body
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/schedule/:jobId", (req, res) => {
  try {
    jobManager.setSchedule(req.params.jobId, req.body);
    res.json({ message: "Schedule updated" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


app.post("/api/upload/:jobId", upload.single("video"), auth,(req, res) => {
  jobManager.setVideo(req.params.jobId, req.file.filename);
  res.json({ ok: true });
});
app.post(
  "/api/thumbnail/:jobId",
  uploadThumbnail.single("thumbnail"),
  (req, res) => {
    try {
      jobManager.setThumbnail(req.params.jobId, req.file.filename);

      logger.info("Thumbnail uploaded", {
        jobId: req.params.jobId,
        file: req.file.filename
      });

      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);



app.get("/debug-token", (req, res) => {
  res.send(process.env.API_TOKEN || "TOKEN KOSONG");
});



app.post("/api/stream/:id", auth,(req, res) => {
  jobManager.setStream(req.params.id, req.body.streamUrl);
  res.json({ message: "Stream URL set" });
});

app.post("/api/start/:jobId", auth,(req, res) => {
  try {
    jobManager.start(req.params.jobId);
    res.json({ message: "LIVE STARTED" });
  } catch (err) {
    console.error("[ERROR] START FAILED", err);
    res.status(400).json({ error: err.message });
  }
});



app.get("/api/status/:jobId", (req, res) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job tidak ada" });
  }

  const isRunning = !!(
    job.process &&
    job.process.exitCode === null
  );

  const payload = {
  id: job.id,
  running: isRunning,
  startedAt: job.startedAt || null,
  lastEndedAt: job.lastEndedAt || null,
  streamUrl: job.streamUrl || null,
  schedule: job.schedule || null,
  metadata: job.metadata || null
};


  console.log("📡 STATUS API HIT:", payload);
  res.json(payload);
});


app.post("/api/stop/:jobId", auth,(req, res) => {
  jobManager.stop(req.params.jobId);
  res.json({ message: "⏹ Live stopped" });
});


app.get("/api/logs", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const logFile = path.join(__dirname, "app.log");
  let lastSize = 0;

  const interval = setInterval(() => {
    if (!fs.existsSync(logFile)) return;

    const stats = fs.statSync(logFile);
    if (stats.size > lastSize) {
      const stream = fs.createReadStream(logFile, {
        start: lastSize,
        end: stats.size
      });

      stream.on("data", chunk => {
        res.write(`data: ${chunk.toString()}\n\n`);
      });

      lastSize = stats.size;
    }
  }, 1000);

  req.on("close", () => clearInterval(interval));
});





app.get("/api/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const fs = require("fs");
  const path = require("path");
  const logFile = path.join(__dirname, "logs.jsonl");

  let lastSize = 0;

  const interval = setInterval(() => {
    if (!fs.existsSync(logFile)) return;

    const stats = fs.statSync(logFile);
    if (stats.size > lastSize) {
      const stream = fs.createReadStream(logFile, {
        start: lastSize,
        end: stats.size
      });

      stream.on("data", chunk => {
        res.write(`data: ${chunk.toString()}\n\n`);
      });

      lastSize = stats.size;
    }
  }, 1000);

  req.on("close", () => clearInterval(interval));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

process.on("exit", code => {
  console.log("❌ PROCESS EXIT WITH CODE", code);
});

process.on("uncaughtException", err => {
  console.error("🔥 UNCAUGHT:", err);
});

process.on("unhandledRejection", err => {
  console.error("🔥 UNHANDLED:", err);
});

function shutdown() {
  console.log("🛑 Server shutting down...");

  const jobs = jobManager.getAllJobs();
  for (const job of jobs) {
    if (job.running) {
      jobManager.stop(job.id);
    }
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);


