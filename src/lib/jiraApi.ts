// Jira API Service Layer
// Handles OAuth authentication and REST API calls to Jira Cloud

export interface JiraTicket {
  id: string;
  key: string;
  title: string;
  description: string;
  type: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Subtask';
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done' | string;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | string;
  assignee?: string;
  reporter: string;
  project: string;
  projectKey: string;
  epic?: string;
  labels: string[];
  components: string[];
  lastModified: string;
  created: string;
  url: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: {
    [size: string]: string;
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    [size: string]: string;
  };
}

interface JiraConnection {
  instanceUrl: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  userEmail?: string;
  siteName?: string;
  cloudId?: string;
}

class JiraApiService {
  private baseUrl: string = '';
  private accessToken: string = '';

  constructor() {
    this.loadConnection();
  }

  // Load connection details from localStorage
  private loadConnection(): void {
    if (typeof window === 'undefined') return; // Skip on server-side
    const savedConnection = localStorage.getItem('jira-connection');
    if (savedConnection) {
      try {
        const connection: JiraConnection = JSON.parse(savedConnection);
        if (connection.isConnected && connection.instanceUrl && connection.accessToken) {
          // Use cloud ID for Atlassian API if available
          this.baseUrl = connection.cloudId 
            ? `https://api.atlassian.com/ex/jira/${connection.cloudId}/rest/api/3`
            : `https://${connection.instanceUrl}/rest/api/3`;
          this.accessToken = connection.accessToken;
        }
      } catch (error) {
        console.error('Error loading Jira connection:', error);
      }
    }
  }

  // Check if we have a valid connection
  public isConnected(): boolean {
    if (typeof window === 'undefined') return false; // Skip on server-side
    const savedConnection = localStorage.getItem('jira-connection');
    if (!savedConnection) return false;

    try {
      const connection: JiraConnection = JSON.parse(savedConnection);
      const hasConnection = connection.isConnected && !!connection.accessToken;
      
      if (!hasConnection) return false;
      
      // If token is expired but we have a refresh token, consider it connected
      // (the refresh will happen automatically on next API call)
      const isExpired = this.isTokenExpired();
      const hasValidRefreshToken = this.hasValidRefreshToken();
      
      return hasConnection && (!isExpired || hasValidRefreshToken);
    } catch {
      return false;
    }
  }

  // Check if we have a valid refresh token
  private hasValidRefreshToken(): boolean {
    if (typeof window === 'undefined') return false;
    const savedConnection = localStorage.getItem('jira-connection');
    if (!savedConnection) return false;

    try {
      const connection: JiraConnection = JSON.parse(savedConnection);
      // Check if refresh token exists and is not "undefined" string
      return !!(connection.refreshToken && connection.refreshToken !== 'undefined' && connection.refreshToken !== 'null');
    } catch {
      return false;
    }
  }

  // Check if the token is expired
  private isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true; // Skip on server-side
    const savedConnection = localStorage.getItem('jira-connection');
    if (!savedConnection) return true;

