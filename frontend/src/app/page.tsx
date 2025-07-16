// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as auth from "./services/auth";
import Blurb from "./components/Blurb";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import VerifyEmailForm from "./components/VerifyEmailForm";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import "./globals.css";

type Step = "login" | "signup" | "verify" | "forgot";

export default function Home() {
	const [step, setStep] = useState<Step>("login");
	const [emailForVerification, setEmailForVerification] = useState<string>("");
	const router = useRouter();

	// Redirect to dashboard if already authenticated
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (token) {
			router.replace("/dashboard");
		}
	}, [router]);

	const handleSwitchToSignup = () => setStep("signup");
	const handleSwitchToLogin = () => setStep("login");
	const handleSwitchToForgot = () => setStep("forgot");

	const handleRequireVerification = (email: string) => {
		setEmailForVerification(email);
		setStep("verify");
	};

	const handleSignup = async (firstName: string, email: string, password: string) => {
		await auth.register(firstName, email, password);
		handleRequireVerification(email);
	};

	const handleForgotSubmit = async (email: string) => {
		await auth.requestPasswordReset(email);
	};

	return (
		<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 dark:from-slate-800 dark:to-slate-700">
			<div className="w-full max-w-md space-y-8 px-4 sm:px-0">
				<Blurb />
				<hr />

				{step === "login" && (
					<LoginForm
						onSwitch={handleSwitchToSignup}
						onForgot={handleSwitchToForgot}
						onRequireVerification={handleRequireVerification}
					/>
				)}

				{step === "signup" && <SignupForm onSwitch={handleSwitchToLogin} onSubmit={handleSignup} />}

				{step === "verify" && <VerifyEmailForm email={emailForVerification} onBackToLogin={handleSwitchToLogin} />}

				{step === "forgot" && <ForgotPasswordForm onBackToLogin={handleSwitchToLogin} onSubmit={handleForgotSubmit} />}
			</div>
		</main>
	);
}
