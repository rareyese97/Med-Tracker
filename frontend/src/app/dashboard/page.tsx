// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import MiniCalendar from "./components/MiniCalendar";
import MedList, { ApiMed } from "./components/MedList";
import AlertsList from "./components/AlertsList";
import AddMedModal from "./components/AddMedModal";
import EditMedModal from "./components/EditMedModal";
import DeleteAccountModal from "./components/DeleteAccountModal";
import TodayMedBarChart from "./components/TakenMedChart";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function Dashboard() {
	const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
	const MEDS = `${API_BASE}/api/meds`;

	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [userName, setUserName] = useState<string>("");
	const [scheduledMeds, setScheduledMeds] = useState<ApiMed[]>([]);
	const [allMeds, setAllMeds] = useState<ApiMed[]>([]);
	const [menuOpen, setMenuOpen] = useState(false);
	const [token, setToken] = useState<string>("");
	const router = useRouter();
	const menuRef = useRef<HTMLDivElement>(null);

	const signOut = useCallback(() => {
		if (typeof window !== "undefined") localStorage.removeItem("token");
		router.replace("/");
	}, [router]);

	const fetchMeds = useCallback(
		async (t: string) => {
			const dateParam = format(selectedDate, "yyyy-MM-dd");
			try {
				const [todayRes, allRes] = await Promise.all([
					fetch(`${MEDS}?date=${dateParam}`, {
						headers: { Authorization: `Bearer ${t}` },
					}),
					fetch(MEDS, {
						headers: { Authorization: `Bearer ${t}` },
					}),
				]);

				if (todayRes.status === 401 || allRes.status === 401) {
					return signOut();
				}

				if (todayRes.ok) setScheduledMeds(await todayRes.json());
				else console.error("Today's meds failed:", await todayRes.text());

				if (allRes.ok) setAllMeds(await allRes.json());
				else console.error("All meds failed:", await allRes.text());
			} catch (err) {
				console.error("fetchMeds error:", err);
			}
		},
		[selectedDate, MEDS, signOut]
	);

	// Get token & username from localStorage once
	useEffect(() => {
		const t = localStorage.getItem("token");
		if (!t) return signOut();
		setToken(t);
		const name = localStorage.getItem("firstName");
		if (name) setUserName(name);
	}, [signOut]);

	// Refetch meds whenever token or date changes
	useEffect(() => {
		if (token) fetchMeds(token);
	}, [token, fetchMeds]);

	// Create / Update / Delete handlers
	async function handleSaveMed(med: { name: string; dose: string; time: string; days: string[] }) {
		if (!token) return;
		try {
			const res = await fetch(MEDS, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: med.name,
					dosage: med.dose,
					schedule: { time: med.time, days: med.days },
				}),
			});
			if (res.status === 401) return signOut();
			if (res.ok) fetchMeds(token);
			else console.error("Save med failed:", await res.text());
		} catch (err) {
			console.error("Save med error:", err);
		}
	}

	async function handleUpdateMed(med: { id: string; name: string; dose: string; time: string; days: string[] }) {
		if (!token) return;
		try {
			const res = await fetch(`${MEDS}/${med.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: med.name,
					dosage: med.dose,
					schedule: { time: med.time, days: med.days },
				}),
			});
			if (res.status === 401) return signOut();
			if (res.ok) fetchMeds(token);
			else console.error("Update med failed:", await res.text());
		} catch (err) {
			console.error("Update med error:", err);
		}
	}

	async function handleDeleteMed(id: string) {
		if (!token) return;
		try {
			const res = await fetch(`${MEDS}/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.status === 401) return signOut();
			if (res.ok) {
				setScheduledMeds((m) => m.filter((x) => x._id !== id));
				setAllMeds((m) => m.filter((x) => x._id !== id));
			} else {
				console.error("Delete med failed:", await res.text());
			}
		} catch (err) {
			console.error("Delete med error:", err);
		}
	}

	// Close the menu if clicked outside
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<>
			<style jsx>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
			`}</style>
			<main className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-slate-800 dark:to-slate-700 relative">
				<div className="max-w-6xl mx-auto space-y-8">
					<div className="relative">
						<h1 className="text-3xl font-semibold">Hello, {userName || "there"}</h1>
						<p className="text-gray-600">{format(selectedDate, "MMMM do, yyyy")}</p>
						<div ref={menuRef} className="absolute top-0 right-0">
							<button
								onClick={() => setMenuOpen((o) => !o)}
								className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
							>
								<Bars3Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
							</button>
							{menuOpen && (
								<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20">
									<button
										onClick={() => setEditModalOpen(true)}
										className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
									>
										Manage Medications
									</button>
									<button
										onClick={signOut}
										className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
									>
										Sign Out
									</button>
									<button
										onClick={() => setDeleteModalOpen(true)}
										className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-700"
									>
										Delete Account
									</button>
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-6 max-h-[80vh] overflow-y-auto">
							<div
								className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-fadeIn"
								style={{ animationDelay: "0ms" }}
							>
								<MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
							</div>
							<div
								className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-fadeIn"
								style={{ animationDelay: "300ms" }}
							>
								<h2 className="text-xl font-medium mb-4">&apos;s Medications</h2>
								<MedList meds={scheduledMeds} date={selectedDate} />
							</div>
						</div>

						<div className="space-y-6 max-h-[80vh] overflow-y-auto">
							<div
								className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-fadeIn"
								style={{ animationDelay: "500ms" }}
							>
								<h2 className="text-xl font-medium mb-4">Reminders & Alerts</h2>
								<AlertsList date={selectedDate} meds={scheduledMeds} token={token} />
							</div>
							<div
								className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-fadeIn"
								style={{ animationDelay: "700ms" }}
							>
								<h2 className="text-xl font-medium mb-4">Total Taken Counts</h2>
								<TodayMedBarChart meds={scheduledMeds} />
							</div>
						</div>
					</div>
				</div>

				<button
					className="fixed bottom-6 right-6 bg-green-600 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-3xl hover:bg-green-700 transition"
					onClick={() => setAddModalOpen(true)}
					style={{ animation: "fadeIn 500ms ease forwards", animationDelay: "900ms" }}
				>
					+
				</button>

				<AddMedModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleSaveMed} />
				<EditMedModal
					open={editModalOpen}
					meds={allMeds}
					onClose={() => setEditModalOpen(false)}
					onSave={handleUpdateMed}
					onDelete={handleDeleteMed}
				/>
				<DeleteAccountModal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
			</main>
		</>
	);
}
