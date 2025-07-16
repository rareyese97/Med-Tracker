// src/routes/interactions.js
import express from "express";
import fetch from "node-fetch"; // or global fetch in Node18+
import Meds from "../models/Meds.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/interactions?date=YYYY-MM-DD
router.get("/", authMiddleware, async (req, res) => {
	const { date } = req.query;
	if (!date || typeof date !== "string") {
		return res.status(400).json({ message: "Missing date parameter" });
	}

	// 1) figure out weekday
	const d = new Date(date);
	if (isNaN(d.getTime())) {
		return res.status(400).json({ message: "Invalid date" });
	}
	const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

	// 2) load meds for that user/day
	const meds = await Meds.find({
		user: req.user.id,
		"schedule.days": dayName,
	}).lean();
	const cuis = meds
		.map((m) => m.rxcui) // make sure each Med doc has an `rxcui` field!
		.filter(Boolean)
		.join("+");
	if (!cuis) {
		return res.json([]);
	}

	try {
		// 3) fetch the interaction list
		const intUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${cuis}`;
		const intResp = await fetch(intUrl, { headers: { Accept: "application/json" } });
		if (!intResp.ok) {
			console.warn("interaction list returned", intResp.status);
			return res.json([]);
		}
		const intJson = await intResp.json();

		// 4) turn it into your Alert shape
		const alerts = [];
		(intJson.fullInteractionTypeGroup || []).forEach((group) => {
			(group.fullInteractionType || []).forEach((type) => {
				(type.interactionPair || []).forEach((pair) => {
					const drugs = pair.interactionConcept.map((c) => c.minConceptItem.name);
					const id = pair.interactionConcept.map((c) => c.minConceptItem.rxcui).join("-");
					alerts.push({
						id: `int-${id}`,
						message: pair.description,
						severity: pair.severity === "high" ? "high" : pair.severity === "moderate" ? "medium" : "low",
						drugsInvolved: drugs,
						recommendation: pair.interactionIndicatorText,
						link: pair.interactionConcept[0].sourceConceptItem?.url,
					});
				});
			});
		});

		res.json(alerts);
	} catch (err) {
		console.error("Error in interactions route:", err);
		res.status(500).json({ message: err.message });
	}
});

export default router;
