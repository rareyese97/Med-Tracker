// src/jobs/sendReminders.js

// 1) Load env vars
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import cron from "node-cron";
import Med from "../models/Meds.js";
import User from "../models/User.js";
import { format } from "date-fns";
import sgMail from "@sendgrid/mail";

// 2) Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

if (!process.env.SENDGRID_API_KEY) {
	console.error("✖️  SENDGRID_API_KEY is missing—reminder emails will not send.");
}

// 3) Schedule: run this every minute
cron.schedule("* * * * *", async () => {
	const now = new Date();
	const todayKey = format(now, "yyyy-MM-dd");
	const hour = now.getHours().toString().padStart(2, "0");
	const minute = now.getMinutes().toString().padStart(2, "0");
	const timeKey = `${hour}:${minute}`;
	const weekday = now.toLocaleDateString("en-US", { weekday: "short" });

	// Find meds due right now that haven’t been taken today
	const dueMeds = await Med.find({
		"schedule.days": weekday,
		"schedule.time": timeKey,
		takenDates: { $ne: todayKey },
	}).populate("user", "email firstName");

	for (const med of dueMeds) {
		const user = med.user;
		if (!user?.email) continue;

		const msg = {
			to: user.email,
			from: process.env.FROM_EMAIL,
			subject: `⏰ Time to take your ${med.name}`,
			text: `Hi ${user.firstName},\n\nIt's ${format(now, "h:mm a")} on ${format(now, "MMMM do")} — time for your ${
				med.name
			}.\n\n– Med-Tracker`,
		};

		try {
			await sgMail.send(msg);
		} catch (err) {
			console.error("❌ SendGrid error sending reminder:", err);
		}
	}
});
