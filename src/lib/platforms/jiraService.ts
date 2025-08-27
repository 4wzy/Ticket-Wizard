// TicketWizard Jira Platform Service ✨
// Refactored Jira integration using universal platform abstraction

import { 
  PlatformService, 
  PlatformConnection, 
  PlatformTicket, 
  PlatformProject, 
  PlatformUser,
  PlatformSearchOptions,
  CreateTicketData,
  UpdateTicketData,
  JiraCredentials
} from '../platformApi';

// Jira-specific connection interface
interface JiraConnection extends PlatformConnection {
  credentials?: JiraCredentials;
  cloudId?: string;
  siteName?: string;
}

export class JiraService extends PlatformService {
  private baseUrl: string = '';
  private accessToken: string = '';

  constructor() {
    super('jira');
    this.loadConnection();
  }

  // Connection Management
  loadConnection(): JiraConnection {
    if (typeof window === 'undefined') {
      return { platform: 'jira', isConnected: false };
    }

    const savedConnection = localStorage.getItem('jira-connection');
    if (!savedConnection) {
      return { platform: 'jira', isConnected: false };
    }

    try {
      const parsed = JSON.parse(savedConnection);
      // Convert legacy format to new format
      const connection: JiraConnection = {
        platform: 'jira',
        isConnected: parsed.isConnected || false,
        instanceUrl: parsed.instanceUrl,
        userEmail: parsed.userEmail,
        siteName: parsed.siteName,
        credentials: {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          tokenExpiry: parsed.tokenExpiry,
          cloudId: parsed.cloudId
        }
      };

      if (connection.isConnected && connection.instanceUrl && connection.credentials?.accessToken) {
        this.baseUrl = connection.credentials.cloudId 
          ? `https://api.atlassian.com/ex/jira/${connection.credentials.cloudId}/rest/api/3`
          : `https://${connection.instanceUrl}/rest/api/3`;
        this.accessToken = connection.credentials.accessToken;
      }

      return connection;
    } catch (error) {
      console.error('Error loading Jira connection:', error);
      return { platform: 'jira', isConnected: false };
    }
  }

  isConnected(): boolean {
    const connection = this.loadConnection();
    if (!connection.isConnected || !connection.credentials?.accessToken) {
      return false;
    }

    const isExpired = this.isTokenExpired();
    const hasValidRefreshToken = this.hasValidRefreshToken();
    
    return !isExpired || hasValidRefreshToken;
  }

  saveConnection(connection: JiraConnection): void {
    this.connection = connection;
    
    // Save in legacy format for backward compatibility
    if (typeof window !== 'undefined') {
      const legacyFormat = {
        instanceUrl: connection.instanceUrl,
        isConnected: connection.isConnected,
        accessToken: connection.credentials?.accessToken,
        refreshToken: connection.credentials?.refreshToken,
        tokenExpiry: connection.credentials?.tokenExpiry,
        userEmail: connection.userEmail,
        siteName: connection.siteName,
        cloudId: connection.credentials?.cloudId
      };
      localStorage.setItem('jira-connection', JSON.stringify(legacyFormat));
    }
  }

  clearConnection(): void {
    if (typeof window !== 'undefined') {
      const connection = this.loadConnection();
      const clearedConnection: JiraConnection = {
        platform: 'jira',
        instanceUrl: connection.instanceUrl, // Keep URL for convenience
        isConnected: false,
      };
      this.saveConnection(clearedConnection);
    }
    this.baseUrl = '';
    this.accessToken = '';
  }

  // Authentication
  async startOAuthFlow(instanceUrl?: string): Promise<{ authUrl: string; state?: string }> {
    const response = await fetch('/api/jira/auth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start OAuth flow');
    }

