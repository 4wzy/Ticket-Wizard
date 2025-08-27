import { NextRequest, NextResponse } from 'next/server';

// API route to update existing Jira tickets
export async function PUT(request: NextRequest) {
  try {
    const { 
      ticketKey,
      title,
      description,
      acceptanceCriteria
    } = await request.json();

    // Get connection details from headers
    const connectionHeader = request.headers.get('x-jira-connection');
    if (!connectionHeader) {
      return NextResponse.json(
        { error: 'Jira connection data is required' },
        { status: 400 }
      );
    }

    let connection;
    try {
      connection = JSON.parse(connectionHeader);
    } catch {
      return NextResponse.json(
        { error: 'Invalid connection data' },
        { status: 400 }
      );
    }

    const { instanceUrl, accessToken, refreshToken, tokenExpiry, cloudId } = connection;

    if (!instanceUrl || !accessToken || !ticketKey) {
      return NextResponse.json(
        { error: 'Instance URL, access token, and ticket key are required' },
        { status: 400 }
      );
    }

    // Check if token is expired and attempt refresh
    let currentAccessToken = accessToken;
    let tokenWasRefreshed = false;
    let newTokenData = null;
    
    if (tokenExpiry && Date.now() >= tokenExpiry && refreshToken) {
      try {
        const refreshResponse = await fetch(`${request.nextUrl.origin}/api/jira/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          currentAccessToken = refreshData.accessToken;
          tokenWasRefreshed = true;
          newTokenData = {
            accessToken: refreshData.accessToken,
            refreshToken: refreshData.refreshToken,
            tokenExpiry: Date.now() + (refreshData.expiresIn * 1000)
          };
        } else {
          return NextResponse.json(
            { error: 'Authentication expired. Please reconnect to Jira.' },
            { status: 401 }
          );
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        return NextResponse.json(
          { error: 'Authentication expired. Please reconnect to Jira.' },
          { status: 401 }
        );
      }
    }

    // Use the cloud ID for Atlassian API if available
    const baseUrl = cloudId 
      ? `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
      : `https://${instanceUrl}/rest/api/3`;

    // Build the update payload
    const updateData: any = {
      fields: {}
    };

    if (title) {
      // Validate and truncate title to Jira's 255 character limit
      const maxTitleLength = 255;
      let validatedTitle = title;
      if (title.length > maxTitleLength) {
        validatedTitle = title.substring(0, maxTitleLength - 3) + '...'; // Leave space for ellipsis
      }
      updateData.fields.summary = validatedTitle;
    }

    if (description || acceptanceCriteria) {
      // Combine description and acceptance criteria
      let fullDescription = description || '';
      if (acceptanceCriteria) {
        if (fullDescription) fullDescription += '\n\n';
        fullDescription += '**Acceptance Criteria:**\n' + acceptanceCriteria;
      }

      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: fullDescription,
              },
            ],
          },
        ],
      };
    }

    // Make request to Jira API
    const response = await fetch(`${baseUrl}/issue/${ticketKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect to Jira.' },
          { status: 401 }
        );
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. Check your Jira permissions.' },
          { status: 403 }
        );
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Ticket not found. It may have been deleted.' },
          { status: 404 }
        );
      }
      
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const responseData: any = {
      success: true,
      message: 'Ticket updated successfully',
      ticketKey,
      url: `https://${instanceUrl}/browse/${ticketKey}`,
    };

    // Include token refresh data if token was refreshed
    if (tokenWasRefreshed && newTokenData) {
      responseData.tokenRefreshed = true;
      responseData.newAccessToken = newTokenData.accessToken;
      responseData.newRefreshToken = newTokenData.refreshToken;
      responseData.newTokenExpiry = newTokenData.tokenExpiry;
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error updating Jira ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket: ' + error.message },
      { status: 500 }
    );
  }
}