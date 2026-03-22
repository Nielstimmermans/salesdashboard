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
    .select("id, name, shopify_domain, scope, is_active, last_synced_at, created_at, gorgias_domain, gorgias_email, gorgias_api_key")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Never expose the actual API key — just indicate if it's set
  const safeStores = (stores || []).map((s) => ({
    ...s,
    gorgias_api_key: s.gorgias_api_key ? "***" : null,
  }));

  return NextResponse.json({ stores: safeStores });
}

// PUT: Update store Gorgias credentials (admin only)
export async function PUT(request: NextRequest) {
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

  const body = await request.json();
  const { storeId, gorgias_domain, gorgias_email, gorgias_api_key } = body;

  if (!storeId) {
    return NextResponse.json({ error: "Missing store id" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Only update fields that are provided (allow clearing with empty string → null)
  if (gorgias_domain !== undefined) {
    updateData.gorgias_domain = gorgias_domain || null;
  }
  if (gorgias_email !== undefined) {
    updateData.gorgias_email = gorgias_email || null;
  }
  if (gorgias_api_key !== undefined) {
    updateData.gorgias_api_key = gorgias_api_key || null;
  }

  const { error } = await supabaseAdmin
    .from("stores")
    .update(updateData)
    .eq("id", storeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
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
