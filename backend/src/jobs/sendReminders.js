#!/usr/bin/env node
import "dotenv/config";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";
import Med from "../models/Meds.js";
import User from "../models/User.js";
import { format } from "date-fns";
import sgMail from "@sendgrid/mail";

// 1) Load env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// 2) Configure SendGrid
if (!process.env.SENDGRID_API_KEY) {
	console.error("✖️  SENDGRID_API_KEY missing—reminder emails will not send.");
	process.exit(1);
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 3) Connect to MongoDB
if (!process.env.MONGO_URI) {
	console.error("❌  MONGO_URI is not defined");
	process.exit(1);
}
await mongoose.connect(process.env.MONGO_URI);

// 4) Do the work once:
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

for (const med of dueMeds) {
	const user = med.user;
	if (!user?.email) continue;
	try {
		await sgMail.send({
			to: user.email,
			from: process.env.FROM_EMAIL,
			subject: `⏰ Time to take your ${med.name}`,
			text: `Hi ${user.firstName},\n\nIt's ${format(now, "h:mm a")} on ${format(now, "MMMM do")} — time for your ${
				med.name
			}.\n\n- Med-Tracker`,
		});
	} catch (err) {
		console.error("❌  SendGrid error sending reminder:", err);
	}
}

console.log(`✅  Sent ${dueMeds.length} reminder(s) at ${timeKey}`);
await mongoose.disconnect();
process.exit(0);
