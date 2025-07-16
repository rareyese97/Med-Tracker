// src/app/dashboard/components/TakenMedChart.tsx
"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export interface ApiMed {
	_id: string;
	name: string;
	takenDates?: string[];
}

type TodayMedBarChartProps = {
	meds: ApiMed[];
};

export default function TodayMedBarChart({ meds }: TodayMedBarChartProps) {
	// If no medications at all, show a message
	if (!meds || meds.length === 0) {
		return <p className="text-gray-500">No medications to display.</p>;
	}

	// Build chart data: total taken count over all time
	const data = meds.map((m) => ({
		name: m.name,
		takenCount: m.takenDates?.length ?? 0,
	}));

	// Determine a minimum width so each bar + label has room
	const BAR_WIDTH = 200;
	const minChartWidth = data.length * BAR_WIDTH;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
			{/* Scrollable wrapper */}
			<div className="overflow-x-auto">
				{/* Use min-width to allow expansion when few meds, and enable horizontal scroll when many */}
				<div style={{ width: "100%", minWidth: minChartWidth, height: 260 }}>
					<BarChart
						width={minChartWidth}
						height={300}
						data={data}
						margin={{ top: 10, right: 20, bottom: 60, left: -10 }}
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
						<YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
						<Tooltip formatter={(value: number) => [value, "Total Taken"]} />{" "}
						<Bar dataKey="takenCount" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={BAR_WIDTH - 20} />
					</BarChart>
				</div>
			</div>
		</div>
	);
}
