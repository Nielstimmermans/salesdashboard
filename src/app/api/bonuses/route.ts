import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Fetch all bonus configs
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: configs, error } = await supabaseAdmin
    .from("bonus_configs")
    .select("*, bonus_assignments(employee_id)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configs });
}

// POST: Create a new bonus config (admin only)
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!employee || employee.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    type,
    period,
    target_amount,
    bonus_value,
    percentage_value,
    tiers,
    apply_to_all,
    employee_ids,
  } = body;

  // Validate
  if (!name || !type || !period) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Create bonus config
  const { data: config, error: configError } = await supabaseAdmin
    .from("bonus_configs")
    .insert({
      name,
      type,
      period,
      target_amount,
      bonus_value,
      percentage_value,
      tiers,
      apply_to_all: apply_to_all || false,
    })
    .select()
    .single();

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  // Assign to employees (if not apply_to_all)
  if (!apply_to_all && employee_ids && employee_ids.length > 0) {
    const assignments = employee_ids.map((empId: string) => ({
      bonus_config_id: config.id,
      employee_id: empId,
    }));

    await supabaseAdmin.from("bonus_assignments").insert(assignments);
  }

  return NextResponse.json({ config }, { status: 201 });
}
