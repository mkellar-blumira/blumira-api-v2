import { NextResponse } from "next/server";

export async function GET() {
  const hasClientId = !!process.env.BLUMIRA_CLIENT_ID;
  const hasClientSecret = !!process.env.BLUMIRA_CLIENT_SECRET;

  return NextResponse.json({
    hasCredentials: hasClientId && hasClientSecret,
    hasClientId,
    hasClientSecret,
  });
}

export async function POST(request: Request) {
  try {
    const { clientId, clientSecret } = await request.json();

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
