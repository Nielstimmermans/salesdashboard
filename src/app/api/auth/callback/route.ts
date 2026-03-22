import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { registerWebhooks } from "@/lib/shopify";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");
  const timestamp = searchParams.get("timestamp");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // 1. Check required params
  if (!shop || !code || !state || !hmac) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=missing_params`
    );
  }

  // 2. Validate shop domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=invalid_shop`
    );
  }

  // 3. Verify nonce (CSRF protection)
  const storedNonce = request.cookies.get("shopify_oauth_nonce")?.value;
  if (!storedNonce || storedNonce !== state) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=invalid_nonce`
    );
  }

  // 4. Verify HMAC signature
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=server_config`
    );
  }

  // Build the message to verify: sort all params except hmac
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "hmac") {
      params[key] = value;
    }
  });
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const calculatedHmac = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  if (calculatedHmac !== hmac) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=invalid_hmac`
    );
  }

  // 5. Exchange authorization code for access token
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=server_config`
    );
  }

  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: secret,
        code,
      }),
    }
  );

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=token_exchange_failed`
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const scope = tokenData.scope;

  if (!accessToken) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=no_token`
    );
  }

  // 6. Fetch shop info to get the store name
  const shopResponse = await fetch(
    `https://${shop}/admin/api/2024-01/shop.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    }
  );

  let storeName = shop.replace(".myshopify.com", "");
  if (shopResponse.ok) {
    const shopData = await shopResponse.json();
    storeName = shopData.shop?.name || storeName;
  }

  // 7. Upsert store in database
  const { error: upsertError } = await supabaseAdmin
    .from("stores")
    .upsert(
      {
        shopify_domain: shop,
        name: storeName,
        access_token: accessToken,
        scope: scope || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shopify_domain" }
    );

  if (upsertError) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=db_save_failed`
    );
  }

  // 8. Register webhooks automatically
  const webhookResult = await registerWebhooks(shop, accessToken, appUrl);
  if (!webhookResult.success) {
    console.error("Webhook registration errors:", webhookResult.errors);
    // Don't block the flow — store is connected, webhooks can be retried
  }

  // 9. Clear OAuth cookies and redirect to settings with success
  const response = NextResponse.redirect(
    `${appUrl}/settings?success=store_connected&shop=${encodeURIComponent(shop)}`
  );
  response.cookies.delete("shopify_oauth_nonce");
  response.cookies.delete("shopify_oauth_shop");

  return response;
}
