import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  // Only admins can install stores
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

  const shop = request.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json(
      { error: "Missing shop parameter (e.g. mystore.myshopify.com)" },
      { status: 400 }
    );
  }

  // Validate shop domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json(
      { error: "Invalid shop domain. Must be like mystore.myshopify.com" },
      { status: 400 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const scopes = process.env.SHOPIFY_SCOPES || "read_orders";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_CLIENT_ID or NEXT_PUBLIC_APP_URL in env" },
      { status: 500 }
    );
  }

  // Generate a random nonce for CSRF protection
  const nonce = crypto.randomBytes(16).toString("hex");

  const redirectUri = `${appUrl}/api/auth/callback`;
  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${nonce}`;

  // Store nonce in a cookie so we can verify it on callback
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("shopify_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  // Also store the shop domain for verification
  response.cookies.set("shopify_oauth_shop", shop, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
