#!/usr/bin/env node
import mongoose from "mongoose";
import User from "../models/User.js"; // register User schema for populate
import Med from "../models/Meds.js";
import sgMail from "@sendgrid/mail";
import { formatInTimeZone } from "date-fns-tz";

const ZONE = "America/New_York";

async function main() {
	// Timezone‐aware “now”
	const now = new Date();
	const weekday = formatInTimeZone(now, ZONE, "EEE"); // “Mon”, “Tue”, etc.
	const timeKey = formatInTimeZone(now, ZONE, "HH:mm"); // “14:05”
	const todayKey = formatInTimeZone(now, ZONE, "yyyy-MM-dd"); // “2025-07-16”

	console.log(`[${new Date().toISOString()}] Querying for day=${weekday}, time=${timeKey}, today=${todayKey}`);

	// Validate required env vars
	for (const v of ["SENDGRID_API_KEY", "MONGO_URI", "FROM_EMAIL"]) {
		if (!process.env[v]) throw new Error(`${v} is not defined`);
	}
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);

	// Connect to MongoDB
	await mongoose.connect(process.env.MONGO_URI);

	let sentCount = 0;
	try {
		// Find meds due at this day/time
		const dueMeds = await Med.find({
			"schedule.days": weekday,
			"schedule.time": timeKey,
			takenDates: { $ne: todayKey },
		}).populate("user", "email firstName");

		// Send reminder emails
		for (const med of dueMeds) {
			const to = med.user?.email;
			if (!to) continue;
			try {
				await sgMail.send({
					to,
					from: process.env.FROM_EMAIL,
					subject: `⏰ Time to take your ${med.name}`,
					text: `Hi ${med.user.firstName},\n\nIt's ${formatInTimeZone(now, ZONE, "h:mm a")} on ${formatInTimeZone(
						now,
						ZONE,
						"MMMM do"
					)} — time for your ${med.name}.\n\n– Med-Tracker`,
				});
				sentCount++;
			} catch (err) {
				console.error(`[${new Date().toISOString()}] Error emailing ${to}:`, err);
			}
		}
	} finally {
		// Always clean up DB connection
		await mongoose.disconnect();
	}

	console.log(`[${new Date().toISOString()}] ✅ Sent ${sentCount} reminder(s)`);
}

// Invoke only when run directly
main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(`[${new Date().toISOString()}] ❌`, err);
		process.exit(1);
	});
