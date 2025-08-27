import { NextRequest, NextResponse } from 'next/server';

// API route to create new Jira tickets
export async function POST(request: NextRequest) {
  try {
    const { 
      projectKey,
      title,
      description,
      acceptanceCriteria,
      issueType = 'Task',
      priority = 'Medium'
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

    if (!instanceUrl || !accessToken || !projectKey || !title) {
      return NextResponse.json(
        { error: 'Instance URL, access token, project key, and title are required' },
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

    // Combine description and acceptance criteria
    let fullDescription = description || '';
    if (acceptanceCriteria) {
      if (fullDescription) fullDescription += '\n\n';
      fullDescription += '**Acceptance Criteria:**\n' + acceptanceCriteria;
    }

    // First, validate the project and issue type by getting create metadata
    const metadataResponse = await fetch(`${baseUrl}/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      return NextResponse.json(
        { error: `Failed to validate project: ${errorText}` },
        { status: 400 }
      );
    }

    const metadata = await metadataResponse.json();
    
    // Check if project exists
    if (!metadata.projects || metadata.projects.length === 0) {
      return NextResponse.json(
        { error: `Project with key "${projectKey}" not found or you don't have permission to create issues in it.` },
        { status: 400 }
      );
    }

    const project = metadata.projects[0];
    
    // Check if issue type exists in this project
    const availableIssueType = project.issuetypes?.find(
      (type: any) => type.name.toLowerCase() === issueType.toLowerCase()
    );
    
    if (!availableIssueType) {
      const availableTypes = project.issuetypes?.map((type: any) => type.name).join(', ') || 'none';
      return NextResponse.json(
        { error: `Issue type "${issueType}" not available in project "${projectKey}". Available types: ${availableTypes}` },
        { status: 400 }
      );
    }

    // Validate and truncate title to Jira's 255 character limit
    const maxTitleLength = 255;
    let validatedTitle = title;
    if (title && title.length > maxTitleLength) {
      validatedTitle = title.substring(0, maxTitleLength - 3) + '...'; // Leave space for ellipsis
    }

    // Build the create payload with validated data
    const createData = {
      fields: {
        project: { key: projectKey },
        summary: validatedTitle,
        description: {
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
        },
        issuetype: { id: availableIssueType.id }, // Use ID instead of name for better reliability
      },
    };

    // Only add priority if it's supported by this issue type
    const priorityField = availableIssueType.fields?.priority;
    if (priorityField && priority) {
      // Check if the priority value is valid
      const validPriority = priorityField.allowedValues?.find(
        (p: any) => p.name.toLowerCase() === priority.toLowerCase()
      );
      if (validPriority) {
        createData.fields.priority = { id: validPriority.id };
      }
    }

    // Make request to Jira API
    const response = await fetch(`${baseUrl}/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createData),
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
      if (response.status === 400) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: 'Invalid ticket data. Please check the project key and issue type.' },
          { status: 400 }
        );
      }
      
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const createdTicket = await response.json();

    const responseData: any = {
      success: true,
      message: 'Ticket created successfully',
      ticketKey: createdTicket.key,
      ticketId: createdTicket.id,
      url: `https://${instanceUrl}/browse/${createdTicket.key}`,
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
    console.error('Error creating Jira ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket: ' + error.message },
      { status: 500 }
    );
  }
}