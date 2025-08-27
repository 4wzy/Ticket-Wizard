import { NextRequest, NextResponse } from 'next/server';

// API route to fetch Jira projects
export async function GET(request: NextRequest) {
  try {
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

    if (!instanceUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Instance URL and access token are required' },
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

    // Make request to Jira API
    const response = await fetch(`${baseUrl}/project`, {
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Accept': 'application/json',
      },
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
      
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const projects = await response.json();

    // Transform projects to our format
    const transformedProjects = projects.map((project: any) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      projectTypeKey: project.projectTypeKey,
      avatarUrls: project.avatarUrls,
    }));

    const responseData: any = {
      success: true,
      projects: transformedProjects,
    };

    // Include token refresh data if token was refreshed
    if (tokenWasRefreshed && newTokenData) {
      responseData.tokenRefreshed = true;
      responseData.newAccessToken = newTokenData.accessToken;
      responseData.newRefreshToken = newTokenData.refreshToken;
      responseData.newTokenExpiry = newTokenData.newTokenExpiry;
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetching Jira projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects: ' + error.message },
      { status: 500 }
    );
  }
}