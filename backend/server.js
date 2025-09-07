// backend/server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import rateLimiter from "./rateLimiter.js"; // <-- IMPORT the new rate limiter

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
// Define allowed origins. The frontend running on localhost:5173 is a common default for Vite.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173").split(',');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

// --- Middleware ---
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.set("trust proxy", 1); // Needed for accurately getting IP behind proxies
app.use("/api", rateLimiter); // Apply rate limiter to all /api routes

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
        fields: "name,rating,formatted_address,geometry,place_id,url,website,vicinity,icon",
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