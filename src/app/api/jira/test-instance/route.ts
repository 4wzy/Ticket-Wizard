import { NextRequest, NextResponse } from 'next/server';

// Test if a Jira instance URL is valid
export async function POST(request: NextRequest) {
  try {
    const { instanceUrl } = await request.json();

    if (!instanceUrl) {
      return NextResponse.json(
        { error: 'Instance URL is required' },
        { status: 400 }
      );
    }

    // Normalize the URL
    let normalizedUrl = instanceUrl.replace(/^https?:\/\//, '');
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    // Test if the instance exists by checking the Atlassian API
    const testUrl = `https://${normalizedUrl}`;
    
    try {
      // Try to access the Jira instance info endpoint
      const response = await fetch(`${testUrl}/rest/api/3/serverInfo`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Don't follow redirects to detect invalid instances
        redirect: 'manual',
      });

      // For Jira Cloud, we expect either:
      // - 200 OK (if accessible without auth)
      // - 401 Unauthorized (if auth is required, but instance exists)
      // - 403 Forbidden (if auth is required, but instance exists)
      const isValid = response.status === 200 || 
                     response.status === 401 || 
                     response.status === 403;

      if (isValid) {
        return NextResponse.json({ 
          valid: true, 
          instanceUrl: normalizedUrl,
          message: 'Jira instance found and accessible'
        });
      } else {
        return NextResponse.json({ 
          valid: false, 
          error: 'Invalid Jira instance URL or instance not accessible'
        });
      }
    } catch (fetchError: any) {
      // Network errors, DNS resolution failures, etc.
      console.error('Error testing Jira instance:', fetchError);
      
      // Check if it's a network/DNS error
      if (fetchError.code === 'ENOTFOUND' || 
          fetchError.code === 'ECONNREFUSED' ||
          fetchError.message?.includes('fetch failed')) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Could not connect to the Jira instance. Please check the URL.'
        });
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error in test-instance API:', error);
    return NextResponse.json(
      { error: 'Failed to test Jira instance: ' + error.message },
      { status: 500 }
    );
  }
}