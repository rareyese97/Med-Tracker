// src/routes/meds.js
import express from "express";
import Meds from "../models/Meds.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ─── GET /api/meds ────────────────────────────────────────────────
// If ?date=YYYY-MM-DD is provided, only meds scheduled on that weekday are returned.
router.get("/", authMiddleware, async (req, res) => {
	try {
		let query = { user: req.user.id };
		if (req.query.date) {
			const d = new Date(req.query.date);
			if (isNaN(d)) return res.status(400).json({ message: "Invalid date" });
			const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
			query["schedule.days"] = dayName;
		}
		const meds = await Meds.find(query).lean();
		res.json(meds);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// ─── POST /api/meds ───────────────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
	let { name, dosage, schedule } = req.body;
	if (Array.isArray(name)) name = name[0];
	if (!name || !dosage || !schedule?.time || !Array.isArray(schedule.days)) {
		return res.status(400).json({ message: "Missing required fields" });
	}
	try {
		const med = new Meds({
			user: req.user.id,
			name,
			dosage,
			schedule,
			takenDates: [],
		});
		await med.save();
		res.status(201).json(med);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// ─── PUT /api/meds/:medId/toggle ───────────────────────────────────
// Toggles “taken” for a specific date passed in body (date: "YYYY-MM-DD").
router.put("/:medId/toggle", authMiddleware, async (req, res) => {
	try {
		const { date } = req.body;
		if (!date) {
			return res.status(400).json({ message: "Date is required to toggle taken status" });
		}
		const med = await Meds.findOne({ _id: req.params.medId, user: req.user.id });
		if (!med) return res.status(404).json({ message: "Medication not found" });

		const idx = med.takenDates.indexOf(date);
		if (idx >= 0) {
			med.takenDates.splice(idx, 1);
		} else {
			med.takenDates.push(date);
		}
		await med.save();
		res.json(med);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// ─── DELETE /api/meds/:medId ───────────────────────────────────────
router.delete("/:medId", authMiddleware, async (req, res) => {
	try {
		const result = await Meds.deleteOne({ _id: req.params.medId, user: req.user.id });
		if (result.deletedCount === 0) {
			return res.status(404).json({ message: "Medication not found" });
		}
		res.json({ message: "Deleted" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// ─── PUT /api/meds/:medId ───────────────────────────────────────────────
// Updates name, dosage, and schedule for a medication
router.put("/:medId", authMiddleware, async (req, res) => {
	const { name, dosage, schedule } = req.body;
	if (!name || !dosage || !schedule?.time || !Array.isArray(schedule.days)) {
		return res.status(400).json({ message: "Missing required fields" });
	}
	try {
		const med = await Meds.findOneAndUpdate(
			{ _id: req.params.medId, user: req.user.id },
			{ name, dosage, schedule },
			{ new: true }
		);
		if (!med) {
			return res.status(404).json({ message: "Medication not found" });
		}
		res.json(med);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

export default router;
