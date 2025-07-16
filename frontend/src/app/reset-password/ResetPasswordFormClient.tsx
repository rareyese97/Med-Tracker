"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as auth from "../services/auth";
import { LockClosedIcon, KeyIcon } from "@heroicons/react/24/solid";

export default function ResetPasswordFormClient() {
	const router = useRouter();
	const params = useSearchParams();
	const email = params.get("email") ?? "";
	const token = params.get("token") ?? "";

	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [status, setStatus] = useState<"" | "error" | "success">("");
	const [message, setMessage] = useState("");

	// If missing link params
	if (!email || !token) {
		return <p className="text-red-500">Invalid or expired reset link.</p>;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirm) {
			setStatus("error");
			setMessage("Passwords do not match.");
			return;
		}
		try {
			await auth.resetPassword(email, token, password);
			setStatus("success");
			setMessage("Password reset! Redirecting to login…");
			setTimeout(() => router.push("/"), 3000);
		} catch (err: unknown) {
			setStatus("error");
			const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
			setMessage(msg);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl space-y-6">
			<h2 className="text-2xl font-semibold text-center">Reset Password</h2>
			{message && <p className={`text-center ${status === "error" ? "text-red-500" : "text-green-500"}`}>{message}</p>}
			<div className="relative">
				<LockClosedIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
				<input
					type="password"
					placeholder="New password"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 focus:outline-none focus:ring focus:ring-green-300"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
			</div>
			<div className="relative">
				<KeyIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
				<input
					type="password"
					placeholder="Confirm new password"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 focus:outline-none focus:ring focus:ring-green-300"
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					required
				/>
			</div>
			<button
				type="submit"
				className="w-full text-white bg-green-600 rounded-full py-2 font-medium hover:bg-green-700 transition"
			>
				Reset Password
			</button>
		</form>
	);
}
