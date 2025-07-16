// middleware/verifyToken.js
import jwt from "jsonwebtoken";
export default function (req, res, next) {
	const token = req.headers["authorization"]?.split(" ")[1];
	if (!token) return res.status(401).json({ message: "Access denied" });
	try {
		req.user = jwt.verify(token, process.env.JWT_SECRET);
		next();
	} catch {
		res.status(403).json({ message: "Invalid or expired token" });
	}
}
