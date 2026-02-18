import { NextResponse } from "next/server";
import {
  getAccessToken,
  fetchMspAccounts,
  fetchAllFindings,
} from "@/lib/blumira-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await getAccessToken();

    let accounts: Awaited<ReturnType<typeof fetchMspAccounts>> = [];
    let findings: Awaited<ReturnType<typeof fetchAllFindings>> = [];

    try {
      accounts = await fetchMspAccounts(token);
    } catch (e) {
      console.warn("Failed to fetch accounts:", e);
    }

    try {
      findings = await fetchAllFindings(token);
    } catch (e) {
      console.warn("Failed to fetch findings:", e);
    }

    return NextResponse.json({
      accounts,
      findings,
      meta: {
        accountsCount: accounts.length,
        findingsCount: findings.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        error: message,
        hasClientId: !!process.env.BLUMIRA_CLIENT_ID,
        hasClientSecret: !!process.env.BLUMIRA_CLIENT_SECRET,
      },
      { status: 500 }
    );
  }
}
