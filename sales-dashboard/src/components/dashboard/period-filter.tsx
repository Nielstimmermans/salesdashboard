"use client";

import type { PeriodFilter as PeriodFilterType, DateRange } from "@/types";

interface PeriodFilterProps {
  value: PeriodFilterType;
  onChange: (value: PeriodFilterType) => void;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const periods: { value: PeriodFilterType; label: string }[] = [
  { value: "day", label: "Vandaag" },
  { value: "week", label: "Week" },
  { value: "month", label: "Maand" },
  { value: "year", label: "Jaar" },
  { value: "custom", label: "Custom" },
];

export function PeriodFilter({
  value,
  onChange,
  dateRange,
  onDateRangeChange,
}: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-500">Periode:</span>
      <div className="flex rounded-lg border bg-white p-1">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              value === period.value
                ? "bg-primary text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* TODO: Show date picker when "Custom" is selected */}
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-3 py-1.5 text-sm"
            onChange={(e) =>
              onDateRangeChange({
                from: new Date(e.target.value),
                to: dateRange?.to || new Date(),
              })
            }
          />
          <span className="text-gray-400">t/m</span>
          <input
            type="date"
            className="rounded-md border px-3 py-1.5 text-sm"
            onChange={(e) =>
              onDateRangeChange({
                from: dateRange?.from || new Date(),
                to: new Date(e.target.value),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
