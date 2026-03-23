import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Fetch stored Trustpilot stats + recent reviews
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [statsResult, reviewsResult] = await Promise.all([
    supabaseAdmin
      .from("trustpilot_stats")
      .select("*")
      .eq("id", "main")
      .single(),
    supabaseAdmin
      .from("trustpilot_reviews")
      .select("review_id, author, rating, title, text, date, country, verified, reply")
      .order("date", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    stats: statsResult.data || null,
    reviews: reviewsResult.data || [],
  });
}
