#!/usr/bin/env node
import mongoose from "mongoose";
import User from "../models/User.js";
import Med from "../models/Meds.js";
import { formatInTimeZone } from "date-fns-tz";
import { sendMedicationReminderEmail } from "../utils/email.js";

const DEFAULT_TIMEZONE = "America/New_York";

function getValidTimezone(value) {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
		return value;
	} catch {
		return DEFAULT_TIMEZONE;
	}
}

async function main() {
	for (const variable of ["SENDGRID_API_KEY", "MONGO_URI", "FROM_EMAIL"]) {
		if (!process.env[variable]) throw new Error(`${variable} is not defined`);
	}

	await mongoose.connect(process.env.MONGO_URI);
	let sentCount = 0;

	try {
		const users = await User.find({}, "email firstName timezone timezoneMode").lean();

		for (const user of users) {
			if (!user.email) continue;

			// Auto mode is refreshed by the user's browser when they visit the app.
			// Fixed mode keeps using the IANA timezone selected in account settings.
			const timezone = getValidTimezone(user.timezone || DEFAULT_TIMEZONE);
			const now = new Date();
			const weekday = formatInTimeZone(now, timezone, "EEE");
			const timeKey = formatInTimeZone(now, timezone, "HH:mm");
			const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");
			const displayTime = formatInTimeZone(now, timezone, "h:mm a");
			const displayDate = formatInTimeZone(now, timezone, "MMMM do");

			const dueMeds = await Med.find({
				user: user._id,
				"schedule.days": weekday,
				"schedule.time": timeKey,
				takenDates: { $ne: todayKey },
			});

			for (const med of dueMeds) {
				try {
					await sendMedicationReminderEmail(user.email, {
						firstName: user.firstName,
						medName: med.name,
						time: displayTime,
						date: displayDate,
					});
					sentCount++;
				} catch (err) {
					console.error(`[${new Date().toISOString()}] Error emailing ${user.email} for medication ${med._id}:`, err);
				}
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
