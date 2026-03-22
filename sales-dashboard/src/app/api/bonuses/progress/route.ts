import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateBonus, getDateRange } from "@/lib/utils";
import type { BonusConfig, BonusProgress, BonusTier } from "@/types";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current employee
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Get active bonus configs assigned to this employee (or apply_to_all)
  const { data: configs } = await supabaseAdmin
    .from("bonus_configs")
    .select("*, bonus_assignments(employee_id)")
    .eq("is_active", true);

  const applicableConfigs = (configs || []).filter(
    (config) =>
      config.apply_to_all ||
      config.bonus_assignments.some(
        (a: { employee_id: string }) => a.employee_id === employee.id
      )
  );

  // Calculate progress for each config
  const progressList: BonusProgress[] = [];

  for (const config of applicableConfigs) {
    const dateRange = getDateRange(
      config.period === "weekly" ? "week" : "month"
    );

    // Get current sales
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("total_paid, refund_amount")
      .eq("tag", employee.tag)
      .gte("order_date", dateRange.from.toISOString())
      .lte("order_date", dateRange.to.toISOString())
      .not("financial_status", "in", '("voided","cancelled")');

    const currentSales = (orders || []).reduce(
      (sum, o) => sum + Number(o.total_paid) - Number(o.refund_amount),
      0
    );

    const targetAmount = config.target_amount || 0;
    const progressPercent =
      targetAmount > 0 ? (currentSales / targetAmount) * 100 : 0;

    const earnedBonus = calculateBonus(config.type, currentSales, config);

    // Find current and next tier
    let currentTier: BonusTier | null = null;
    let nextTier: BonusTier | null = null;

    if (config.type === "tiered" && config.tiers) {
      const sortedTiers = [...config.tiers].sort(
        (a: BonusTier, b: BonusTier) => a.threshold - b.threshold
      );

      for (let i = 0; i < sortedTiers.length; i++) {
        if (currentSales >= sortedTiers[i].threshold) {
          currentTier = sortedTiers[i];
          nextTier = sortedTiers[i + 1] || null;
        }
      }

      if (!currentTier && sortedTiers.length > 0) {
        nextTier = sortedTiers[0];
      }
    }

    progressList.push({
      bonusConfig: config,
      currentSales,
      targetAmount,
      progressPercent: Math.round(progressPercent * 10) / 10,
      earnedBonus,
      currentTier,
      nextTier,
    });
  }

  return NextResponse.json({ progress: progressList });
}
