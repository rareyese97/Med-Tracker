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

function getDateInTimezone(timezone: string): Date {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const year = Number(parts.find((part) => part.type === "year")?.value);
	const month = Number(parts.find((part) => part.type === "month")?.value);
	const day = Number(parts.find((part) => part.type === "day")?.value);
	return new Date(year, month - 1, day, 12);
}


export default function Dashboard() {
	const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
	const MEDS = `${API_BASE}/api/meds`;
	const AUTH = `${API_BASE}/api/auth`;

	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [userName, setUserName] = useState<string>("");
	const [scheduledMeds, setScheduledMeds] = useState<ApiMed[]>([]);
	const [allMeds, setAllMeds] = useState<ApiMed[]>([]);
	const [menuOpen, setMenuOpen] = useState(false);
	const [token, setToken] = useState<string>("");
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [timezone, setTimezone] = useState("America/New_York");
	const [timezoneMode, setTimezoneMode] = useState<"auto" | "fixed">("auto");
	const [timezoneDraft, setTimezoneDraft] = useState("America/New_York");
	const [timezoneMessage, setTimezoneMessage] = useState("");
	const [timezoneSaving, setTimezoneSaving] = useState(false);
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


	// Keep automatic timezone preferences in sync with the device when the app
	// opens or returns to the foreground. Fixed preferences are never overwritten.
	useEffect(() => {
		if (!token) return;

		const syncTimezone = async () => {
			const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
			try {
				const profileRes = await fetch(`${AUTH}/me`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!profileRes.ok) return;
				const profile = await profileRes.json();
				const mode = profile.timezoneMode === "fixed" ? "fixed" : "auto";
				const savedTimezone = profile.timezone || "America/New_York";
				setTimezoneMode(mode);
				setTimezoneDraft(savedTimezone);

				if (mode === "auto") {
					setTimezone(detectedTimezone);
					setTimezoneDraft(detectedTimezone);
					setSelectedDate(getDateInTimezone(detectedTimezone));
					if (detectedTimezone !== savedTimezone) {
						const timezoneRes = await fetch(`${AUTH}/timezone`, {
							method: "PUT",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${token}`,
							},
							body: JSON.stringify({ timezone: detectedTimezone, mode: "auto" }),
						});
						if (!timezoneRes.ok) {
							console.error("Unable to sync detected timezone:", await timezoneRes.text());
						}
					}
				} else {
					setTimezone(savedTimezone);
					setSelectedDate(getDateInTimezone(savedTimezone));
				}
			} catch (err) {
				console.error("Timezone sync failed:", err);
			}
		};

		const handleVisibility = () => {
			if (document.visibilityState === "visible") syncTimezone();
		};
		syncTimezone();
		window.addEventListener("focus", syncTimezone);
		document.addEventListener("visibilitychange", handleVisibility);
		return () => {
			window.removeEventListener("focus", syncTimezone);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [token, AUTH]);

	async function saveTimezoneSettings() {
		if (!token) return;
		const nextTimezone =
			timezoneMode === "auto"
				? Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
				: timezoneDraft.trim();
		setTimezoneSaving(true);
		setTimezoneMessage("");
		try {
			const res = await fetch(`${AUTH}/timezone`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ timezone: nextTimezone, mode: timezoneMode }),
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.message || "Unable to save timezone");
			setTimezone(payload.timezone);
			setTimezoneMode(payload.timezoneMode);
			setSelectedDate(getDateInTimezone(payload.timezone));
			setTimezoneDraft(payload.timezone);
			setTimezoneMessage("Timezone settings saved.");
		} catch (err) {
			setTimezoneMessage(err instanceof Error ? err.message : "Unable to save timezone");
		} finally {
			setTimezoneSaving(false);
		}
	}

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
										onClick={() => {
											setSettingsOpen(true);
											setMenuOpen(false);
											setTimezoneMessage("");
										}}
										className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
									>
										Time Zone Settings
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
								<MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} timezone={timezone} />
							</div>
							<div
								className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-fadeIn"
								style={{ animationDelay: "300ms" }}
							>
								<h2 className="text-xl font-medium mb-4">Today&apos;s Medications</h2>
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
				{settingsOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSettingsOpen(false)}>
						<div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold">Time Zone Settings</h2>
								<button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white" aria-label="Close settings">✕</button>
							</div>
							<p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
								Medication reminders use this timezone to determine the scheduled day and time.
							</p>
							<label className="block text-sm font-medium mb-2" htmlFor="timezone-mode">Timezone behavior</label>
							<select
								id="timezone-mode"
								value={timezoneMode}
								onChange={(e) => setTimezoneMode(e.target.value as "auto" | "fixed")}
								className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 p-2.5 mb-4"
							>
								<option value="auto">Automatic — follow my current location's timezone</option>
								<option value="fixed">Fixed — always use a selected timezone</option>
							</select>
							{timezoneMode === "fixed" ? (
								<>
									<label className="block text-sm font-medium mb-2" htmlFor="fixed-timezone">IANA timezone</label>
									<input
										id="fixed-timezone"
										value={timezoneDraft}
										onChange={(e) => setTimezoneDraft(e.target.value)}
										placeholder="America/New_York"
										className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 p-2.5"
									/>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Examples: America/New_York, Europe/London, Asia/Tokyo.</p>
								</>
							) : (
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Detected timezone: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong></p>
							)}
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Active reminder timezone: <strong>{timezone}</strong></p>
							{timezoneMessage && <p className="text-sm mt-3 text-gray-700 dark:text-gray-200">{timezoneMessage}</p>}
							<div className="flex justify-end gap-3 mt-6">
								<button onClick={() => setSettingsOpen(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
								<button onClick={saveTimezoneSettings} disabled={timezoneSaving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
									{timezoneSaving ? "Saving..." : "Save settings"}
								</button>
							</div>
						</div>
					</div>
				)}
				<DeleteAccountModal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
			</main>
		</>
	);
}
