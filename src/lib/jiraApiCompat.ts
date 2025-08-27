// TicketWizard Jira API Compatibility Layer ✨
// Backward compatibility wrapper for existing Jira API usage

import { platformManager } from './platformManager';
import { PlatformRegistry } from './platformApi';
import type { PlatformTicket, PlatformProject, PlatformUser } from './platformApi';

// Legacy interfaces for backward compatibility
export interface JiraTicket extends Omit<PlatformTicket, 'platform'> {
  epic?: string;
  projectKey: string;
}

export interface JiraProject extends Omit<PlatformProject, 'platform'> {
  projectTypeKey?: string;
  avatarUrls?: {
    [size: string]: string;
  };
}

export interface JiraUser extends Omit<PlatformUser, 'platform'> {
  accountId: string;
  emailAddress?: string;
  avatarUrls?: {
    [size: string]: string;
  };
}

// Legacy connection interface
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
  private get jiraService() {
    const service = PlatformRegistry.get('jira');
    if (!service) {
      throw new Error('Jira service not available');
    }
    return service;
  }

  // Check if we have a valid connection
  public isConnected(): boolean {
    return this.jiraService.isConnected();
  }

  // Search for tickets using JQL
  public async searchTickets(jql: string = '', maxResults: number = 50): Promise<JiraTicket[]> {
    const tickets = await this.jiraService.searchTickets({
      searchType: 'search',
      query: jql,
      maxResults
    });

    return tickets.map(this.transformFromUniversal) as JiraTicket[];
  }

  // Get recent tickets
  public async getRecentTickets(maxResults: number = 20): Promise<JiraTicket[]> {
    const tickets = await this.jiraService.searchTickets({
      searchType: 'recent',
      maxResults
    });

    return tickets.map(this.transformFromUniversal) as JiraTicket[];
  }

  // Search tickets by text query
  public async searchTicketsByText(query: string, maxResults: number = 20): Promise<JiraTicket[]> {
    const tickets = await this.jiraService.searchTickets({
      searchType: 'search',
      query,
      maxResults
    });

    return tickets.map(this.transformFromUniversal) as JiraTicket[];
  }

  // Get tickets assigned to current user
  public async getMyTickets(maxResults: number = 20): Promise<JiraTicket[]> {
    const tickets = await this.jiraService.searchTickets({
      searchType: 'assigned',
      maxResults
    });

    return tickets.map(this.transformFromUniversal) as JiraTicket[];
  }

  // Get a specific ticket by key
  public async getTicket(ticketKey: string): Promise<JiraTicket> {
    const ticket = await this.jiraService.getTicket(ticketKey);
    return this.transformFromUniversal(ticket) as JiraTicket;
  }

  // Update a ticket
  public async updateTicket(ticketKey: string, update: {
    title?: string;
    description?: string;
  }): Promise<void> {
    await this.jiraService.updateTicket(ticketKey, update);
  }

  // Create a new ticket
  public async createTicket(projectKey: string, ticket: {
    title: string;
    description: string;
    type?: string;
    priority?: string;
  }): Promise<JiraTicket> {
    const newTicket = await this.jiraService.createTicket(projectKey, ticket);
    return this.transformFromUniversal(newTicket) as JiraTicket;
  }

  // Get available projects
  public async getProjects(): Promise<JiraProject[]> {
    const projects = await this.jiraService.getProjects();
    return projects.map(this.transformProjectFromUniversal) as JiraProject[];
  }

  // Get current user info
  public async getCurrentUser(): Promise<JiraUser> {
    const user = await this.jiraService.getCurrentUser();
    return this.transformUserFromUniversal(user) as JiraUser;
  }

  // Transform universal ticket to legacy format
  private transformFromUniversal = (ticket: PlatformTicket): JiraTicket => {
    return {
      id: ticket.id,
      key: ticket.key,
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignee,
      reporter: ticket.reporter,
      project: ticket.project,
      projectKey: ticket.projectKey,
      epic: ticket.epic,
      labels: ticket.labels,
      components: ticket.components,
      lastModified: ticket.lastModified,
      created: ticket.created,
      url: ticket.url
    };
  };

  // Transform universal project to legacy format
  private transformProjectFromUniversal = (project: PlatformProject): JiraProject => {
    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      projectTypeKey: project.platformSpecific?.projectTypeKey,
      avatarUrls: project.avatarUrl ? { '48x48': project.avatarUrl } : undefined
    };
  };

  // Transform universal user to legacy format
  private transformUserFromUniversal = (user: PlatformUser): JiraUser => {
    return {
      accountId: user.id,
      displayName: user.displayName,
      emailAddress: user.email,
      avatarUrls: user.avatarUrl ? { '48x48': user.avatarUrl } : undefined
    };
  };
}

// Export singleton instance for backward compatibility
export const jiraApi = new JiraApiService();

// Legacy utility functions
export const getJiraConnection = (): JiraConnection | null => {
  const service = PlatformRegistry.get('jira');
  if (!service) return null;

  const connection = service.loadConnection();
  if (!connection.isConnected) return null;

  // Convert to legacy format
  const jiraCredentials = connection.credentials as any;
  return {
    instanceUrl: connection.instanceUrl || '',
    isConnected: connection.isConnected,
    accessToken: jiraCredentials?.accessToken,
    refreshToken: jiraCredentials?.refreshToken,
    tokenExpiry: jiraCredentials?.tokenExpiry,
    userEmail: connection.userEmail,
    siteName: (connection as any).siteName,
    cloudId: jiraCredentials?.cloudId
  };
};

export const isJiraConnected = (): boolean => {
  return platformManager.isPlatformConnected('jira');
};

// Export types for backward compatibility
export type { JiraTicket, JiraProject, JiraUser, JiraConnection };