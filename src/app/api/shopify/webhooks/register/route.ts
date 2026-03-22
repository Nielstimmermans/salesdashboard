import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { registerWebhooks } from "@/lib/shopify";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!employee || employee.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { storeId } = await request.json();

  // Get store with access token
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, shopify_domain, access_token, name")
    .eq("id", storeId)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const result = await registerWebhooks(store.shopify_domain, store.access_token, appUrl);

  return NextResponse.json({
    store: store.name,
    ...result,
  });
}
