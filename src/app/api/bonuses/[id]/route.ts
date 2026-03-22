import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function checkAdmin(userId: string): Promise<boolean> {
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();
  return employee?.role === "admin";
}

// PUT: Update a bonus config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkAdmin(userId))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updateFields: Record<string, unknown> = {};
  const allowedFields = [
    "name",
    "type",
    "period",
    "target_amount",
    "bonus_value",
    "percentage_value",
    "tiers",
    "is_active",
    "apply_to_all",
    "scope",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updateFields[field] = body[field];
    }
  }

  const { data: config, error } = await supabaseAdmin
    .from("bonus_configs")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync employee assignments if provided
  if ("employee_ids" in body) {
    await supabaseAdmin
      .from("bonus_assignments")
      .delete()
      .eq("bonus_config_id", id);

    if (!body.apply_to_all && body.employee_ids?.length > 0) {
      const assignments = body.employee_ids.map((empId: string) => ({
        bonus_config_id: id,
        employee_id: empId,
      }));
      await supabaseAdmin.from("bonus_assignments").insert(assignments);
    }
  }

  return NextResponse.json({ config });
}

// DELETE: Remove a bonus config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkAdmin(userId))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  // Delete assignments first, then config
  await supabaseAdmin
    .from("bonus_assignments")
    .delete()
    .eq("bonus_config_id", id);

  const { error } = await supabaseAdmin
    .from("bonus_configs")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
