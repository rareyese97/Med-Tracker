"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Med = {
	name: string;
	dose: string;
	time: string;
	days: string[];
};

type AddMedModalProps = {
	open: boolean;
	onClose: () => void;
	onSave?: (med: Med) => void;
};

// Helper hook to detect clicks outside the modal container
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
	useEffect(() => {
		const listener = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				handler();
			}
		};
		document.addEventListener("mousedown", listener);
		return () => document.removeEventListener("mousedown", listener);
	}, [ref, handler]);
}

// --- API response types for strong typing ---
// Candidate from approximateTerm lookup
type Candidate = {
	rxcui: string;
};
// Response shape for approximateTerm.json
interface ApproximateTermResponse {
	approximateGroup?: {
		candidate?: Candidate[];
	};
}
// Individual drug info entry from rxclass
type RxClassDrugInfo = {
	minConcept: { tty: string };
	rxclassMinConceptItem: { className: string };
};
// Response shape for rxclass/byRxcui.json
interface RxClassResponse {
	rxclassDrugInfoList?: {
		rxclassDrugInfo?: RxClassDrugInfo[];
	};
}
//-------------------------------------------

export default function AddMedModal({ open, onClose, onSave }: AddMedModalProps) {
	const [query, setQuery] = useState("");
	const [options, setOptions] = useState<string[]>([]);
	const [highlighted, setHighlighted] = useState<number>(-1);
	const [selected, setSelected] = useState("");
	const [dose, setDose] = useState("");
	const [time, setTime] = useState("");
	const [selectedDays, setSelectedDays] = useState<string[]>([]);
	const [indications, setIndications] = useState<string[]>([]);

	const skipFetchRef = useRef(false);
	const timeoutRef = useRef<number | undefined>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useClickOutside(containerRef, () => setOptions([]));

	// Autocomplete fetch effect
	useEffect(() => {
		if (skipFetchRef.current) {
			skipFetchRef.current = false;
			return;
		}
		const term = query.trim();
		if (!term) {
			setOptions([]);
			return;
		}
		clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(async () => {
			try {
				const url = new URL("https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search");
				url.searchParams.set("terms", term);
				url.searchParams.set("df", "DISPLAY_NAME");
				const res = await fetch(url.toString());
				const data = await res.json();
				setOptions(Array.isArray(data[3]) ? data[3] : []);
				setHighlighted(-1);
			} catch {
				setOptions([]);
			}
		}, 300);
	}, [query]);

	// Keyboard navigation for autocomplete
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!options.length) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlighted((i) => Math.min(i + 1, options.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlighted((i) => Math.max(i - 1, 0));
			} else if ((e.key === "Enter" || e.key === "Tab") && highlighted >= 0) {
				e.preventDefault();
				selectOption(options[highlighted]);
			} else if (e.key === "Escape") {
				setOptions([]);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [options, highlighted]);

	function selectOption(name: string) {
		skipFetchRef.current = true;
		setSelected(name);
		setQuery(name);
		setOptions([]);
		setHighlighted(-1);
		inputRef.current?.focus();
		setIndications([]);
	}

	// Fetch "may treat" indications when selection changes
	useEffect(() => {
		if (!selected) return;
		(async () => {
			try {
				// 1) approximateTerm lookup for RxCUI
				const approxRes = await fetch(
					`https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(selected)}&maxEntries=1`
				);
				const approxData = (await approxRes.json()) as ApproximateTermResponse;
				const candidate = approxData.approximateGroup?.candidate?.[0];
				const rxcui = candidate?.rxcui;
				if (!rxcui) {
					setIndications([]);
					return;
				}

				// 2) fetch may_treat classes
				const url = new URL("https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json");
				url.searchParams.set("rxcui", rxcui);
				url.searchParams.set("relaSource", "MEDRT");
				url.searchParams.set("relas", "may_treat");

				const treatRes = await fetch(url.toString(), {
					headers: { Accept: "application/json" },
				});
				const treatData = (await treatRes.json()) as RxClassResponse;
				const infos: RxClassDrugInfo[] = treatData.rxclassDrugInfoList?.rxclassDrugInfo ?? [];

				const names = infos
					.filter((info) => info.minConcept.tty === "IN")
					.map((info) => info.rxclassMinConceptItem.className);

				setIndications(Array.from(new Set(names)));
			} catch {
				setIndications([]);
			}
		})();
	}, [selected]);

	function toggleDay(day: string) {
		setSelectedDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!selected || selectedDays.length === 0) return;
		onSave?.({ name: selected, dose, time, days: selectedDays });
		// reset form
		setQuery("");
		setSelected("");
		setDose("");
		setTime("");
		setSelectedDays([]);
		setIndications([]);
		onClose();
	}

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
			<div
				ref={containerRef}
				className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4"
			>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Add Medication</h2>
					<button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md">
						<XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Name input & suggestions */}
					<div className="relative">
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
						<input
							ref={inputRef}
							type="text"
							className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-300"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setSelected("");
							}}
							onBlur={() => setTimeout(() => setOptions([]), 100)}
							required
						/>
						{selected && <CheckCircleIcon className="absolute top-10 right-3 w-5 h-5 text-green-500" />}
						{options.length > 0 && (
							<ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
								{options.map((opt, idx) => (
									<li
										key={opt}
										className={`px-3 py-2 cursor-pointer ${
											idx === highlighted ? "bg-gray-100 dark:bg-gray-700" : ""
										} text-gray-900 dark:text-gray-200`}
										onMouseEnter={() => setHighlighted(idx)}
										onMouseDown={() => selectOption(opt)}
									>
										{opt}
									</li>
								))}
							</ul>
						)}
					</div>

					{/* Dose & Time */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Dose</label>
							<input
								type="text"
								className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-300"
								value={dose}
								onChange={(e) => setDose(e.target.value)}
								required
							/>
						</div>
						<div className="relative">
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Time</label>
							<input
								type="time"
								className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-green-300"
								value={time}
								onChange={(e) => setTime(e.target.value)}
								required
							/>
							<style jsx>{`
								input[type="time"]::-webkit-calendar-picker-indicator {
									position: absolute;
									right: 0.75rem;
									filter: invert(1) brightness(200%);
									pointer-events: all;
									cursor: pointer;
								}
							`}</style>
						</div>
					</div>

					{/* Days */}
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Days</label>
						<div className="flex flex-wrap gap-2">
							{daysOfWeek.map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => toggleDay(d)}
									className={`px-3 py-1 rounded-full border cursor-pointer ${
										selectedDays.includes(d)
											? "bg-green-600 text-white border-green-600 hover:bg-green-700"
											: "bg-transparent text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-600"
									}`}
								>
									{d}
								</button>
							))}
						</div>
					</div>

					{/* May Treat */}
					{indications.length > 0 && (
						<div>
							<label className="block text-sm font-medium mt-4">May Treat</label>
							<ul className="list-disc list-inside mt-1 text-sm text-gray-200">
								{indications.map((cond) => (
									<li key={cond}>{cond}</li>
								))}
							</ul>
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							Cancel
						</button>
						<button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
							Save
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
