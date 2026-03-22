import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: List all employees
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employees, error } = await supabaseAdmin
    .from("employees")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employees });
}

// POST: Add a new employee (admin only)
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentUser } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { name, tag, clerk_user_id, role } = body;

  if (!name || !tag) {
    return NextResponse.json(
      { error: "Missing required fields: name, tag" },
      { status: 400 }
    );
  }

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .insert({
      name,
      tag: tag.toLowerCase().trim(),
      clerk_user_id: clerk_user_id || null,
      role: role || "employee",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee }, { status: 201 });
}

// PUT: Update an employee (admin only)
export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentUser } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const employeeId = request.nextUrl.searchParams.get("id");
  if (!employeeId) {
    return NextResponse.json({ error: "Missing employee id" }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updates.name = body.name;
  if (body.tag !== undefined) updates.tag = body.tag.toLowerCase().trim();
  if (body.clerk_user_id !== undefined) updates.clerk_user_id = body.clerk_user_id || null;
  if (body.role !== undefined) updates.role = body.role;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .update(updates)
    .eq("id", employeeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee });
}
