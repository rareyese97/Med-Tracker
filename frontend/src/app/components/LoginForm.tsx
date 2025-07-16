// src/app/components/LoginForm.tsx
"use client";

import { useState } from "react";
import { AtSymbolIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import * as auth from "../services/auth";

export type LoginFormProps = {
	onSwitch: () => void;
	onForgot: () => void;
	onRequireVerification: (email: string) => void;
};

export default function LoginForm({ onSwitch, onForgot, onRequireVerification }: LoginFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");
		setLoading(true);
		try {
			const data = await auth.login(email, password);
			// Store token and first name for greeting
			localStorage.setItem("token", data.token);
			localStorage.setItem("firstName", data.firstName);
			// Navigate to dashboard
			router.push("/dashboard");
		} catch (err: unknown) {
			if (err instanceof Error) {
				// If email not verified, trigger verification flow
				if (err.message === "Email not verified") {
					await auth.sendCode(email);
					onRequireVerification(email);
				} else {
					setErrorMessage(err.message);
				}
			} else {
				setErrorMessage("Login failed");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="fade-in w-full space-y-6">
			<h2 className="text-center text-2xl font-sans font-semibold">Sign into Your Account</h2>

			<div className="relative">
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

			<div className="relative">
				<LockClosedIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="password"
					placeholder="Password"
					className="pl-10 w-full border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring focus:ring-blue-300"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				className={`w-full text-white bg-blue-600 rounded-full py-2 font-medium hover:bg-blue-700 transition cursor-pointer ${
					loading ? "opacity-50 cursor-not-allowed" : ""
				}`}
			>
				{loading ? "Loading..." : "Login"}
			</button>

			{errorMessage && <p className="text-red-500 fade-in mt-2 text-sm text-center">{errorMessage}</p>}

			<div className="flex flex-col items-center text-sm text-gray-400 space-y-2">
				<button type="button" onClick={onForgot} className="hover:underline cursor-pointer">
					Forgot your password? Click here
				</button>
				<button type="button" onClick={onSwitch} className="font-medium hover:underline cursor-pointer">
					Don&apos;t have an account? Sign up here
				</button>
			</div>
		</form>
	);
}
