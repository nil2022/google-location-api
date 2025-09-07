// backend/server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// --- Simple In-Memory Rate Limiter ---
const config = {
  ipLimit: {
    requests: parseInt(process.env.RATE_LIMIT_IP_REQUESTS, 10),
    windowMs: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS, 10),
  },
  burstLimit: {
    requests: parseInt(process.env.RATE_LIMIT_BURST_REQUESTS, 10),
    windowMs: parseInt(process.env.RATE_LIMIT_BURST_WINDOW_MS, 10),
  },
  globalLimit: {
    requests: parseInt(process.env.RATE_LIMIT_GLOBAL_REQUESTS, 10),
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 10),
  },
  blacklist: {
    threshold: parseInt(process.env.BLACKLIST_HOURLY_THRESHOLD, 10),
    durationMs: parseInt(process.env.BLACKLIST_DURATION_MS, 10),
    windowMs: 3600000, // 1 hour
  },
};

const requestsByIp = new Map();
const blacklistedIps = new Map();
let globalRequests = [];

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestsByIp.entries()) {
    // Keep only requests from the last hour (blacklist window)
    const recentRequests = data.filter(
      (time) => now - time < config.blacklist.windowMs
    );
    if (recentRequests.length > 0) {
      requestsByIp.set(ip, recentRequests);
    } else {
      requestsByIp.delete(ip);
    }
  }
  for (const [ip, expiry] of blacklistedIps.entries()) {
    if (now > expiry) {
      blacklistedIps.delete(ip);
    }
  }
  globalRequests = globalRequests.filter(
    (time) => now - time < config.globalLimit.windowMs
  );
}, 60000);

const rateLimiter = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip;

  // 1. Check Blacklist
  if (blacklistedIps.has(ip) && now < blacklistedIps.get(ip)) {
    return res
      .status(429)
      .json({ error: "Too many requests. IP temporarily blocked." });
  }

  const ipRequests = requestsByIp.get(ip) || [];

  // 2. Check Hourly Limit for Blacklisting
  const hourlyRequests = ipRequests.filter(
    (time) => now - time < config.blacklist.windowMs
  );
  if (hourlyRequests.length >= config.blacklist.threshold) {
    blacklistedIps.set(ip, now + config.blacklist.durationMs);
    console.warn(`IP ${ip} blacklisted for 1 hour.`);
    return res
      .status(429)
      .json({ error: "Suspicious activity. IP temporarily blocked." });
  }

  // 3. Check Global Limit
  if (globalRequests.length >= config.globalLimit.requests) {
    return res
      .status(429)
      .json({
        error: "Service temporarily overloaded. Please try again later.",
      });
  }

  // 4. Check Per-IP Limit
  const ipMinuteRequests = ipRequests.filter(
    (time) => now - time < config.ipLimit.windowMs
  );
  if (ipMinuteRequests.length >= config.ipLimit.requests) {
    return res
      .status(429)
      .json({
        error: "Too many requests from this IP. Try again in a minute.",
      });
  }

  // 5. Check Burst Limit
  const ipBurstRequests = ipRequests.filter(
    (time) => now - time < config.burstLimit.windowMs
  );
  if (ipBurstRequests.length >= config.burstLimit.requests) {
    return res
      .status(429)
      .json({ error: "Too many requests too quickly. Please slow down." });
  }

  // If all checks pass, record the request and proceed
  ipRequests.push(now);
  requestsByIp.set(ip, ipRequests);
  globalRequests.push(now);

  next();
};

const CORS_ALLOWED_ORIGINS = [
  ...process.env.CORS_ALLOWED_ORIGINS,
  "http://localhost:3002",
  // Add other allowed origins here
];
// --- Middleware ---
app.use(helmet());
app.use(cors({ origin: CORS_ALLOWED_ORIGINS })); // IMPORTANT: Change if your frontend runs on a different port
app.use(express.json());
app.use("/api", rateLimiter); // Apply rate limiter to all /api routes
app.set("trust proxy", 1); // Needed for accurately getting IP behind proxies

// --- API Routes ---
const GOOGLE_API_URL = "https://maps.googleapis.com/maps/api/place";

// Proxy for Autocomplete Search
app.post("/api/places/autocomplete", async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: "Input is required" });

  try {
    const response = await axios.get(`${GOOGLE_API_URL}/autocomplete/json`, {
      params: {
        input,
        key: process.env.GOOGLE_API_KEY,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Autocomplete Error:", error.message);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

// Proxy for Place Details
app.post("/api/places/details", async (req, res) => {
  const { place_id } = req.body;
  if (!place_id) return res.status(400).json({ error: "Place ID is required" });

  try {
    const response = await axios.get(`${GOOGLE_API_URL}/details/json`, {
      params: {
        place_id,
        key: process.env.GOOGLE_API_KEY,
        fields:
          "name,rating,formatted_address,geometry,place_id,url,website,vicinity,icon",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Place Details Error:", error.message);
    res.status(500).json({ error: "Failed to fetch place details" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});
