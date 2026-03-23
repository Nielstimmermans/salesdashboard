import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// Outscraper sends scraped Trustpilot data here when a job completes
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Outscraper webhook signature
  const signature = request.headers.get("x-hub-signature-256");
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (signature && apiKey) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", apiKey).update(rawBody).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.status !== "Success" || !payload.data) {
    // Job still pending or failed — acknowledge
    return NextResponse.json({ ok: true, status: payload.status });
  }

  // Outscraper data structure: data[query_group][result]
  // Each result has reviews_data array
  const reviews: Record<string, unknown>[] = [];
  let businessInfo: Record<string, unknown> | null = null;

  for (const group of payload.data) {
    for (const result of group) {
      // Capture business-level info
      if (!businessInfo && result.name) {
        businessInfo = {
          name: result.name,
          query: result.query,
          trust_score: result.trust_score ?? result.rating ?? null,
          total_reviews: result.reviews ?? result.total_reviews ?? null,
        };
      }

      // Collect reviews
      if (result.reviews_data) {
        for (const review of result.reviews_data) {
          reviews.push(review);
        }
      }
    }
  }

  // Upsert business info
  if (businessInfo) {
    await supabaseAdmin.from("trustpilot_stats").upsert(
      {
        id: "main",
        business_name: businessInfo.name,
        query: businessInfo.query,
        trust_score: businessInfo.trust_score,
        total_reviews: businessInfo.total_reviews,
        raw_data: businessInfo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  // Insert reviews (upsert by outscraper review id or text hash)
  if (reviews.length > 0) {
    const rows = reviews.map((r) => ({
      review_id:
        String(r.review_id || r.id || "") ||
        crypto
          .createHash("md5")
          .update(String(r.review_text || r.text || ""))
          .digest("hex"),
      author: String(r.author_title || r.author || r.reviewer_name || ""),
      rating: Number(r.review_rating || r.rating || 0),
      title: String(r.review_title || r.title || ""),
      text: String(r.review_text || r.text || ""),
      date: String(r.review_datetime_utc || r.date || r.published_date || ""),
      country: String(r.author_country || r.country || ""),
      verified: Boolean(r.is_verified || r.verified || false),
      reply: String(r.owner_answer || r.reply || ""),
      raw_data: r,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin
      .from("trustpilot_reviews")
      .upsert(rows, { onConflict: "review_id" });
  }

  console.log(
    `[Trustpilot webhook] Received ${reviews.length} reviews, business: ${businessInfo?.name}`
  );

  return NextResponse.json({
    ok: true,
    reviewsReceived: reviews.length,
    business: businessInfo?.name,
  });
}
