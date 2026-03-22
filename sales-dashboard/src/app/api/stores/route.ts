import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";

// GET: List all stores
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, shopify_domain, is_active, last_synced_at, created_at")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores });
}

// POST: Add a new store (admin only)
export async function POST(request: NextRequest) {
  const { userId } = auth();
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
  const { name, shopify_domain, api_key, api_secret, access_token } = body;

  if (!name || !shopify_domain || !access_token) {
    return NextResponse.json(
      { error: "Missing required fields: name, shopify_domain, access_token" },
      { status: 400 }
    );
  }

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .insert({
      name,
      shopify_domain,
      api_key: api_key || "",
      api_secret: api_secret || "",
      access_token,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store }, { status: 201 });
}
