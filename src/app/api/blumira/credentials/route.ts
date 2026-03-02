import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-data";

let runtimeDemoMode: boolean | null = null;

export function getRuntimeDemoMode(): boolean {
  if (runtimeDemoMode !== null) return runtimeDemoMode;
  return isDemoMode();
}

export function setRuntimeDemoMode(value: boolean) {
  runtimeDemoMode = value;
}

export async function GET() {
  const hasClientId = !!process.env.BLUMIRA_CLIENT_ID;
  const hasClientSecret = !!process.env.BLUMIRA_CLIENT_SECRET;
  const demoMode = getRuntimeDemoMode();

  return NextResponse.json({
    hasCredentials: hasClientId && hasClientSecret,
    hasClientId,
    hasClientSecret,
    demoMode,
    dataSource: demoMode ? "demo" : hasClientId && hasClientSecret ? "live" : "none",
    environment: {
      demoModeEnv: process.env.DEMO_MODE || "false",
      hasClientIdEnv: hasClientId,
      hasClientSecretEnv: hasClientSecret,
      nodeEnv: process.env.NODE_ENV || "development",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.toggleDemo !== undefined) {
      setRuntimeDemoMode(!!body.toggleDemo);
      return NextResponse.json({
        success: true,
        demoMode: getRuntimeDemoMode(),
        message: body.toggleDemo
          ? "Demo mode enabled — using synthetic data"
          : "Demo mode disabled — using live API data",
      });
    }

    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    const authResponse = await fetch("https://auth.blumira.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        audience: "public-api",
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      return NextResponse.json(
        { error: "Invalid credentials", details: errorText },
        { status: 401 }
      );
    }

    const authData = await authResponse.json();
    if (!authData.access_token) {
      return NextResponse.json(
        { error: "Invalid response from authentication server" },
        { status: 401 }
      );
    }

    process.env.BLUMIRA_CLIENT_ID = clientId;
    process.env.BLUMIRA_CLIENT_SECRET = clientSecret;

    if (getRuntimeDemoMode()) {
      setRuntimeDemoMode(false);
    }

    return NextResponse.json({
      success: true,
      message: "Credentials validated and set for this session",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update credentials" },
      { status: 500 }
    );
  }
}
