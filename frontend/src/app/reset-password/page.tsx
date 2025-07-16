import React, { Suspense } from "react";

// if you want to skip any static prerender, force dynamic rendering:
export const dynamic = "force-dynamic";

// only a shell here — the real form lives in a client component
import ResetPasswordFormClient from "./ResetPasswordFormClient";

export default function ResetPasswordPage() {
	return (
		<main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-slate-800 dark:to-slate-700">
			<Suspense fallback={<p className="text-center">Loading reset form…</p>}>
				<ResetPasswordFormClient />
			</Suspense>
		</main>
	);
}
