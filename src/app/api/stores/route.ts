import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: List all stores (admin sees all, never expose access_token)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, shopify_domain, scope, is_active, last_synced_at, created_at")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores });
}

// DELETE: Remove a store (admin only)
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!employee || employee.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const storeId = request.nextUrl.searchParams.get("id");
  if (!storeId) {
    return NextResponse.json({ error: "Missing store id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("stores")
    .delete()
    .eq("id", storeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
