const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "app.log");

function write(level, message, meta = {}) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...meta
  });

  console.log(`[${level.toUpperCase()}]`, message);
  fs.appendFileSync(logFile, line + "\n");
}

module.exports = {
  info: (msg, meta) => write("info", msg, meta),
  warn: (msg, meta) => write("warn", msg, meta),   
  error: (msg, meta) => write("error", msg, meta),
  debug: (msg, meta) => write("debug", msg, meta) 
};
