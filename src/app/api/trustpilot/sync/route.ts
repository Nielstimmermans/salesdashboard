import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/trustpilot/sync — Fetch Trustpilot reviews via Outscraper and store directly
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OUTSCRAPER_API_KEY not set" }, { status: 500 });
  }

  try {
    // Step 1: Create task
    const params = new URLSearchParams({
      query: "https://www.trustpilot.com/review/fatbikeskopen.nl",
      limit: "10",
      sort: "recency",
      languages: "all",
    });

    const res = await fetch(
      `https://api.app.outscraper.com/trustpilot/reviews?${params}`,
      { headers: { "X-API-KEY": apiKey } }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Outscraper error: ${res.status}`, detail: text }, { status: 502 });
    }

    const taskData = await res.json();

    // Step 2: Poll for results (Outscraper returns Pending, need to poll results_location)
    const resultsUrl = taskData.results_location;
    if (!resultsUrl) {
      return NextResponse.json({ error: "No results_location", raw: taskData }, { status: 502 });
    }

    let reviews: Record<string, unknown>[] = [];
    const maxAttempts = 12; // 12 * 10s = 2 min max wait

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 10_000)); // Wait 10s

      const pollRes = await fetch(resultsUrl, {
        headers: { "X-API-KEY": apiKey },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();

      if (pollData.status === "Success" && pollData.data) {
        for (const group of pollData.data) {
          if (Array.isArray(group)) reviews.push(...group);
        }
        break;
      }

      if (pollData.status !== "Pending") break;
    }

    if (reviews.length === 0) {
      return NextResponse.json({ ok: false, message: "No reviews after polling" });
    }

    // Step 3: Store in Supabase
    const first = reviews[0] as Record<string, number | string>;
    await supabaseAdmin.from("trustpilot_stats").upsert(
      {
        id: "main",
        business_name: "Fatbikeskopen.nl",
        query: first.query,
        total_reviews: first.total_reviews,
        trust_score: 3.8,
        raw_data: { reviews_scraped: reviews.length },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    const rows = reviews.map((r) => ({
      review_id:
        String(r.review_id || "") ||
        crypto.createHash("md5").update(String(r.review_text || "")).digest("hex"),
      author: String(r.author_title || ""),
      rating: Number(r.review_rating || 0),
      title: String(r.review_title || ""),
      text: String(r.review_text || ""),
      date: String(r.review_datetime_utc || ""),
      country: String(r.author_country_code || ""),
      verified: Boolean(r.review_verified),
      reply: String(r.owner_answer || ""),
      raw_data: r,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin
      .from("trustpilot_reviews")
      .upsert(rows, { onConflict: "review_id" });

    return NextResponse.json({
      ok: true,
      reviewsStored: rows.length,
      totalReviews: first.total_reviews,
    });
  } catch (err) {
    console.error("[Trustpilot sync] Error:", err);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
