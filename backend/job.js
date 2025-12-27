const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const logger = require("./logger");

class Job {
  constructor(id) {
    this.id = id;
    this.videoFile = null;     // nama file saja (contoh: 123.mp4)
    this.streamUrl = null;
    this.running = false;
    this.process = null;
    this.createdAt = new Date().toISOString();
  }

  /* ================= SETTERS ================= */

  setVideo(filename) {
    this.videoFile = filename;
    logger.info(`Video set`, { jobId: this.id, file: filename });
  }

  setStreamUrl(url) {
    this.streamUrl = url;
    logger.info(`Stream URL set`, { jobId: this.id });
  }

  /* ================= START LIVE ================= */

  start() {
    if (!this.videoFile || !this.streamUrl) {
      throw new Error("Video / Stream URL belum diset");
    }

    if (this.running) {
      return;
    }

    const videoPath = path.join(__dirname, "uploads", this.videoFile);

    if (!fs.existsSync(videoPath)) {
      throw new Error("File video tidak ditemukan");
    }

    logger.info(`LIVE STARTING`, {
      jobId: this.id,
      video: videoPath
    });

    this.process = ffmpeg(videoPath)
      .inputOptions("-re")
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-b:v 3000k",
        "-maxrate 3000k",
        "-bufsize 6000k",
        "-pix_fmt yuv420p",
        "-g 60",
        "-c:a aac",
        "-b:a 128k",
        "-ar 44100",
        "-f flv"
      ])
      .output(this.streamUrl)
      .on("start", () => {
        this.running = true;
        logger.info(`LIVE STARTED`, { jobId: this.id });
      })
      .on("end", () => {
        this.running = false;
        this.process = null;
        logger.info(`LIVE ENDED`, { jobId: this.id });
      })
      .on("error", (err) => {
        this.running = false;
        this.process = null;
        logger.error(`LIVE ERROR`, {
          jobId: this.id,
          error: err.message
        });
      })
      .run();
  }

  /* ================= STOP LIVE ================= */

  stop() {
    if (this.process) {
      this.process.kill("SIGINT");
      this.process = null;
      this.running = false;
      logger.info(`LIVE STOPPED`, { jobId: this.id });
    }
  }

  /* ================= STATUS ================= */

  getStatus() {
    return {
      id: this.id,
      video: this.videoFile,
      streamUrl: this.streamUrl,
      running: this.running,
      createdAt: this.createdAt
    };
  }
}

module.exports = Job;
