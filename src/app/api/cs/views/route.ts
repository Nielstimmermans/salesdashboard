import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchViewCounts } from "@/lib/gorgias";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const viewCounts = await fetchViewCounts();
    return NextResponse.json({ viewCounts });
  } catch (error) {
    console.error("View counts fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch view counts",
      },
      { status: 500 }
    );
  }
}
