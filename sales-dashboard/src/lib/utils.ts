import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
} from "date-fns";
import { nl } from "date-fns/locale";
import type { PeriodFilter, DateRange } from "@/types";

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
        from: startOfWeek(now, { locale: nl, weekStartsOn: 1 }),
        to: endOfWeek(now, { locale: nl, weekStartsOn: 1 }),
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