    try {
      const connection: JiraConnection = JSON.parse(savedConnection);
      if (!connection.tokenExpiry) {
        return false; // If no expiry set, assume it's valid
      }
      return Date.now() >= connection.tokenExpiry;
    } catch {
      return true;
    }
  }

  // Refresh the access token if needed
  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.isTokenExpired()) return;

    if (typeof window === 'undefined') throw new Error('No Jira connection found');
    const savedConnection = localStorage.getItem('jira-connection');
    if (!savedConnection) throw new Error('No Jira connection found');

    const connection: JiraConnection = JSON.parse(savedConnection);
    
    // Check for valid refresh token (not "undefined" string or null)
    if (!connection.refreshToken || connection.refreshToken === 'undefined' || connection.refreshToken === 'null') {
      // Clear the connection and throw error
      this.clearConnection();
      throw new Error('No valid refresh token available. Please reconnect to Jira.');
    }

    try {
      const response = await fetch('/api/jira/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: connection.refreshToken }),
      });

      if (!response.ok) {
        // If refresh fails, clear the connection
        this.clearConnection();
        throw new Error('Failed to refresh token. Please reconnect to Jira.');
      }

      const { accessToken, refreshToken, expiresIn } = await response.json();
      
      const updatedConnection: JiraConnection = {
        ...connection,
        accessToken,
        refreshToken: refreshToken || connection.refreshToken, // Keep old refresh token if new one not provided
        tokenExpiry: Date.now() + (expiresIn * 1000),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('jira-connection', JSON.stringify(updatedConnection));
      }
      this.accessToken = accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearConnection();
      throw new Error('Authentication expired. Please reconnect to Jira.');
    }
  }

  // Clear connection data when refresh fails
  private clearConnection(): void {
    if (typeof window !== 'undefined') {
      const savedConnection = localStorage.getItem('jira-connection');
      if (savedConnection) {
        try {
          const connection: JiraConnection = JSON.parse(savedConnection);
          // Mark as disconnected but keep instance URL for convenience
          const clearedConnection: JiraConnection = {
            instanceUrl: connection.instanceUrl,
            isConnected: false,
          };
          localStorage.setItem('jira-connection', JSON.stringify(clearedConnection));
        } catch {
          localStorage.removeItem('jira-connection');
        }
      }
    }
    this.baseUrl = '';
    this.accessToken = '';
  }

  // Make authenticated request to Jira API
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Jira. Please connect first.');
    }

    await this.refreshTokenIfNeeded();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please reconnect to Jira.');
      }
      if (response.status === 403) {
        throw new Error('Permission denied. Check your Jira permissions.');
      }
      
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // Search for tickets using JQL
  public async searchTickets(jql: string = '', maxResults: number = 50): Promise<JiraTicket[]> {
    const searchParams = new URLSearchParams({
      jql: jql || 'ORDER BY updated DESC',
      maxResults: maxResults.toString(),
      fields: 'id,key,summary,description,issuetype,status,priority,assignee,reporter,project,parent,labels,components,updated,created',
    });

    const response = await this.makeRequest<{
      issues: any[];
      total: number;
    }>(`/search?${searchParams}`);

    return response.issues.map(this.transformJiraIssue);
  }

  // Get recent tickets (last 30 days, updated recently)
  public async getRecentTickets(maxResults: number = 20): Promise<JiraTicket[]> {
    const jql = 'updated >= -30d ORDER BY updated DESC';
    return this.searchTickets(jql, maxResults);
  }

  // Search tickets by text query
  public async searchTicketsByText(query: string, maxResults: number = 20): Promise<JiraTicket[]> {
    const jql = `text ~ "${query}" ORDER BY updated DESC`;
    return this.searchTickets(jql, maxResults);
  }

  // Get tickets assigned to current user
  public async getMyTickets(maxResults: number = 20): Promise<JiraTicket[]> {
    const jql = 'assignee = currentUser() ORDER BY updated DESC';
    return this.searchTickets(jql, maxResults);
  }

  // Get a specific ticket by key
  public async getTicket(ticketKey: string): Promise<JiraTicket> {
    const response = await this.makeRequest<any>(`/issue/${ticketKey}?fields=id,key,summary,description,issuetype,status,priority,assignee,reporter,project,parent,labels,components,updated,created`);
    return this.transformJiraIssue(response);
  }

  // Update a ticket
  public async updateTicket(ticketKey: string, update: {
    title?: string;
    description?: string;
    // Add other fields as needed
  }): Promise<void> {
    const updateData: any = {
      fields: {},
    };

    if (update.title) {
      updateData.fields.summary = update.title;
    }

    if (update.description) {
      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: update.description,
              },
            ],
          },
        ],
      };
    }

    await this.makeRequest(`/issue/${ticketKey}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Create a new ticket
  public async createTicket(projectKey: string, ticket: {
    title: string;
    description: string;
    type?: string;
    priority?: string;
  }): Promise<JiraTicket> {
    // First, validate the project and issue type by getting create metadata
    const metadata = await this.makeRequest<any>(`/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`);
    
    // Check if project exists
    if (!metadata.projects || metadata.projects.length === 0) {
      throw new Error(`Project with key "${projectKey}" not found or you don't have permission to create issues in it.`);
    }

    const project = metadata.projects[0];
    const issueType = ticket.type || 'Task';
    
    // Check if issue type exists in this project
    const availableIssueType = project.issuetypes?.find(
      (type: any) => type.name.toLowerCase() === issueType.toLowerCase()
    );
    
    if (!availableIssueType) {
      const availableTypes = project.issuetypes?.map((type: any) => type.name).join(', ') || 'none';
      throw new Error(`Issue type "${issueType}" not available in project "${projectKey}". Available types: ${availableTypes}`);
    }

    // Build the create payload with validated data
    const createData = {
      fields: {
        project: { key: projectKey },
        summary: ticket.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticket.description,
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
    if (priorityField && ticket.priority) {
      // Check if the priority value is valid
      const validPriority = priorityField.allowedValues?.find(
        (p: any) => p.name.toLowerCase() === ticket.priority!.toLowerCase()
      );
      if (validPriority) {
        createData.fields.priority = { id: validPriority.id };
      }
    }

    const response = await this.makeRequest<{ key: string }>('/issue', {
      method: 'POST',
      body: JSON.stringify(createData),
    });

    return this.getTicket(response.key);
  }

  // Get available projects
  public async getProjects(): Promise<JiraProject[]> {
    const response = await this.makeRequest<any[]>('/project');
    return response.map(project => ({
      id: project.id,
      key: project.key,
      name: project.name,
      projectTypeKey: project.projectTypeKey,
      avatarUrls: project.avatarUrls,
    }));
  }

  // Get current user info
  public async getCurrentUser(): Promise<JiraUser> {
    const response = await this.makeRequest<any>('/myself');
    return {
      accountId: response.accountId,
      displayName: response.displayName,
      emailAddress: response.emailAddress,
      avatarUrls: response.avatarUrls,
    };
  }

  // Transform Jira API response to our JiraTicket interface
  private transformJiraIssue = (issue: any): JiraTicket => {
    return {
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary || '',
      description: this.extractTextFromDescription(issue.fields.description) || '',
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
      url: `https://${this.baseUrl.replace('/rest/api/3', '')}/browse/${issue.key}`,
    };
  };

  // Extract plain text from Jira's Atlassian Document Format
  private extractTextFromDescription(description: any): string {
    if (!description) return '';
    
    if (typeof description === 'string') return description;
    
    if (description.type === 'doc' && description.content) {
      return this.extractTextFromContent(description.content);
    }
    
    return '';
  }

  private extractTextFromContent(content: any[]): string {
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
}

// Export singleton instance
export const jiraApi = new JiraApiService();

// Export utility functions
export const getJiraConnection = (): JiraConnection | null => {
  if (typeof window === 'undefined') return null; // Skip on server-side
  const saved = localStorage.getItem('jira-connection');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

export const isJiraConnected = (): boolean => {
  return jiraApi.isConnected();
};