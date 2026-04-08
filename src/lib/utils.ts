import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import type { PeriodFilter, DateRange } from "@/types";

/**
 * Business week boundary: Friday 17:00 → next Friday 17:00.
 * Returns the most recent Friday 17:00 at or before `date`.
 */
export function startOfBusinessWeek(date: Date): Date {
  const d = new Date(date);
  const candidate = new Date(d);
  candidate.setHours(17, 0, 0, 0);
  // Shift to Friday of the current week (getDay: 0=Sun..5=Fri..6=Sat)
  const diffToFri = candidate.getDay() - 5;
  candidate.setDate(candidate.getDate() - diffToFri);
  if (candidate.getTime() > d.getTime()) {
    candidate.setDate(candidate.getDate() - 7);
  }
  return candidate;
}

export function endOfBusinessWeek(date: Date): Date {
  const start = startOfBusinessWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}

/**
 * Returns 1..7 indicating which day of the business week `date` falls in
 * (1 = first day after Friday 17:00, 7 = the day ending Friday 17:00).
 */
export function businessWeekDayIndex(date: Date): number {
  const start = startOfBusinessWeek(date);
  const diffMs = date.getTime() - start.getTime();
  return Math.min(7, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in EUR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Format number with Dutch locale
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("nl-NL").format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Get date range for a period filter
 */
export function getDateRange(period: PeriodFilter, customRange?: DateRange): DateRange {
  const now = new Date();

  switch (period) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return {
        from: startOfBusinessWeek(now),
        to: endOfBusinessWeek(now),
      };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":
      if (!customRange) {
        return { from: startOfMonth(now), to: endOfMonth(now) };
      }
      return customRange;
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

/**
 * Get the previous period's date range (for comparison)
 */
export function getPreviousDateRange(period: PeriodFilter, currentRange: DateRange): DateRange {
  const duration = currentRange.to.getTime() - currentRange.from.getTime();

  return {
    from: new Date(currentRange.from.getTime() - duration),
    to: new Date(currentRange.to.getTime() - duration),
  };
}

/**
 * Calculate bonus based on config and sales amount
 */
export function calculateBonus(
  type: "fixed" | "percentage" | "tiered",
  salesAmount: number,
  config: {
    target_amount?: number | null;
    bonus_value?: number | null;
    percentage_value?: number | null;
    tiers?: { threshold: number; bonus: number }[] | null;
  }
): number {
  switch (type) {
    case "fixed":
      if (config.target_amount && salesAmount >= config.target_amount) {
        return config.bonus_value || 0;
      }
      return 0;

    case "percentage":
      if (config.target_amount && salesAmount > config.target_amount) {
        const excessAmount = salesAmount - config.target_amount;
        return excessAmount * ((config.percentage_value || 0) / 100);
      }
      return 0;

    case "tiered":
      if (!config.tiers || config.tiers.length === 0) return 0;
      const sortedTiers = [...config.tiers].sort(
        (a, b) => b.threshold - a.threshold
      );
      for (const tier of sortedTiers) {
        if (salesAmount >= tier.threshold) {
          return tier.bonus;
        }
      }
      return 0;

    default:
      return 0;
  }
}