    return response.json();
  }

  async handleOAuthCallback(params: Record<string, string>): Promise<JiraConnection> {
    // OAuth callback is handled by the API route, this method would be used
    // if we needed client-side callback handling
    throw new Error('OAuth callback should be handled server-side');
  }

  async refreshTokenIfNeeded(): Promise<void> {
    if (!this.isTokenExpired()) return;

    const connection = this.loadConnection();
    const refreshToken = connection.credentials?.refreshToken;
    
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
      this.clearConnection();
      throw new Error('No valid refresh token available. Please reconnect to Jira.');
    }

    try {
      const response = await fetch('/api/jira/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearConnection();
        throw new Error('Failed to refresh token. Please reconnect to Jira.');
      }

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = await response.json();
      
      const updatedConnection: JiraConnection = {
        ...connection,
        credentials: {
          ...connection.credentials!,
          accessToken,
          refreshToken: newRefreshToken || refreshToken,
          tokenExpiry: Date.now() + (expiresIn * 1000),
        }
      };

      this.saveConnection(updatedConnection);
      this.accessToken = accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearConnection();
      throw new Error('Authentication expired. Please reconnect to Jira.');
    }
  }

  // Data Fetching
  async searchTickets(options: PlatformSearchOptions = {}): Promise<PlatformTicket[]> {
    await this.refreshTokenIfNeeded();

    const {
      searchType = 'recent',
      query = '',
      maxResults = 20,
      projectFilter = [],
      statusFilter = [],
      assigneeFilter = []
    } = options;

    // Build JQL query
    let conditions = [];
    
    if (projectFilter.length > 0) {
      conditions.push(`project IN (${projectFilter.join(',')})`);
    }
    
    if (statusFilter.length > 0) {
      const statusQuery = statusFilter.map(s => `"${s}"`).join(',');
      conditions.push(`status IN (${statusQuery})`);
    }
    
    if (assigneeFilter.length > 0) {
      if (assigneeFilter.includes('currentUser()')) {
        conditions.push('assignee = currentUser()');
      } else {
        const assigneeQuery = assigneeFilter.map(a => `"${a}"`).join(',');
        conditions.push(`assignee IN (${assigneeQuery})`);
      }
    }

    switch (searchType) {
      case 'recent':
        conditions.push('updated >= -30d');
        break;
      case 'assigned':
        if (!assigneeFilter.includes('currentUser()')) {
          conditions.push('assignee = currentUser()');
        }
        break;
      case 'search':
        if (query) {
          conditions.push(`text ~ "${query}"`);
        }
        break;
    }

    const jql = conditions.length > 0 
      ? conditions.join(' AND ') + ' ORDER BY updated DESC'
      : 'ORDER BY updated DESC';

    const response = await this.makeRequest<{
      issues: any[];
      total: number;
    }>(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=id,key,summary,description,issuetype,status,priority,assignee,reporter,project,parent,labels,components,updated,created`);

    return response.issues.map(issue => this.transformToUniversalFormat(issue)) as PlatformTicket[];
  }

  async getTicket(ticketKey: string): Promise<PlatformTicket> {
    await this.refreshTokenIfNeeded();
    
    const response = await this.makeRequest<any>(`/issue/${ticketKey}?fields=id,key,summary,description,issuetype,status,priority,assignee,reporter,project,parent,labels,components,updated,created`);
    return this.transformToUniversalFormat(response) as PlatformTicket;
  }

  async getProjects(): Promise<PlatformProject[]> {
    await this.refreshTokenIfNeeded();
    
    const response = await this.makeRequest<any[]>('/project');
    return response.map(project => this.transformToUniversalFormat(project)) as PlatformProject[];
  }

  async getCurrentUser(): Promise<PlatformUser> {
    await this.refreshTokenIfNeeded();
    
    const response = await this.makeRequest<any>('/myself');
    return this.transformToUniversalFormat(response) as PlatformUser;
  }

  // Data Manipulation
  async createTicket(projectKey: string, data: CreateTicketData): Promise<PlatformTicket> {
    await this.refreshTokenIfNeeded();

    // Get create metadata to validate project and issue type
    const metadata = await this.makeRequest<any>(`/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`);
    
    if (!metadata.projects || metadata.projects.length === 0) {
      throw new Error(`Project with key "${projectKey}" not found or you don't have permission to create issues in it.`);
    }

    const project = metadata.projects[0];
    const issueType = data.type || 'Task';
    
    const availableIssueType = project.issuetypes?.find(
      (type: any) => type.name.toLowerCase() === issueType.toLowerCase()
    );
    
    if (!availableIssueType) {
      const availableTypes = project.issuetypes?.map((type: any) => type.name).join(', ') || 'none';
      throw new Error(`Issue type "${issueType}" not available in project "${projectKey}". Available types: ${availableTypes}`);
    }

    const createData = {
      fields: {
        project: { key: projectKey },
        summary: data.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: data.description }],
            },
          ],
        },
        issuetype: { id: availableIssueType.id },
      },
    };

    // Add priority if supported
    const priorityField = availableIssueType.fields?.priority;
    if (priorityField && data.priority) {
      const validPriority = priorityField.allowedValues?.find(
        (p: any) => p.name.toLowerCase() === data.priority!.toLowerCase()
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

  async updateTicket(ticketKey: string, data: UpdateTicketData): Promise<void> {
    await this.refreshTokenIfNeeded();

    const updateData: any = { fields: {} };

    if (data.title) {
      updateData.fields.summary = data.title;
    }

    if (data.description) {
      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: data.description }],
          },
        ],
      };
    }

    await this.makeRequest(`/issue/${ticketKey}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Utility Methods
  async validateInstanceUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch('/api/jira/test-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceUrl: url }),
      });

      if (!response.ok) return false;
      
      const result = await response.json();
      return result.valid;
    } catch {
      return false;
    }
  }

  transformToUniversalFormat(jiraData: any): PlatformTicket | PlatformProject | PlatformUser {
    // Transform Jira issue to universal ticket
    if (jiraData.fields) {
      return {
        id: jiraData.id,
        key: jiraData.key,
        title: jiraData.fields.summary || '',
        description: this.extractTextFromDescription(jiraData.fields.description) || '',
        type: jiraData.fields.issuetype?.name || 'Task',
        status: jiraData.fields.status?.name || 'To Do',
        priority: jiraData.fields.priority?.name || 'Medium',
        assignee: jiraData.fields.assignee?.displayName,
        reporter: jiraData.fields.reporter?.displayName || 'Unknown',
        project: jiraData.fields.project?.name || '',
        projectKey: jiraData.fields.project?.key || '',
        epic: jiraData.fields.parent?.fields?.summary,
        labels: jiraData.fields.labels || [],
        components: (jiraData.fields.components || []).map((c: any) => c.name),
        lastModified: jiraData.fields.updated,
        created: jiraData.fields.created,
        url: `https://${this.connection.instanceUrl}/browse/${jiraData.key}`,
        platform: 'jira' as const,
        platformSpecific: {
          issueTypeId: jiraData.fields.issuetype?.id,
          statusId: jiraData.fields.status?.id,
          priorityId: jiraData.fields.priority?.id,
          instanceUrl: this.connection.instanceUrl
        }
      } as PlatformTicket;
    }

    // Transform Jira project
    if (jiraData.projectTypeKey !== undefined) {
      return {
        id: jiraData.id,
        key: jiraData.key,
        name: jiraData.name,
        platform: 'jira' as const,
        description: jiraData.description,
        avatarUrl: jiraData.avatarUrls?.['48x48'],
        platformSpecific: {
          projectTypeKey: jiraData.projectTypeKey,
          lead: jiraData.lead
        }
      } as PlatformProject;
    }

    // Transform Jira user
    if (jiraData.accountId) {
      return {
        id: jiraData.accountId,
        displayName: jiraData.displayName,
        email: jiraData.emailAddress,
        avatarUrl: jiraData.avatarUrls?.['48x48'],
        platform: 'jira' as const
      } as PlatformUser;
    }

    throw new Error('Unknown Jira data format');
  }

  // Private helper methods
  private isTokenExpired(): boolean {
    const connection = this.loadConnection();
    const tokenExpiry = connection.credentials?.tokenExpiry;
    
    if (!tokenExpiry) return false; // If no expiry set, assume valid
    return Date.now() >= tokenExpiry;
  }

  private hasValidRefreshToken(): boolean {
    const connection = this.loadConnection();
    const refreshToken = connection.credentials?.refreshToken;
    
    return !!(refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null');
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Jira. Please connect first.');
    }

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