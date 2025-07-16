// models/User.ts
import mongoose from "mongoose";

const ScheduleSchema = new mongoose.Schema({
	time: { type: String, required: true },
	days: [{ type: String, enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], required: true }],
});

const MedicationSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		dosage: { type: String, required: true },
		schedule: { type: ScheduleSchema, required: true },
		takenCount: { type: Number, default: 0 },
	},
	{ _id: false }
);

const UserSchema = new mongoose.Schema(
	{
		firstName: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		isVerified: { type: Boolean, default: false },
		medications: [MedicationSchema],
	},
	{ timestamps: true }
);

export default mongoose.model("User", UserSchema);
