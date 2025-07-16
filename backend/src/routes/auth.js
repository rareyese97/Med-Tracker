// src/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import Med from "../models/Meds.js"; 
import { generateOtp } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/email.js";
import crypto from "crypto";

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL;

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
	const { firstName, email, password } = req.body;
	try {
		if (await User.findOne({ email })) {
			return res.status(400).json({ message: "Email already in use" });
		}

		const user = new User({ firstName, email, password });
		await user.save();

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

		res.status(201).json({
			firstName: user.firstName,
			email: user.email,
			token,
			isVerified: user.isVerified,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user || !(await user.comparePassword(password))) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		if (!user.isVerified) {
			return res.status(403).json({ message: "Email not verified" });
		}

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

		res.json({
			firstName: user.firstName,
			email: user.email,
			token,
			isVerified: user.isVerified,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// ─── SEND VERIFICATION CODE ──────────────────────────────────────────────────
router.post("/send-code", async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const code = generateOtp();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

		await Otp.findOneAndUpdate({ email }, { code, expiresAt }, { upsert: true, new: true });
		await sendOtpEmail(email, code);

		res.json({ message: "Verification code sent" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// ─── VERIFY CODE ─────────────────────────────────────────────────────────────
router.post("/verify-code", async (req, res) => {
	const { email, code } = req.body;
	try {
		const record = await Otp.findOne({ email, code });
		if (!record) {
			return res.status(400).json({ message: "Invalid or expired verification code" });
		}

		await User.updateOne({ email }, { isVerified: true });
		await Otp.deleteOne({ _id: record._id });

		res.json({ message: "Email successfully verified" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.post("/delete-account", async (req, res) => {
	// Authenticate via Bearer token
	const authHeader = req.headers.authorization || "";
	if (!authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Missing or invalid authorization header" });
	}
	const token = authHeader.slice(7);

	// Verify JWT
	let payload;
	try {
		payload = jwt.verify(token, process.env.JWT_SECRET);
	} catch (err) {
		return res.status(401).json({ message: "Invalid token" });
	}

	const { password } = req.body;
	if (!password) {
		return res.status(400).json({ message: "Password is required" });
	}

	try {
		const user = await User.findById(payload.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Verify password
		if (!(await user.comparePassword(password))) {
			return res.status(400).json({ message: "Incorrect password" });
		}

		// Delete associated data
		await Med.deleteMany({ user: user._id });
		await Otp.deleteMany({ email: user.email });

		// Delete user
		await User.deleteOne({ _id: user._id });

		res.json({ message: "Account and all associated data deleted" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// ─── REQUEST PASSWORD RESET ────────────────────────────────────────────────────
router.post("/request-password-reset", async (req, res) => {
	const { email } = req.body;
	if (!email) {
		return res.status(400).json({ message: "Email is required" });
	}

	try {
		const user = await User.findOne({ email });
		if (!user) {
			// for security
			return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
		}

		// generate a secure token
		const token = crypto.randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		// upsert into Otp collection
		await Otp.findOneAndUpdate({ email, type: "reset" }, { code: token, expiresAt }, { upsert: true, new: true });

		// send the reset email
		const resetLink = `${FRONTEND_URL}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
		await sendOtpEmail(email, token, {
			subject: "Your password reset link",
			text: `Click here to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.`,
			html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
		});

		res.json({ message: "If that email exists, a reset link has been sent." });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// ─── RESET PASSWORD ─────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
	const { email, token, newPassword } = req.body;
	if (!email || !token || !newPassword) {
		return res.status(400).json({ message: "Email, token, and newPassword are required" });
	}

	try {
		// find the reset record
		const record = await Otp.findOne({ email, code: token, type: "reset" });
		if (!record || record.expiresAt < new Date()) {
			return res.status(400).json({ message: "Invalid or expired reset link" });
		}

		// find and update the user
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		user.password = newPassword;
		await user.save();

		// clean up
		await Otp.deleteOne({ _id: record._id });

		res.json({ message: "Password has been reset successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

export default router;
