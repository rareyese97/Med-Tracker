// src/app/dashboard/components/DeleteAccountModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface DeleteAccountModalProps {
	open: boolean;
	onClose: () => void;
}

export default function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const router = useRouter();

	if (!open) return null;

	const handleDelete = async () => {
		setError(null);
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch("http://localhost:5001/api/auth/delete-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ password }),
			});
			if (res.ok) {
				// Clear client-side session
				localStorage.removeItem("token");
				localStorage.removeItem("firstName");
				setSuccess(true);
				// show success for 3s then redirect
				setTimeout(() => router.replace("/"), 3000);
			} else {
				const payload = await res.json();
				setError(payload.message || "Incorrect password");
				setLoading(false);
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Deletion failed");
			}
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
			<div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold text-red-600">Delete Account</h2>
					<button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md cursor-pointer">
						<XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
					</button>
				</div>
				<p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Enter your password to confirm:</p>
				<input
					type="password"
					className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 mb-2 focus:ring-2 focus:ring-red-300"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				{error && <p className="text-sm text-red-600 mb-2">{error}</p>}
				{success && <p className="text-sm text-green-600 mb-2">Deleting account...</p>}
				<div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
					<button
						onClick={onClose}
						disabled={loading || success}
						className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Cancel
					</button>
					<button
						onClick={handleDelete}
						disabled={loading || success}
						className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center"
					>
						{loading && <span className="animate-spin h-4 w-4 border-2 border-white rounded-full mr-2" />}Delete
					</button>
				</div>
			</div>
		</div>
	);
}
