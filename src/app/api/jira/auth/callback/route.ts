import { NextRequest, NextResponse } from 'next/server';

// Handle OAuth 2.0 callback from Jira
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth error
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'OAuth authorization failed';
    console.error('OAuth error:', error, errorDescription);
    
    // Redirect to frontend with error
    const errorUrl = new URL('/settings?error=oauth_failed', request.url);
    errorUrl.searchParams.set('message', errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('Missing code or state parameter');
    const errorUrl = new URL('/settings?error=invalid_callback', request.url);
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Get OAuth credentials from environment variables
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = process.env.JIRA_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/jira/auth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Jira OAuth credentials not configured');
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Warn if no refresh token received (shouldn't happen with offline_access scope)
    if (!refresh_token) {
      console.warn('No refresh token received from Atlassian. Token may expire without ability to refresh.');
    }

    // Get accessible resources (Jira sites)
    const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!resourcesResponse.ok) {
      throw new Error('Failed to get accessible resources');
    }

    const resources = await resourcesResponse.json();
    
    if (resources.length === 0) {
      throw new Error('No Jira sites accessible with this account');
    }

    // Use the first available resource (site)
    const site = resources[0];
    const instanceUrl = site.url.replace('https://', '');
    const cloudId = site.id;

    // Get user info
    const userResponse = await fetch(`${site.url}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
    });

    let userEmail = '';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userEmail = userData.emailAddress || '';
    }

    // Create success page with connection data that will be handled by client-side JavaScript
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Jira Connection Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(30, 41, 59, 0.7);
            border-radius: 12px;
            border: 1px solid #334155;
            max-width: 500px;
        }
        .success-icon {
            width: 64px;
            height: 64px;
            background: #10b981;
            border-radius: 50%;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .checkmark {
            color: white;
            font-size: 2rem;
        }
        h1 {
            color: #10b981;
            margin-bottom: 1rem;
        }
        .details {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            text-align: left;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        .detail-row:last-child {
            margin-bottom: 0;
        }
        .detail-label {
            color: #94a3b8;
        }
        .detail-value {
            color: #e2e8f0;
            font-weight: 500;
        }
        .closing-message {
            color: #94a3b8;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">
            <div class="checkmark">✓</div>
        </div>
        <h1>Connected to Jira!</h1>
        <p>Your Jira account has been successfully connected to Jira Wizard.</p>
        
        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Instance:</span>
                <span class="detail-value">${site.name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">URL:</span>
                <span class="detail-value">${instanceUrl}</span>
            </div>
            ${userEmail ? `
            <div class="detail-row">
                <span class="detail-label">User:</span>
                <span class="detail-value">${userEmail}</span>
            </div>
            ` : ''}
        </div>
        
        <p class="closing-message">This window will close automatically, or you can close it manually.</p>
    </div>

    <script>
        // Store the connection data
        const connectionData = {
            instanceUrl: '${instanceUrl}',
            isConnected: true,
            accessToken: '${access_token}',
            refreshToken: ${refresh_token ? `'${refresh_token}'` : 'null'},
            tokenExpiry: ${Date.now() + (expires_in * 1000)},
            userEmail: '${userEmail}',
            siteName: '${site.name}',
            cloudId: '${cloudId}',
        };
        
        localStorage.setItem('jira-connection', JSON.stringify(connectionData));
        
        // Try to communicate with the parent window if this is a popup
        if (window.opener) {
            window.opener.postMessage({ 
                type: 'jira-auth-success', 
                data: connectionData 
            }, window.location.origin);
        }
        
        // Close the window after a delay
        setTimeout(() => {
            if (window.opener) {
                window.close();
            } else {
                // If not in a popup, redirect to settings page
                window.location.href = '/settings?success=connected';
            }
        }, 3000);
    </script>
</body>
</html>`;

    return new NextResponse(successHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    
    // Redirect to frontend with error
    const errorUrl = new URL('/settings?error=callback_failed', request.url);
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }
}