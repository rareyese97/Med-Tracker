// src/server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import medsRoutes from "./routes/meds.js";
import interactionsRouter from "./routes/interactions.js";

const app = express();

// ─── CORS Middleware ───────────────────────────────────────────────────────────
const corsOptions = {
	origin: "http://localhost:3000", // your frontend origin
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// ─── JSON Body Parsing ─────────────────────────────────────────────────────────
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("Medicine Tracker API is running"));

// ─── Mount Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/meds", medsRoutes);
app.use("/api/interactions", interactionsRouter);

// ─── Environment Validation ────────────────────────────────────────────────────
const { MONGO_URI, PORT = 5001 } = process.env;
if (!MONGO_URI) {
	console.error("❌  MONGO_URI is not defined in .env");
	process.exit(1);
}

// ─── Connect to MongoDB & Start Server ─────────────────────────────────────────
mongoose
	.connect(MONGO_URI)
	.then(() => {
		// Start Express
		app.listen(PORT, () => {
		});

		// Start the reminder cron job after DB is ready
		import("./jobs/sendReminders.js");
	})
	.catch((err) => {
		console.error("❌  MongoDB connection error:", err);
		process.exit(1);
	});
