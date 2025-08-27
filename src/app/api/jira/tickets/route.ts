import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// API route to fetch Jira tickets
export async function POST(request: NextRequest) {
  try {
    const { 
      searchType = 'recent', 
      query = '', 
      maxResults = 20 
    } = await request.json();

    // Get connection details from headers (passed by client)
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

    // Use the cloud ID for Atlassian API if available, otherwise fall back to instance URL
    const baseUrl = cloudId 
      ? `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
      : `https://${instanceUrl}/rest/api/3`;
    
    // Get user's selected projects for filtering
    const { user, error: authError } = await getAuthenticatedUser(request);
    let projectFilter = '';
    
    if (user) {
      // Get user's access token to maintain RLS context
      const authHeader = request.headers.get('Authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            }
          );

          const { data: permissions, error: permError } = await supabase
            .from('jira_project_permissions')
            .select('project_key')
            .eq('user_id', user.id)
            .eq('is_active', true);

          console.log('Project permissions query result:', { permissions, permError, userId: user.id });

          if (permissions && permissions.length > 0) {
            const projectKeys = permissions.map(p => p.project_key);
            console.log('Found project keys:', projectKeys);
            projectFilter = `project IN (${projectKeys.join(',')})`;
          } else {
            console.log('No project permissions found, showing all projects');
          }
        } catch (error) {
          console.warn('Error fetching project permissions, showing all projects:', error);
          // If the table doesn't exist, just continue without filtering
          if (error.message?.includes('jira_project_permissions')) {
            console.log('Project permissions table does not exist yet, skipping filter');
          }
        }
      }
    }
    
    // Build JQL query based on search type
    let baseCondition = '';
    let orderBy = 'ORDER BY updated DESC';
    
    switch (searchType) {
      case 'recent':
        baseCondition = 'updated >= -30d';
        break;
      case 'assigned':
        baseCondition = 'assignee = currentUser()';
        break;
      case 'search':
        if (query) {
          baseCondition = `text ~ "${query}"`;
        } else {
          baseCondition = '';
        }
        break;
      default:
        baseCondition = '';
    }

    // Combine project filter with base condition
    let conditions = [];
    if (projectFilter) {
      conditions.push(projectFilter);
    }
    if (baseCondition) {
      conditions.push(baseCondition);
    }

    // Build final JQL
    let jql = '';
    if (conditions.length > 0) {
      jql = conditions.join(' AND ') + ' ' + orderBy;
    } else {
      jql = orderBy;
    }

    // Debug: Log the final JQL query
    console.log('Final JQL query:', jql);
    console.log('Project filter:', projectFilter);
    console.log('Conditions:', conditions);

    const searchParams = new URLSearchParams({
      jql,
      maxResults: maxResults.toString(),
      fields: 'id,key,summary,description,issuetype,status,priority,assignee,reporter,project,parent,labels,components,updated,created',
    });

    // Make request to Jira API
    const response = await fetch(`${baseUrl}/search?${searchParams}`, {
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
      console.error('Jira API Error - JQL Query:', jql);
      console.error('Jira API Error - Response:', errorText);
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Transform Jira issues to our format
    const tickets = data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary || '',
      description: extractTextFromDescription(issue.fields.description) || '',
      type: issue.fields.issuetype?.name || 'Task',
      status: issue.fields.status?.name || 'To Do',
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      project: issue.fields.project?.name || '',
      projectKey: issue.fields.project?.key || '',
      epic: issue.fields.parent?.fields?.summary,
      labels: issue.fields.labels || [],
      components: (issue.fields.components || []).map((c: any) => c.name),
      lastModified: issue.fields.updated,
      created: issue.fields.created,
      url: `https://${instanceUrl}/browse/${issue.key}`,
    }));

    const responseData: any = {
      success: true,
      tickets,
      total: data.total,
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
    console.error('Error fetching Jira tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets: ' + error.message },
      { status: 500 }
    );
  }
}

// Extract plain text from Jira's Atlassian Document Format
function extractTextFromDescription(description: any): string {
  if (!description) return '';
  
  if (typeof description === 'string') return description;
  
  if (description.type === 'doc' && description.content) {
    return extractTextFromContent(description.content);
  }
  
  return '';
}

function extractTextFromContent(content: any[]): string {
  let text = '';
  
  for (const item of content) {
    if (item.type === 'paragraph' && item.content) {
      for (const subItem of item.content) {
        if (subItem.type === 'text' && subItem.text) {
          text += subItem.text;
        }
      }
      text += '\n';
    } else if (item.type === 'text' && item.text) {
      text += item.text;
    }
  }
  
  return text.trim();
}