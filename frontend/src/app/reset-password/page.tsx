// src/app/reset-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as auth from "../services/auth";
import { LockClosedIcon, KeyIcon } from "@heroicons/react/24/solid";

export default function ResetPasswordPage() {
	const router = useRouter();
	const params = useSearchParams();
	const email = params.get("email") ?? "";
	const token = params.get("token") ?? "";

	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [status, setStatus] = useState<"" | "error" | "success">("");
	const [message, setMessage] = useState("");

	// Handle form submission
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
		} catch (error: unknown) {
			setStatus("error");
			// narrow down to Error to safely read .message
			const msg = error instanceof Error ? error.message : "An unexpected error occurred.";
			setMessage(msg);
		}
	};

	// If link is missing params
	if (!email || !token) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<p className="text-red-500">Invalid or expired reset link.</p>
			</div>
		);
	}

	return (
		<main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-slate-800 dark:to-slate-700">
			<form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl space-y-6">
				<h2 className="text-2xl font-semibold text-center">Reset Password</h2>

				{message && (
					<p className={`text-center ${status === "error" ? "text-red-500" : "text-green-500"}`}>{message}</p>
				)}

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
					className="w-full text-white bg-green-600 rounded-full py-2 font-medium hover:bg-green-700 transition cursor-pointer"
				>
					Reset Password
				</button>
			</form>
		</main>
	);
}
