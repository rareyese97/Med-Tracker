#!/usr/bin/env node
import mongoose from "mongoose";
import Med from "../models/Meds.js";
import User from "../models/User.js";
import { format } from "date-fns";
import sgMail from "@sendgrid/mail";

async function main() {
	console.log(`[${new Date().toISOString()}] Starting sendReminders job…`);

	// 1) Configure SendGrid
	if (!process.env.SENDGRID_API_KEY) {
		throw new Error("SENDGRID_API_KEY is not defined");
	}
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);

	// 2) Connect to MongoDB
	if (!process.env.MONGO_URI) {
		throw new Error("MONGO_URI is not defined");
	}
	await mongoose.connect(process.env.MONGO_URI);

	try {
		// 3) Find due meds
		const now = new Date();
		const todayKey = format(now, "yyyy-MM-dd");
		const hour = now.getHours().toString().padStart(2, "0");
		const minute = now.getMinutes().toString().padStart(2, "0");
		const timeKey = `${hour}:${minute}`;
		const weekday = now.toLocaleDateString("en-US", { weekday: "short" });

		const dueMeds = await Med.find({
			"schedule.days": weekday,
			"schedule.time": timeKey,
			takenDates: { $ne: todayKey },
		}).populate("user", "email firstName");

		// 4) Send emails
		let sentCount = 0;
		for (const med of dueMeds) {
			const user = med.user;
			if (!user?.email) continue;
			await sgMail.send({
				to: user.email,
				from: process.env.FROM_EMAIL,
				subject: `⏰ Time to take your ${med.name}`,
				text: `Hi ${user.firstName},\n\nIt's ${format(now, "h:mm a")} on ${format(now, "MMMM do")} — time for your ${
					med.name
				}.\n\n- Med-Tracker`,
			});
			sentCount++;
		}

		return sentCount;
	} finally {
		// 5) Always disconnect, even on error
		await mongoose.disconnect();
	}
}

main()
	.then((sentCount) => {
		console.log(`[${new Date().toISOString()}] ✅ Sent ${sentCount} reminder(s)`);
		process.exit(0);
	})
	.catch((err) => {
		console.error(`[${new Date().toISOString()}] ❌ Error in sendReminders:`, err);
		process.exit(1);
	});
