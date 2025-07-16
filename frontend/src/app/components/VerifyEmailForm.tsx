// src/app/components/VerifyEmailForm.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import * as auth from "../services/auth";

type VerifyEmailFormProps = {
	email: string;
	onBackToLogin: () => void;
};

export default function VerifyEmailForm({ email, onBackToLogin }: VerifyEmailFormProps) {
	const [code, setCode] = useState<string[]>(Array(6).fill(""));
	const [statusMessage, setStatusMessage] = useState<string>("");
	const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("");
	const inputsRef = useRef<HTMLInputElement[]>([]);

	useEffect(() => {
		inputsRef.current[0]?.focus();
	}, []);

	const handleChange = (e: ChangeEvent<HTMLInputElement>, idx: number) => {
		const val = e.target.value.replace(/[^0-9]/g, "").slice(-1);
		const updated = [...code];
		updated[idx] = val;
		setCode(updated);
		if (val && idx < 5) {
			inputsRef.current[idx + 1]?.focus();
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
		if (e.key === "Backspace") {
			e.preventDefault();
			const updated = [...code];
			if (updated[idx]) {
				updated[idx] = "";
				setCode(updated);
			} else if (idx > 0) {
				updated[idx - 1] = "";
				setCode(updated);
				inputsRef.current[idx - 1]?.focus();
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const joined = code.join("");
		setStatusMessage("");
		if (joined.length !== 6) {
			setStatusMessage("Please enter the 6-digit code.");
			setStatusType("error");
			return;
		}
		try {
			await auth.verifyCode(email, joined);
			setStatusMessage("Email verified! You can now sign in.");
			setStatusType("success");
			setCode(Array(6).fill(""));
			// after 3 seconds, go back to login
			setTimeout(() => {
				onBackToLogin();
			}, 3000);
		} catch (err: unknown) {
			if (err instanceof Error) {
				setStatusMessage(err.message);
			} else {
				setStatusMessage("Verification failed.");
			}
			setStatusType("error");
		}
	};

	const handleResend = async () => {
		try {
			await auth.sendCode(email);
			setStatusMessage(`Verification code resent to ${email}`);
			setStatusType("info");
			setCode(Array(6).fill(""));
		} catch (err: unknown) {
			if (err instanceof Error) {
				setStatusMessage(err.message);
			} else {
				setStatusMessage("Failed to resend code.");
			}
			setStatusType("error");
		}
	};

	const messageColorClass =
		statusType === "success"
			? "text-green-500"
			: statusType === "error"
			? "text-red-500"
			: statusType === "info"
			? "text-white"
			: "";

	return (
		<form onSubmit={handleSubmit} className="fade-in w-full space-y-6 text-center">
			<h2 className="text-2xl font-sans font-semibold">Verify Your Email</h2>
			<p className="text-gray-600">Enter the 6-digit code sent to your email.</p>

			<div className="flex justify-center gap-2">
				{code.map((digit, idx) => (
					<input
						key={idx}
						type="text"
						inputMode="numeric"
						maxLength={1}
						value={digit}
						onChange={(e) => handleChange(e, idx)}
						onKeyDown={(e) => handleKeyDown(e, idx)}
						ref={(el) => {
							if (el) inputsRef.current[idx] = el;
						}}
						className="w-12 h-12 text-center border border-gray-300 rounded-full text-lg focus:outline-none focus:ring focus:ring-blue-300"
					/>
				))}
			</div>

			<button
				type="submit"
				className="mt-4 w-full max-w-xs mx-auto bg-blue-600 text-white rounded-full py-2 font-medium hover:bg-blue-700 transition"
			>
				Verify
			</button>

			{statusMessage && <p className={`${messageColorClass} fade-in mt-2 text-sm`}>{statusMessage}</p>}

			<div className="flex flex-col items-center text-sm text-gray-400 space-y-2">
				<button
					type="button"
					onClick={() => {
						onBackToLogin();
						setCode(Array(6).fill(""));
					}}
					className="font-medium hover:underline"
				>
					Already verified? Back to login
				</button>
				<button type="button" onClick={handleResend} className="font-medium hover:underline">
					Resend code
				</button>
			</div>
		</form>
	);
}
