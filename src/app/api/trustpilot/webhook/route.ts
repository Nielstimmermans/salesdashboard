import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// Outscraper webhook payload fields (from actual test):
// query, total_reviews, review_rating, review_title, review_text,
// review_likes, review_timestamp, review_datetime_utc, review_id,
// review_verified, author_title, author_id, author_image,
// author_reviews_number, author_reviews_number_same_domain,
// author_country_code, owner_answer, owner_answer_date

interface OutscraperReview {
  query: string;
  total_reviews: number;
  review_rating: number;
  review_title: string;
  review_text: string;
  review_likes: number;
  review_timestamp: number;
  review_datetime_utc: string;
  review_id: string;
  review_verified: boolean;
  author_title: string;
  author_id: string;
  author_image: string;
  author_reviews_number: number;
  author_reviews_number_same_domain: number;
  author_country_code: string;
  owner_answer: string | null;
  owner_answer_date: string | null;
}

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

  // Outscraper sends either:
  // A) Webhook: { id, status, data: [[...reviews]] }
  // B) Direct array: [...reviews]
  let reviews: OutscraperReview[] = [];

  if (Array.isArray(payload)) {
    // Direct array format
    reviews = payload;
  } else if (payload.data) {
    // Webhook wrapper format: data[group][review]
    for (const group of payload.data) {
      if (Array.isArray(group)) {
        reviews.push(...group);
      }
    }
  }

  if (reviews.length === 0) {
    return NextResponse.json({ ok: true, message: "No reviews in payload" });
  }

  // Extract business stats from first review
  const first = reviews[0];
  const totalReviews = first.total_reviews;
  const query = first.query;

  // Calculate average rating from received reviews
  const avgRating =
    reviews.reduce((sum, r) => sum + r.review_rating, 0) / reviews.length;

  // Calculate star distribution
  const stars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    if (r.review_rating >= 1 && r.review_rating <= 5) {
      stars[r.review_rating]++;
    }
  }

  // Upsert business stats
  await supabaseAdmin.from("trustpilot_stats").upsert(
    {
      id: "main",
      business_name: "Fatbikeskopen.nl",
      query,
      total_reviews: totalReviews,
      trust_score: Math.round(avgRating * 10) / 10,
      raw_data: { stars, avg_rating: avgRating, reviews_scraped: reviews.length },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // Upsert reviews
  const rows = reviews.map((r) => ({
    review_id: r.review_id,
    author: r.author_title,
    rating: r.review_rating,
    title: r.review_title,
    text: r.review_text,
    date: r.review_datetime_utc,
    country: r.author_country_code,
    verified: r.review_verified,
    reply: r.owner_answer || "",
    raw_data: r,
    created_at: new Date().toISOString(),
  }));

  await supabaseAdmin
    .from("trustpilot_reviews")
    .upsert(rows, { onConflict: "review_id" });

  console.log(
    `[Trustpilot webhook] Received ${reviews.length} reviews, total: ${totalReviews}`
  );

  return NextResponse.json({
    ok: true,
    reviewsReceived: reviews.length,
    totalReviews,
  });
}
