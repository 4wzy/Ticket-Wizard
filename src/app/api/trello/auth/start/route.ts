import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Start OAuth 1.0a authorization flow for Trello
export async function POST(request: NextRequest) {
  try {
    // Get Trello API credentials from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const redirectUri = process.env.TRELLO_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/trello/auth/callback`;

    if (!apiKey) {
      console.error('TRELLO_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Trello integration is not configured on the server. Please contact your administrator.' },
        { status: 500 }
      );
    }

    // Generate a random state parameter for security
    const state = randomBytes(32).toString('hex');

    // Use Trello's 1/authorize route with fragment method (more reliable than postMessage)
    const authUrl = new URL('https://trello.com/1/authorize');
    authUrl.searchParams.set('expiration', 'never'); // Token doesn't expire
    authUrl.searchParams.set('scope', 'read,write'); // Full access to read boards/cards and write/update them
    authUrl.searchParams.set('response_type', 'token'); // Return token directly
    authUrl.searchParams.set('key', apiKey);
    authUrl.searchParams.set('return_url', redirectUri);
    authUrl.searchParams.set('callback_method', 'fragment'); // Use fragment method for better reliability
    authUrl.searchParams.set('name', 'TicketWizard'); // App name shown to user

    // Store state for callback verification
    // Note: In production, you'd want to store this in a secure session store
    // For now, we'll include it in the redirect URL
    authUrl.searchParams.set('state', state);

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Error starting Trello OAuth flow:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow: ' + error.message },
      { status: 500 }
    );
  }
}