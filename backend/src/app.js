// src/server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import medsRoutes from "./routes/meds.js";

const app = express();

// ─── CORS ───────────────────────────────────────────────────────────────────────
const corsOptions = {
	origin: "http://localhost:3000",
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// ─── BODY PARSING ───────────────────────────────────────────────────────────────
app.use(express.json());

// ─── DEBUG: LOG EVERY REQUEST ───────────────────────────────────────────────────
app.use((req, res, next) => {
	next();
});

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
	res.send("Medicine Tracker API is running");
});

// ─── ROUTES ─────────────────────────────────────────────────────────────────────
// Public auth
app.use("/api/auth", authRoutes);
app.use("/api/meds", medsRoutes);

// ─── ENV VALIDATION ─────────────────────────────────────────────────────────────
const { MONGO_URI, PORT = 5001 } = process.env;
if (!MONGO_URI) {
	console.error("❌  MONGO_URI is not defined in .env");
	process.exit(1);
}

// ─── CONNECT & START ────────────────────────────────────────────────────────────
mongoose
	.connect(MONGO_URI)
	.then(() => {
		app.listen(PORT, () => {
		});
	})
	.catch((err) => {
		console.error("❌  MongoDB connection error:", err);
		process.exit(1);
	});
