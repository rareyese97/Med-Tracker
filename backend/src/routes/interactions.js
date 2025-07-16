// src/routes/interactions.js
import express from "express";
import Meds from "../models/Meds.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/interactions?date=YYYY-MM-DD
router.get("/", authMiddleware, async (req, res) => {
	const { date } = req.query;
	if (!date || typeof date !== "string") {
		return res.status(400).json({ message: "Missing date parameter" });
	}

	try {
		// Determine weekday
		const d = new Date(date);
		if (isNaN(d.getTime())) {
			return res.status(400).json({ message: "Invalid date" });
		}
		const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

		// Fetch user medications for that weekday
		const meds = await Meds.find({ user: req.user.id, "schedule.days": dayName }).lean();
		const names = meds.map((m) => m.name);

		// Lookup RXCUI via RxNav approximateTerm
		const rxcuiMap = {};
		await Promise.all(
			names.map(async (name) => {
				try {
					const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(
						name
					)}&maxEntries=1`;
					const resp = await fetch(url);
					if (!resp.ok) {
						console.warn(`approximateTerm returned ${resp.status} for ${name}`);
						return;
					}
					const json = await resp.json();
					const candidate = json.approximateGroup?.candidate?.[0];
					if (candidate && candidate.rxcui) {
						rxcuiMap[name] = candidate.rxcui;
					}
				} catch (e) {
					console.warn(`RXCUI lookup failed for ${name}`, e);
				}
			})
		);

		const cuis = Object.values(rxcuiMap);
		if (!cuis.length) return res.json([]);
		const rxcuis = cuis.join("+");

		// // Call interaction API with ONCHigh source
		// const intUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis}&sources=DrugBank`;
		// const intResp = await fetch(intUrl);
		// if (!intResp.ok) {
		// 	console.warn(`interaction list returned ${intResp.status}`);
		// 	return res.json([]);
		// }
		// const intJson = await intResp.json();

		// Parse alerts
		const alerts = [];
		(intJson.interactionTypeGroup || []).forEach((group) => {
			(group.interactionType || []).forEach((type) => {
				(type.interactionPair || []).forEach((pair) => {
					const drugs = pair.interactionConcept.map((c) => c.minConceptItem.name);
					const id = drugs.map((d, i) => pair.interactionConcept[i].minConceptItem.rxcui).join("-");
					alerts.push({
						id: `int-${id}`,
						message: pair.description,
						severity: (pair.severity || "unknown").toLowerCase(),
						drugsInvolved: drugs,
					});
				});
			});
		});

		return res.json(alerts);
	} catch (err) {
		console.error("Error in interactions route:", err);
		res.status(500).json({ message: err.message });
	}
});

export default router;
