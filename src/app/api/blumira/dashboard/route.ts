import { NextResponse } from "next/server";
import {
  getAccessToken,
  fetchMspAccounts,
  fetchAllFindings,
  fetchAccountUsers,
  type BlumiraUser,
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

    const usersMap = new Map<string, BlumiraUser>();
    const userFetches = accounts.map(async (account) => {
      try {
        const accountUsers = await fetchAccountUsers(token, account.account_id);
        for (const user of accountUsers) {
          const key = user.user_id || user.email;
          if (!usersMap.has(key)) {
            usersMap.set(key, { ...user, org_name: account.name, org_id: account.account_id });
          }
        }
      } catch {
        // continue if a single account's users fail
      }
    });
    await Promise.all(userFetches);

    const users = Array.from(usersMap.values()).sort((a, b) => {
      const nameA = a.name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email;
      const nameB = b.name || `${b.first_name || ""} ${b.last_name || ""}`.trim() || b.email;
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({
      accounts,
      findings,
      users,
      meta: {
        accountsCount: accounts.length,
        findingsCount: findings.length,
        usersCount: users.length,
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
