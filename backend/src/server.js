// src/server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import medsRoutes from "./routes/meds.js";
import interactionsRouter from "./routes/interactions.js";

const app = express();

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);

app.use(express.json());

// Health check
app.get("/", (_req, res) => res.send("Medicine Tracker API is running"));

// ─── ENV VALIDATION ─────────────────────────────────────────────────────────────
const { MONGO_URI, PORT = 5001 } = process.env;
if (!MONGO_URI) {
	console.error("❌  MONGO_URI is not defined in your environment");
	process.exit(1);
}

// ─── CONNECT TO MONGODB & START SERVER ─────────────────────────────────────────
mongoose
	.connect(MONGO_URI)
	.then(() => {
		console.log("✅ Connected to MongoDB");

		// ─── MOUNT ROUTES ─────────────────────────────────────────────
		app.use("/api/auth", authRoutes); 
		app.use("/api/meds", medsRoutes);
		app.use("/api/interactions", interactionsRouter);

		// ─── START SERVER ─────────────────────────────────────────────
		app.listen(PORT, () => {
			console.log(`✅ Server running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error("❌ MongoDB connection error:", err);
		process.exit(1);
	});
