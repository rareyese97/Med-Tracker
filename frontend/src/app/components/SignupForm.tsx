// src/app/components/SignupForm.tsx
"use client";

import { useState } from "react";
import { UserIcon, AtSymbolIcon, LockClosedIcon, KeyIcon } from "@heroicons/react/24/solid";
import * as auth from "../services/auth";

type SignupFormProps = {
	onSwitch: () => void;
	onSubmit: (firstName: string, email: string, password: string) => Promise<void>;
};

export default function SignupForm({ onSwitch, onSubmit }: SignupFormProps) {
	const [firstName, setFirstName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [statusMessage, setStatusMessage] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");
		setStatusMessage("");

		if (password !== confirm) {
			setErrorMessage("Passwords do not match");
			return;
		}

		setLoading(true);
		try {
			await onSubmit(firstName, email, password);
			await auth.sendCode(email);
			setStatusMessage(`Verification code sent to ${email}`);
		} catch (err: unknown) {
			if (err instanceof Error) {
				setErrorMessage(err.message);
			} else {
				setErrorMessage("Signup failed");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="fade-in w-full space-y-6">
			<h2 className="text-center text-2xl font-sans font-semibold">Create an Account</h2>

			<div className="relative">
				<UserIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="text"
					placeholder="First Name"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring focus:ring-green-300"
					value={firstName}
					onChange={(e) => setFirstName(e.target.value)}
					required
				/>
			</div>

			<div className="relative">
				<AtSymbolIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="email"
					placeholder="Email address"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring focus:ring-green-300"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
			</div>

			<div className="relative">
				<LockClosedIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="password"
					placeholder="Password"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring focus:ring-green-300"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
			</div>

			<div className="relative">
				<KeyIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="password"
					placeholder="Confirm password"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring focus:ring-green-300"
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					required
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				className={`w-full text-white bg-green-600 rounded-full py-2 font-medium hover:bg-green-700 transition cursor-pointer${
					loading ? "opacity-50 cursor-not-allowed" : ""
				}`}
			>
				{loading ? "Signing up..." : "Sign Up"}
			</button>

			{errorMessage && <p className="text-red-500 fade-in mt-2 text-center text-sm">{errorMessage}</p>}
			{!errorMessage && statusMessage && <p className="text-white fade-in mt-2 text-center text-sm">{statusMessage}</p>}

			<div className="flex flex-col items-center text-sm text-gray-400 space-y-2">
				<button type="button" onClick={onSwitch} className="font-medium hover:underline cursor-pointer">
					Already have an account? Log in here
				</button>
			</div>
		</form>
	);
}
