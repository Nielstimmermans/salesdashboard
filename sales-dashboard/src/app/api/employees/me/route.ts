import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .select("id, name, tag, role, is_active")
    .eq("clerk_user_id", userId)
    .single();

  if (error || !employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ employee });
}
