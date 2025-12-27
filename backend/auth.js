module.exports = function auth(req, res, next) {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.split(" ")[1];

  if (token !== process.env.API_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  next();
};
