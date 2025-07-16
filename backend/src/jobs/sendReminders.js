#!/usr/bin/env node
import mongoose from "mongoose";
import Med from "../models/Meds.js";
import { utcToZonedTime, format } from "date-fns-tz";
import sgMail from "@sendgrid/mail";

async function main() {
	const now = utcToZonedTime(new Date(), "America/New_York");
	const weekday = format(now, "EEE");
	const timeKey = format(now, "HH:mm");
	const todayKey = format(now, "yyyy-MM-dd");

	console.log(`[${new Date().toISOString()}] Querying for day=${weekday}, time=${timeKey}, today=${todayKey}`);

	// Validate env
	for (const v of ["SENDGRID_API_KEY", "MONGO_URI", "FROM_EMAIL"]) {
		if (!process.env[v]) throw new Error(`${v} is not defined`);
	}
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);

	await mongoose.connect(process.env.MONGO_URI);

	let sentCount = 0;
	try {
		const dueMeds = await Med.find({
			"schedule.days": weekday,
			"schedule.time": timeKey,
			takenDates: { $ne: todayKey },
		}).populate("user", "email firstName");

		for (const med of dueMeds) {
			if (!med.user?.email) continue;
			try {
				await sgMail.send({
					to: med.user.email,
					from: process.env.FROM_EMAIL,
					subject: `⏰ Time to take your ${med.name}`,
					text: `Hi ${med.user.firstName},\n\nIt's ${format(now, "h:mm a")} on ${format(
						now,
						"MMMM do"
					)} — time for your ${med.name}.\n\n– Med-Tracker`,
				});
				sentCount++;
			} catch (err) {
				console.error(`[${new Date().toISOString()}] Error emailing ${med.user.email}:`, err);
			}
		}
	} finally {
		await mongoose.disconnect();
	}

	console.log(`[${new Date().toISOString()}] ✅ Sent ${sentCount} reminder(s)`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(`[${new Date().toISOString()}] ❌`, err);
		process.exit(1);
	});
