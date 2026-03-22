import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";

// GET: List all employees
export async function GET() {
  const { userId } = auth();
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
  const { userId } = auth();
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
