// src/app/dashboard/components/AlertsList.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ApiMed } from "./MedList";

export interface Alert {
	id: string;
	message: string;
	severity: "low" | "medium" | "high";
	drugsInvolved?: string[];
	recommendation?: string;
	link?: string;
}

interface AlertsListProps {
	date: Date;
	meds: ApiMed[];
	token: string;
}

export default function AlertsList({ date, meds, token }: AlertsListProps) {
	const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
	const INTERACTIONS = `${API_BASE}/api/interactions`;

	const [alerts, setAlerts] = useState<Alert[]>([]);
	const [interactionAlerts, setInteractionAlerts] = useState<Alert[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [now, setNow] = useState(new Date());

	// 1) Tick the clock every minute so missed-dose alerts update in real time
	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(timer);
	}, []);

	// 2) Fetch interaction alerts from the API when the date or token changes
	useEffect(() => {
		if (!token) return;
		const fetchInteractions = async () => {
			setLoading(true);
			setError(null);
			try {
				const dateKey = format(date, "yyyy-MM-dd");
				const res = await fetch(`${INTERACTIONS}?date=${dateKey}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const data: Alert[] = await res.json();
					setInteractionAlerts(data);
				} else {
					const message = `Error ${res.status}: ${res.statusText}`;
					console.error("Fetch interactions failed:", message);
					setError(message);
					setInteractionAlerts([]);
				}
			} catch (err: unknown) {
				console.error(err);
				setError(err instanceof Error ? err.message : "Failed to load interactions");
			} finally {
				setLoading(false);
			}
		};
		fetchInteractions();
	}, [date, token, INTERACTIONS]);

	// 3) Combine interaction alerts + missed-dose alerts
	useEffect(() => {
		const missed: Alert[] = (meds || []).reduce<Alert[]>((acc, m) => {
			const [hour, minute] = m.schedule.time.split(":").map(Number);
			const doseTime = new Date(date);
			doseTime.setHours(hour, minute, 0, 0);
			const takenKey = format(date, "yyyy-MM-dd");
			const taken = m.takenDates?.includes(takenKey) ?? false;

			if (doseTime < now && !taken) {
				acc.push({
					id: `missed-${m._id}`,
					message: `Missed dose: ${m.name} scheduled at ${format(doseTime, "hh:mm a")}`,
					severity: "medium",
					drugsInvolved: [m.name],
					recommendation: "Please take this medication as soon as possible.",
				});
			}
			return acc;
		}, []);

		setAlerts([...interactionAlerts, ...missed]);
	}, [meds, date, now, interactionAlerts]);

	if (loading) {
		return <p className="text-gray-500">Checking for interactions and reminders...</p>;
	}
	if (error) {
		return <p className="text-red-500">Error: {error}</p>;
	}
	if (!alerts.length) {
		return <p className="text-gray-500">All caught up—no alerts or missed doses.</p>;
	}

	const severityStyles = {
		low: {
			bg: "bg-green-100",
			border: "border-green-400",
			text: "text-green-800",
			icon: <CheckCircleIcon className="w-6 h-6 text-green-600" />,
		},
		medium: {
			bg: "bg-yellow-200",
			border: "border-yellow-400",
			text: "text-yellow-900",
			icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-900" />,
		},
		high: {
			bg: "bg-red-100",
			border: "border-red-400",
			text: "text-red-800",
			icon: <XCircleIcon className="w-6 h-6 text-red-600" />,
		},
	};

	return (
		<div className="space-y-4">
			{alerts.map((a) => (
				<div
					key={a.id}
					className={`flex flex-col gap-2 p-4 rounded-lg border-l-4 ${severityStyles[a.severity].bg} ${
						severityStyles[a.severity].border
					}`}
				>
					<div className="flex items-center gap-3">
						{severityStyles[a.severity].icon}
						<p className={`font-medium ${severityStyles[a.severity].text}`}>{a.message}</p>
					</div>
					{a.drugsInvolved && (
						<p className="text-sm text-black">
							<span className="font-semibold">Drugs:</span> {a.drugsInvolved.join(", ")}
						</p>
					)}
					{a.recommendation && <p className="text-sm italic text-black">{a.recommendation}</p>}
					{a.link && (
						<a
							href={a.link}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-blue-600 hover:underline"
						>
							Learn more
						</a>
					)}
				</div>
			))}
		</div>
	);
}
