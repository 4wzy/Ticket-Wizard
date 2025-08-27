// TicketWizard Universal Platform API
// Magical abstraction layer for all project management platforms ✨

export type PlatformType = 'jira' | 'trello' | 'github' | 'linear';

export interface PlatformTicket {
  id: string;
  key: string; // Unique identifier (e.g., PROJ-123, card short link, issue number)
  title: string;
  description: string;
  type: string; // Story, Task, Bug, etc.
  status: string; // To Do, In Progress, Done, etc.
  priority: string; // High, Medium, Low, etc.
  assignee?: string;
  reporter: string;
  project: string; // Project/Board name
  projectKey: string; // Project/Board key/id
  epic?: string; // Parent epic/card
  labels: string[];
  components: string[]; // Lists, milestones, etc.
  lastModified: string;
  created: string;
  url: string;
  platform: PlatformType;
  platformSpecific?: Record<string, any>; // Platform-specific data
}

export interface PlatformProject {
  id: string;
  key: string;
  name: string;
  platform: PlatformType;
  description?: string;
  avatarUrl?: string;
  platformSpecific?: Record<string, any>;
}

export interface PlatformUser {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  platform: PlatformType;
}

// Base connection interface
export interface BasePlatformConnection {
  platform: PlatformType;
  isConnected: boolean;
  instanceUrl?: string; // For self-hosted instances
  userEmail?: string;
  siteName?: string;
}

// Platform-specific credential types
export interface JiraCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  cloudId?: string;
}

export interface TrelloCredentials {
  apiKey: string;
  token: string;
  tokenExpiry?: number; // Trello tokens can expire
}

export interface GitHubCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  scope: string[];
}

export interface LinearCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

// Union type for all credentials
export type PlatformCredentials = JiraCredentials | TrelloCredentials | GitHubCredentials | LinearCredentials;

export interface PlatformConnection extends BasePlatformConnection {
  credentials?: PlatformCredentials;
}

// Search and filtering options
export interface PlatformSearchOptions {
  searchType?: 'recent' | 'assigned' | 'search' | 'all';
  query?: string;
  maxResults?: number;
  projectFilter?: string[];
  statusFilter?: string[];
  assigneeFilter?: string[];
}

// Create/Update ticket data
export interface CreateTicketData {
  title: string;
  description: string;
  type?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
  projectKey: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
}

// Abstract platform service interface
export abstract class PlatformService {
  protected platform: PlatformType;
  protected connection: PlatformConnection;

  constructor(platform: PlatformType) {
    this.platform = platform;
    this.connection = this.loadConnection();
  }

  // Connection management
  abstract loadConnection(): PlatformConnection;
  abstract isConnected(): boolean;
  abstract saveConnection(connection: PlatformConnection): void;
  abstract clearConnection(): void;

  // Authentication
  abstract startOAuthFlow(instanceUrl?: string): Promise<{ authUrl: string; state?: string }>;
  abstract handleOAuthCallback(params: Record<string, string>): Promise<PlatformConnection>;
  abstract refreshTokenIfNeeded(): Promise<void>;

  // Data fetching
  abstract searchTickets(options?: PlatformSearchOptions): Promise<PlatformTicket[]>;
  abstract getTicket(ticketKey: string): Promise<PlatformTicket>;
  abstract getProjects(): Promise<PlatformProject[]>;
  abstract getCurrentUser(): Promise<PlatformUser>;

  // Data manipulation
  abstract createTicket(projectKey: string, data: CreateTicketData): Promise<PlatformTicket>;
  abstract updateTicket(ticketKey: string, data: UpdateTicketData): Promise<void>;

  // Utility methods
  abstract validateInstanceUrl(url: string): Promise<boolean>;
  abstract transformToUniversalFormat(platformData: any): PlatformTicket | PlatformProject | PlatformUser;

  // Get platform display info
  getPlatformInfo() {
    const platformInfoMap = {
      jira: {
        name: 'Jira',
        icon: '🔷',
        color: 'blue',
        description: 'Atlassian Jira for agile project management'
      },
      trello: {
        name: 'Trello',
        icon: '📋',
        color: 'blue',
        description: 'Visual collaboration with Trello boards'
      },
      github: {
        name: 'GitHub',
        icon: '🐙',
        color: 'gray',
        description: 'GitHub Issues for development workflows'
      },
      linear: {
        name: 'Linear',
        icon: '📐',
        color: 'purple',
        description: 'Linear for modern issue tracking'
      }
    };

    return platformInfoMap[this.platform];
  }
}

// Platform registry for managing multiple services
export class PlatformRegistry {
  private static services = new Map<PlatformType, PlatformService>();
  
  static register(platform: PlatformType, service: PlatformService) {
    this.services.set(platform, service);
  }

  static get(platform: PlatformType): PlatformService | undefined {
    return this.services.get(platform);
  }

  static getConnectedPlatforms(): PlatformType[] {
    return Array.from(this.services.entries())
      .filter(([_, service]) => service.isConnected())
      .map(([platform, _]) => platform);
  }

  static getAllPlatforms(): PlatformType[] {
    return ['jira', 'trello', 'github', 'linear'];
  }

  static getPlatformInfo(platform: PlatformType) {
    const service = this.get(platform);
    return service?.getPlatformInfo();
  }
}

// Utility functions for cross-platform operations
export const platformUtils = {
  // Normalize ticket keys across platforms
  normalizeTicketKey: (key: string, platform: PlatformType): string => {
    switch (platform) {
      case 'jira':
        return key; // Already in PROJ-123 format
      case 'trello':
        return key.startsWith('#') ? key : `#${key}`; // Ensure # prefix
      case 'github':
        return key.startsWith('#') ? key : `#${key}`; // Issue numbers
      case 'linear':
        return key; // Already in proper format
      default:
        return key;
    }
  },

  // Get platform-specific URL patterns
  getTicketUrl: (ticket: PlatformTicket): string => {
    if (ticket.url) return ticket.url;
    
    // Fallback URL generation if not provided
    switch (ticket.platform) {
      case 'jira':
        return `https://${ticket.platformSpecific?.instanceUrl}/browse/${ticket.key}`;
      case 'trello':
        return `https://trello.com/c/${ticket.id}`;
      case 'github':
        return `https://github.com/${ticket.projectKey}/issues/${ticket.key.replace('#', '')}`;
      case 'linear':
        return `https://linear.app/issue/${ticket.key}`;
      default:
        return '#';
    }
  },

  // Determine if platform supports specific features
  platformFeatures: {
    jira: {
      supportsEpics: true,
      supportsComponents: true,
      supportsCustomFields: true,
      supportsTimeTracking: true,
      requiresInstanceUrl: true
    },
    trello: {
      supportsEpics: false,
      supportsComponents: true, // Lists
      supportsCustomFields: true,
      supportsTimeTracking: false,
      requiresInstanceUrl: false
    },
    github: {
      supportsEpics: false,
      supportsComponents: true, // Milestones
      supportsCustomFields: false,
      supportsTimeTracking: false,
      requiresInstanceUrl: false // Uses github.com
    },
    linear: {
      supportsEpics: true,
      supportsComponents: true,
      supportsCustomFields: true,
      supportsTimeTracking: true,
      requiresInstanceUrl: false
    }
  }
};