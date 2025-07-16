import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
	email: { type: String, required: true, lowercase: true },
	code: { type: String, required: true },
	expiresAt: { type: Date, required: true },
	type: {
		type: String,
		required: true,
		enum: ["verify", "reset"],
		default: "verify",
	},
});

// auto–remove expired docs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", OtpSchema);
