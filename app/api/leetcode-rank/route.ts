import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

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

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `LeetCode API responded with status ${response.status}: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      return NextResponse.json({ error: data.errors[0].message || "GraphQL error from LeetCode" }, { status: 400 });
    }

    const matchedUser = data.data?.matchedUser;
    if (!matchedUser) {
      return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
    }

    const ranking = matchedUser.profile?.ranking;
    if (ranking === undefined || ranking === null) {
      return NextResponse.json({ error: "No ranking found for this user" }, { status: 404 });
    }

    return NextResponse.json({ ranking });
  } catch (error: any) {
    console.error("Error in leetcode-rank API:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
