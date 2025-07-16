// src/app/components/ForgotPasswordForm.tsx
"use client";

import { useState } from "react";
import { AtSymbolIcon } from "@heroicons/react/24/solid";

type ForgotPasswordFormProps = {
	/** Called to send the reset link */
	onSubmit: (email: string) => void;
	/** Called to switch back to login */
	onBackToLogin: () => void;
};

export default function ForgotPasswordForm({ onSubmit, onBackToLogin }: ForgotPasswordFormProps) {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(email);
		setSubmitted(true);
		setStatusMessage(`A reset link has been sent to ${email}`);
	};

	const handleResend = () => {
		onSubmit(email);
		setStatusMessage(`Reset link resent to ${email}`);
	};

	if (submitted) {
		return (
			<div className="fade-in w-full text-center space-y-4">
				<h2 className="text-2xl font-sans font-semibold">Check your email</h2>
				<p className="">
					If an account exists for <strong>{email}</strong>, you’ll receive a link to reset your password.
				</p>
				{statusMessage && <p className="text-sm ">{statusMessage}</p>}
				<div className="flex flex-col items-center space-y-2 text-sm">
					<button type="button" onClick={handleResend} className="font-medium text-blue-600 hover:underline cursor-pointer">
						Resend link
					</button>
					<button type="button" onClick={onBackToLogin} className="font-medium text-gray-400 hover:underline cursor-pointer">
						Back to Login
					</button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="fade-in w-full space-y-4 text-center">
			<h2 className="text-2xl font-sans font-semibold">Forgot Password?</h2>
			<p className="text-gray-400">Enter your email and we’ll send you a reset link.</p>

			<div className="relative mx-auto max-w-sm">
				<AtSymbolIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="email"
					placeholder="Email address"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring focus:ring-blue-300"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
			</div>

			<button
				type="submit"
				className="w-full max-w-sm mx-auto text-white bg-blue-600 rounded-full py-2 font-medium hover:bg-blue-700 transition cursor-pointer"
			>
				Send Reset Link
			</button>

			<button type="button" onClick={onBackToLogin} className="text-sm mt-2 font-medium text-gray-400 hover:underline cursor-pointer">
				Back to Login
			</button>
		</form>
	);
}
