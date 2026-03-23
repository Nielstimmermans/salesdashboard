import { NextRequest, NextResponse } from "next/server";

// GET /api/trustpilot/sync — Trigger Outscraper to fetch latest Trustpilot reviews
// Called by cron job (e.g. every 12 hours)
export async function GET(request: NextRequest) {
  // Simple secret check to prevent abuse
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OUTSCRAPER_API_KEY not set" }, { status: 500 });
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://salesdashboard-8yrvd.ondigitalocean.app"}/api/trustpilot/webhook`;

  try {
    const res = await fetch("https://api.outscraper.cloud/tasks", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_name: "trustpilot_reviews_service",
        title: "Auto sync",
        queries: ["https://www.trustpilot.com/review/fatbikeskopen.nl"],
        input_file: null,
        enrich: false,
        settings: {
          output_extension: "json",
          webhook: webhookUrl,
        },
        tags: [],
        enrichments: [],
        limit: 0,
        limit_per_query: 10,
        sort: "",
        stars: [],
        languages: "all",
      }),
    });

    const data = await res.json();
    console.log("[Trustpilot sync] Task created:", data);

    return NextResponse.json({ ok: true, task: data });
  } catch (err) {
    console.error("[Trustpilot sync] Error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
