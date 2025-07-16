// src/models/Meds.js
import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
	{
		time: { type: String, required: true },
		days: [{ type: String, enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], required: true }],
	},
	{ _id: false }
);

const medSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		name: { type: String, required: true },
		dosage: { type: String, required: true },
		schedule: { type: scheduleSchema, required: true },
		takenDates: { type: [String], default: [] },
	},
	{ timestamps: true }
);

export default mongoose.model("Meds", medSchema);
