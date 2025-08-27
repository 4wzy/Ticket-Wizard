import { NextRequest, NextResponse } from 'next/server';

// Refresh OAuth 2.0 access token
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Get OAuth credentials from environment variables
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Jira OAuth credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token refresh failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to refresh token. Please reconnect to Jira.' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    return NextResponse.json({
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken, // Some responses may not include a new refresh token
      expiresIn: expires_in,
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token: ' + error.message },
      { status: 500 }
    );
  }
}