// src/app/dashboard/components/MiniCalendar.tsx
"use client";

import { useState, useEffect } from "react";
import {
	format,
	parse,
	eachDayOfInterval,
	endOfMonth,
	add,
	getDay,
	isSameMonth,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

interface MiniCalendarProps {
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
	timezone: string;
}

export default function MiniCalendar({ selectedDate, onSelectDate, timezone }: MiniCalendarProps) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const today = new Date(
		Number(parts.find((part) => part.type === "year")?.value),
		Number(parts.find((part) => part.type === "month")?.value) - 1,
		Number(parts.find((part) => part.type === "day")?.value),
		12
	);
	const [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));

	useEffect(() => {
		const selectedMonth = format(selectedDate, "MMM-yyyy");
		if (currentMonth !== selectedMonth) setCurrentMonth(selectedMonth);
	}, [selectedDate, currentMonth]);

	const firstDayOfMonth = parse(currentMonth, "MMM-yyyy", new Date());
	const days = eachDayOfInterval({ start: firstDayOfMonth, end: endOfMonth(firstDayOfMonth) });
	const offset = getDay(firstDayOfMonth);

	const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];

	return (
		<div>
			<div className="flex items-center justify-between px-2">
				<button
					onClick={() => {
						const nextMonth = add(firstDayOfMonth, { months: -1 });
						setCurrentMonth(format(nextMonth, "MMM-yyyy"));
						onSelectDate(nextMonth);
					}}
					className="p-1 rounded hover:bg-gray-200 cursor-pointer"
				>
					<ChevronLeftIcon className="w-5 h-5" />
				</button>
				<span className="font-semibold text-lg">{format(firstDayOfMonth, "MMMM yyyy")}</span>
				<button
					onClick={() => {
						const nextMonth = add(firstDayOfMonth, { months: 1 });
						setCurrentMonth(format(nextMonth, "MMM-yyyy"));
						onSelectDate(nextMonth);
					}}
					className="p-1 rounded hover:bg-gray-200 cursor-pointer"
				>
					<ChevronRightIcon className="w-5 h-5" />
				</button>
			</div>

			<div className="grid grid-cols-7 text-xs text-gray-500 mt-2 gap-1 place-items-center">
				{dayLetters.map((letter, idx) => (
					<div key={idx} className="font-medium">
						{letter}
					</div>
				))}
				{Array.from({ length: offset }).map((_, i) => (
					<div key={`spacer-${i}`} />
				))}
				{days.map((day) => {
					const isSel = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
					return (
						<button
							key={day.toString()}
							onClick={() => onSelectDate(day)}
							className={`h-8 w-8 rounded-full flex items-center justify-center cursor-pointer
                ${format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ? "font-semibold" : ""}
                ${isSel ? "bg-green-600 text-white hover:bg-green-300" : "hover:bg-gray-200"}
                ${!isSameMonth(day, firstDayOfMonth) ? "text-gray-400" : ""}`}
						>
							{format(day, "d")}
						</button>
					);
				})}
			</div>
		</div>
	);
}
