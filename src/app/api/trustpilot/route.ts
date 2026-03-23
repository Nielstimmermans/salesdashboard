import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Fetch stored Trustpilot stats + recent reviews + period averages
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekStartISO = weekStart.toISOString();

  // Outscraper date format: "MM/DD/YYYY HH:MM:SS"
  // We need to convert our ISO dates for comparison
  const todayStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
  const weekStartDate = weekStart;

  const [statsResult, reviewsResult, allReviewsResult] = await Promise.all([
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
    // Get all reviews for period calculations
    supabaseAdmin
      .from("trustpilot_reviews")
      .select("rating, date")
      .order("date", { ascending: false })
      .limit(500),
  ]);

  const allReviews = allReviewsResult.data || [];

  // Parse Outscraper date "MM/DD/YYYY HH:MM:SS" to Date
  function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [datePart] = dateStr.split(" ");
    const [month, day, year] = datePart.split("/").map(Number);
    if (!month || !day || !year) return null;
    return new Date(year, month - 1, day);
  }

  // Calculate averages for today and this week
  let todaySum = 0, todayCount = 0;
  let weekSum = 0, weekCount = 0;

  for (const r of allReviews) {
    const d = parseDate(r.date);
    if (!d) continue;

    if (d >= new Date(todayStart)) {
      todaySum += r.rating;
      todayCount++;
    }
    if (d >= weekStartDate) {
      weekSum += r.rating;
      weekCount++;
    }
  }

  return NextResponse.json({
    stats: statsResult.data || null,
    reviews: reviewsResult.data || [],
    averages: {
      today: todayCount > 0 ? Math.round((todaySum / todayCount) * 10) / 10 : null,
      todayCount,
      week: weekCount > 0 ? Math.round((weekSum / weekCount) * 10) / 10 : null,
      weekCount,
    },
  });
}
