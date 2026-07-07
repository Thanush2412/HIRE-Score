import { NextRequest, NextResponse } from "next/server";
import { getOutdatedLeetcodeStudents, updateStudentLeetcodeRank, getPool } from "@/lib/db";

export const dynamic = 'force-dynamic';

function extractLeetCodeUsername(url: string): string {
  if (!url) return "";
  let clean = url.trim();

  if (!clean.includes("/") && !clean.includes("leetcode.com")) {
    return clean;
  }

  clean = clean.replace(/^(https?:\/\/)?(www\.)?leetcode\.com\/(u\/)?/i, "");

  const qIdx = clean.indexOf("?");
  if (qIdx !== -1) clean = clean.substring(0, qIdx);
  const hIdx = clean.indexOf("#");
  if (hIdx !== -1) clean = clean.substring(0, hIdx);

  const parts = clean.split("/").filter(Boolean);
  const firstPart = parts[0] || "";

  const invalidUsernames = new Set([
    "problems", "contest", "explore", "discuss", "tag", "api",
    "support", "articles", "list", "u", "playground", "desktop"
  ]);

  if (invalidUsernames.has(firstPart.toLowerCase())) {
    return "";
  }

  return firstPart;
}

async function fetchRank(username: string): Promise<number | null> {
  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com/",
      },
      body: JSON.stringify({
        query: `query userProfile($username: String!) {
          matchedUser(username: $username) {
            profile {
              ranking
            }
          }
        }`,
        variables: {
          username: username.trim(),
        },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.errors && data.errors.length > 0) return null;
    return data.data?.matchedUser?.profile?.ranking ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Case 1: Batch force sync by student IDs
    if (body.ids && Array.isArray(body.ids)) {
      const ids = body.ids.filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ success: true, updated: 0 });
      }

      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT s.id, t.leetcode_url FROM students s 
         JOIN student_technical t ON s.id = t.student_id 
         WHERE s.id IN (${ids.map(() => "?").join(",")})`,
        ids
      );

      let updatedCount = 0;
      for (const student of rows as any[]) {
        const username = extractLeetCodeUsername(student.leetcode_url);
        if (username) {
          const rank = await fetchRank(username);
          if (rank !== null) {
            await updateStudentLeetcodeRank(student.id, rank);
            updatedCount++;
          }
          // Small delay to prevent rate limit
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      return NextResponse.json({ success: true, updated: updatedCount });
    }

    // Case 2: Single student check by username
    const { username } = body;
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username or IDs list is required" }, { status: 400 });
    }
    const ranking = await fetchRank(username);
    if (ranking === null) {
      return NextResponse.json({ error: "LeetCode user not found or API error" }, { status: 404 });
    }
    return NextResponse.json({ ranking });
  } catch (error: any) {
    console.error("Error in leetcode-rank API:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const outdated = await getOutdatedLeetcodeStudents();
    if (outdated.length === 0) {
      return NextResponse.json({ message: "All LeetCode ranks are up to date", updated: 0 });
    }

    // Limit to updating at most 10 students per request to prevent timeouts / rate limits
    const limit = 10;
    const toProcess = outdated.slice(0, limit);
    let updatedCount = 0;

    for (const student of toProcess) {
      const username = extractLeetCodeUsername(student.leetcodeUrl);
      if (username) {
        const rank = await fetchRank(username);
        if (rank !== null) {
          await updateStudentLeetcodeRank(student.id, rank);
          updatedCount++;
        }
        // Small delay to prevent rate limit
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${updatedCount} LeetCode ranks.`,
      updated: updatedCount,
      remaining: Math.max(0, outdated.length - limit),
      totalOutdated: outdated.length
    });
  } catch (error: any) {
    console.error("Error in leetcode-rank sync API:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
