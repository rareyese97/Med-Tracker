// src/routes/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function authMiddleware(req, res, next) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			return res.status(401).json({ message: "Missing or invalid Authorization header" });
		}
		const token = authHeader.split(" ")[1];
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(payload.id);
		if (!user) {
			return res.status(401).json({ message: "User not found" });
		}
		req.user = { id: user._id };
		next();
	} catch (err) {
		console.error("Auth error", err);
		res.status(401).json({ message: "Unauthorized" });
	}
}
