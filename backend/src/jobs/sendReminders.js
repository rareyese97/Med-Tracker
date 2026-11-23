#!/usr/bin/env node
import mongoose from "mongoose";
import User from "../models/User.js"; // register User schema for populate
import Med from "../models/Meds.js";
import { formatInTimeZone } from "date-fns-tz";
import { sendMedicationReminderEmail } from "../utils/email.js";

const ZONE = "America/New_York";

async function main() {
	// Timezone-aware current date and schedule values.
	const now = new Date();
	const weekday = formatInTimeZone(now, ZONE, "EEE");
	const timeKey = formatInTimeZone(now, ZONE, "HH:mm");
	const todayKey = formatInTimeZone(now, ZONE, "yyyy-MM-dd");
	const displayTime = formatInTimeZone(now, ZONE, "h:mm a");
	const displayDate = formatInTimeZone(now, ZONE, "MMMM do");

	console.log(`[${new Date().toISOString()}] Querying for day=${weekday}, time=${timeKey}, today=${todayKey}`);

	for (const variable of ["SENDGRID_API_KEY", "MONGO_URI", "FROM_EMAIL"]) {
		if (!process.env[variable]) throw new Error(`${variable} is not defined`);
	}

	await mongoose.connect(process.env.MONGO_URI);

	let sentCount = 0;
	try {
		const dueMeds = await Med.find({
			"schedule.days": weekday,
			"schedule.time": timeKey,
			takenDates: { $ne: todayKey },
		}).populate("user", "email firstName");

		for (const med of dueMeds) {
			const to = med.user?.email;
			if (!to) continue;

			try {
				await sendMedicationReminderEmail(to, {
					firstName: med.user.firstName,
					medName: med.name,
					time: displayTime,
					date: displayDate,
				});
				sentCount++;
			} catch (err) {
				console.error(`[${new Date().toISOString()}] Error emailing ${to}:`, err);
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
