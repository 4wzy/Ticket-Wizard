import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Start OAuth 2.0 authorization flow for Jira
export async function POST(request: NextRequest) {
  try {
    const { instanceUrl } = await request.json();

    if (!instanceUrl) {
      return NextResponse.json(
        { error: 'Instance URL is required' },
        { status: 400 }
      );
    }

    // Get OAuth credentials from environment variables
    const clientId = process.env.JIRA_CLIENT_ID;
    const redirectUri = process.env.JIRA_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/jira/auth/callback`;

    if (!clientId) {
      console.error('JIRA_CLIENT_ID environment variable is not set');
      return NextResponse.json(
        { error: 'Jira OAuth is not configured on the server. Please contact your administrator.' },
        { status: 500 }
      );
    }

    // Generate a random state parameter for security
    const state = randomBytes(32).toString('hex');

    // Build the authorization URL
    const authUrl = new URL('https://auth.atlassian.com/authorize');
    authUrl.searchParams.set('audience', 'api.atlassian.com');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', 'read:jira-work write:jira-work manage:jira-project offline_access');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Error starting OAuth flow:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow: ' + error.message },
      { status: 500 }
    );
  }
}