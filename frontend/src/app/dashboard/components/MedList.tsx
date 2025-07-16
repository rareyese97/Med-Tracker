// src/app/dashboard/components/MedList.tsx
"use client";

import { useState, useEffect } from "react";
import { format, parse } from "date-fns";

// Read your backend base URL (must start with NEXT_PUBLIC_)
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "") + "/api/meds";

export interface ApiMed {
	_id: string;
	name: string;
	dosage: string;
	schedule: {
		time: string;
		days?: string[];
	};
	takenDates?: string[];
}

type MedListProps = {
	meds: ApiMed[];
	date: Date;
};

export default function MedList({ meds, date }: MedListProps) {
	const [list, setList] = useState<ApiMed[]>([]);

	useEffect(() => {
		// Determine weekday abbreviation
		const dayAbbrev = format(date, "eee");
		// Filter meds that include this day in schedule.days
		const filtered = meds.filter((m) => m.schedule.days?.includes(dayAbbrev));

		// Helper to parse time strings
		const parseTime = (t: string) => {
			const str = t.trim();
			// detect AM/PM
			if (/\d{1,2}:\d{2}\s*(AM|PM)$/i.test(str)) {
				return parse(str, "hh:mm a", new Date());
			}
			return parse(str, "HH:mm", new Date());
		};

		// Sort by time ascending
		const sorted = filtered.slice().sort((a, b) => {
			const ta = parseTime(a.schedule.time);
			const tb = parseTime(b.schedule.time);
			return ta.getTime() - tb.getTime();
		});

		setList(sorted);
	}, [meds, date]);

	const toggleTaken = async (med: ApiMed) => {
		const token = localStorage.getItem("token");
		const dateKey = format(date, "yyyy-MM-dd");
		const isTaken = med.takenDates?.includes(dateKey) || false;

		try {
			const res = await fetch(`${API_BASE}/${med._id}/toggle`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ date: dateKey }),
			});
			if (!res.ok) {
				console.error("Toggle taken failed:", await res.text());
				return;
			}

			setList((prev) =>
				prev.map((m) =>
					m._id === med._id
						? {
								...m,
								takenDates: isTaken ? m.takenDates?.filter((d) => d !== dateKey) : [...(m.takenDates || []), dateKey],
						  }
						: m
				)
			);
		} catch (err) {
			console.error("Failed to toggle taken status", err);
		}
	};

	if (list.length === 0) {
		return <p className="text-gray-500">No medications scheduled for this day.</p>;
	}

	return (
		<div className="space-y-2 max-h-64 overflow-y-auto">
			{list.map((med) => {
				// Format display time to 12h AM/PM
				const dt = parse(
					med.schedule.time,
					/\d{1,2}:\d{2}\s*(AM|PM)$/i.test(med.schedule.time) ? "hh:mm a" : "HH:mm",
					new Date()
				);
				const timeFormatted = format(dt, "hh:mm a");

				const todayKey = format(date, "yyyy-MM-dd");
				const taken = med.takenDates?.includes(todayKey) || false;

				return (
					<div
						key={med._id}
						className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3 shadow-sm"
					>
						<div>
							<p className="font-medium">{med.name}</p>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{med.dosage} • {timeFormatted}
							</p>
						</div>
						<button
							onClick={() => toggleTaken(med)}
							className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors duration-150 cursor-pointer ${
								taken
									? "bg-green-500 border-green-500 text-white hover:bg-green-300"
									: "border-gray-300 text-transparent hover:bg-gray-200"
							}`}
						>
							✓
						</button>
					</div>
				);
			})}
		</div>
	);
}
