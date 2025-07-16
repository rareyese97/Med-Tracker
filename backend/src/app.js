// src/app.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import medsRoutes from "./routes/meds.js";
// …any other routes

dotenv.config();

const app = express();

// ─── CONNECT TO MONGODB ───────────────────────────────────────────────────────
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("✅ Connected to MongoDB"))
	.catch((err) => {
		console.error("❌ MongoDB connection error:", err);
		process.exit(1);
	});

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
// Allow your frontend origin (set in .env as FRONTEND_URL) to call this API
app.use(
	cors({
		origin: process.env.FRONTEND_URL,
	})
);
app.use(express.json());

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/meds", medsRoutes);
// …mount other routers here

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.send("OK"));

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
});
