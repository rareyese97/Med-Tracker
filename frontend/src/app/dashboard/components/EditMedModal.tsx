"use client";

import { useState, useRef, useEffect } from "react";
import { XMarkIcon, PencilIcon, TrashIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { ApiMed } from "./MedList";
import { parse, format as fmt } from "date-fns";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Med = {
	id: string;
	name: string;
	dose: string;
	time: string;
	days: string[];
};

type EditMedModalProps = {
	open: boolean;
	meds: ApiMed[];
	onClose: () => void;
	onSave: (med: Med) => void;
	onDelete: (id: string) => void;
};

function useClickOutside<T extends HTMLElement, U extends HTMLElement>(
	ref: React.RefObject<T | null>,
	suggestionsRef: React.RefObject<U | null>,
	handler: () => void,
	skipRef: React.RefObject<boolean>
) {
	useEffect(() => {
		function listener(e: MouseEvent) {
			if (e.button !== 0) return;
			if (skipRef.current) {
				skipRef.current = false;
				return;
			}
			const tgt = e.target as Node;
			// now works for any T or U
			if (ref.current?.contains(tgt) || suggestionsRef.current?.contains(tgt)) {
				return;
			}
			handler();
		}
		document.addEventListener("click", listener);
		return () => document.removeEventListener("click", listener);
	}, [ref, suggestionsRef, handler, skipRef]);
}

// --- API response types for strong typing ---
type Candidate = { rxcui: string };
interface ApproximateTermResponse {
	approximateGroup?: {
		candidate?: Candidate[];
	};
}

type RxClassDrugInfo = {
	minConcept: { tty: string };
	rxclassMinConceptItem: { className: string };
};
interface RxClassResponse {
	rxclassDrugInfoList?: {
		rxclassDrugInfo?: RxClassDrugInfo[];
	};
}
//--------------------------------------------

export default function EditMedModal({ open, meds, onClose, onSave, onDelete }: EditMedModalProps) {
	const [editing, setEditing] = useState<Med | null>(null);
	const [form, setForm] = useState<Med>({ id: "", name: "", dose: "", time: "", days: [] });
	const [query, setQuery] = useState("");
	const [options, setOptions] = useState<string[]>([]);
	const [highlighted, setHighlighted] = useState<number>(-1);
	const [selectedName, setSelectedName] = useState<string>("");
	const [indications, setIndications] = useState<string[]>([]);
	const [inputFocused, setInputFocused] = useState(false);

	const skipFetchRef = useRef(false);
	const timeoutRef = useRef<number | undefined>(undefined);
	const skipOutsideClickRef = useRef(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLUListElement>(null);

	useClickOutside(containerRef, suggestionsRef, onClose, skipOutsideClickRef);

	const startEdit = (med: ApiMed) => {
		skipOutsideClickRef.current = true;
		skipFetchRef.current = true;
		const dose = med.dosage ?? "";
		const time = med.schedule?.time ?? "";
		const days = med.schedule?.days ?? [];
		setEditing({ id: med._id, name: med.name, dose, time, days });
		setForm({ id: med._id, name: med.name, dose, time, days });
		setQuery(med.name);
		setSelectedName(med.name);
		setOptions([]);
		setHighlighted(-1);
	};

	// Autocomplete fetch
	useEffect(() => {
		if (!editing || skipFetchRef.current) {
			skipFetchRef.current = false;
			return;
		}
		const term = String(query).trim();
		if (!term || !inputFocused) {
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
	}, [query, editing, inputFocused]);

	// Keyboard navigation + Tab handling
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
				e.stopPropagation();
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
		setSelectedName(name);
		setQuery(name);
		setOptions([]);
		setHighlighted(-1);
		setForm((f) => ({ ...f, name }));
		setInputFocused(true);
		inputRef.current?.focus();
	}

	function handleFieldChange(field: keyof Med, value: string | string[]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function save() {
		if (editing) {
			onSave(form);
			setEditing(null);
		}
	}

	const formatTime = (t: string) => {
		try {
			const dt = parse(t, "HH:mm", new Date());
			return fmt(dt, "h:mm a");
		} catch {
			return t;
		}
	};

	// May Treat fetch
	useEffect(() => {
		if (!selectedName) {
			setIndications([]);
			return;
		}
		(async () => {
			try {
				const approxRes = await fetch(
					`https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(selectedName)}&maxEntries=1`
				);
				const approxData = (await approxRes.json()) as ApproximateTermResponse;
				const candidate = approxData.approximateGroup?.candidate?.[0];
				const rxcui = candidate?.rxcui;
				if (!rxcui) {
					setIndications([]);
					return;
				}
				const url = new URL("https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json");
				url.searchParams.set("rxcui", rxcui);
				url.searchParams.set("relaSource", "MEDRT");
				url.searchParams.set("relas", "may_treat");
				const treatRes = await fetch(url.toString(), { headers: { Accept: "application/json" } });
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
	}, [selectedName]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
			<div
				ref={containerRef}
				className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl p-6 fade-in"
			>
				<div className="flex justify-between items-center pb-5">
					<h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Manage Medications</h2>
					<button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md cursor-pointer">
						<XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
					</button>
				</div>
				{!editing ? (
					<div>
						{meds.length === 0 ? (
							<p className="text-center text-gray-500">No medications to edit.</p>
						) : (
							<ul className="space-y-2 max-h-96 overflow-y-auto">
								{meds.map((m) => (
									<li key={m._id} className="flex items-center justify-between p-2 border border-gray-700 rounded">
										<div>
											<p className="font-bold">{m.name}</p>
											<p className="text-sm font-medium">Dose: {m.dosage}</p>
											<p className="text-sm font-medium">Time: {formatTime(m.schedule?.time ?? "")}</p>
											<p className="text-sm font-medium">Days: {(m.schedule?.days ?? []).join(", ")}</p>{" "}
										</div>
										<div className="flex gap-2">
											<button
												onMouseDown={(e) => e.stopPropagation()}
												onClick={(e) => {
													e.stopPropagation();
													startEdit(m);
												}}
												className="cursor-pointer p-1 hover:bg-gray-200 rounded"
											>
												<PencilIcon className="w-5 h-5 text-blue-500" />
											</button>
											<button onClick={() => onDelete(m._id)} className="cursor-pointer p-1 hover:bg-gray-200 rounded">
												<TrashIcon className="w-5 h-5 text-red-500" />
											</button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							save();
						}}
						className="space-y-4"
					>
						{/* Name */}
						<div className="relative">
							<label className="block text-sm font-medium">Name</label>
							<input
								ref={inputRef}
								type="text"
								className="w-full border border-gray-700 rounded px-3 py-2 focus:ring-2 focus:ring-green-300"
								value={query}
								onFocus={() => setInputFocused(true)}
								onBlur={() => {
									setInputFocused(false);
									setTimeout(() => setOptions([]), 100);
								}}
								onChange={(e) => {
									setQuery(e.target.value);
									setSelectedName("");
									handleFieldChange("name", e.target.value);
								}}
								required
							/>
							{selectedName && <CheckCircleIcon className="absolute top-1/2 right-3 w-5 h-5 text-green-500" />}
							{inputFocused && options.length > 0 && (
								<ul
									ref={suggestionsRef}
									onMouseDown={(e) => e.stopPropagation()}
									onContextMenu={(e) => e.stopPropagation()}
									className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto bg-white dark:bg-gray-800 border rounded shadow-lg"
								>
									{options.map((opt, idx) => (
										<li
											key={opt}
											onMouseEnter={() => setHighlighted(idx)}
											onMouseDown={(e) => {
												e.stopPropagation();
												selectOption(opt);
											}}
											className={`px-3 py-2 cursor-pointer ${
												idx === highlighted ? "bg-gray-100 dark:bg-gray-700" : ""
											}`}
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
								<label className="block text-sm font-medium">Dose</label>
								<input
									type="text"
									value={form.dose}
									onChange={(e) => handleFieldChange("dose", e.target.value)}
									className="w-full border border-gray-700 rounded px-3 py-2"
									required
								/>
							</div>
							<div className="relative">
								<label className="block text-sm font-medium">Time</label>
								<input
									type="time"
									value={form.time}
									onChange={(e) => handleFieldChange("time", e.target.value)}
									className="w-full border border-gray-700 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-green-300"
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
							<label className="block text-sm font-medium">Days</label>
							<div className="flex flex-wrap gap-2">
								{daysOfWeek.map((d) => (
									<button
										key={d}
										type="button"
										onClick={() =>
											handleFieldChange(
												"days",
												form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d]
											)
										}
										className={`px-3 py-1 rounded-full border cursor-pointer ${
											form.days.includes(d)
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
								onClick={() => setEditing(null)}
								className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={!(selectedName && form.dose && form.time && form.days.length > 0)}
								className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Save
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
