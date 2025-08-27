// TicketWizard Platform Manager ✨
// Central magical orchestrator for all platform integrations

import { 
  PlatformType, 
  PlatformService, 
  PlatformRegistry,
  PlatformTicket,
  PlatformProject,
  PlatformUser,
  PlatformSearchOptions,
  CreateTicketData,
  UpdateTicketData,
  PlatformConnection
} from './platformApi';

import { JiraService } from './platforms/jiraService';
import { TrelloService } from './platforms/trelloService';

// Platform manager singleton
export class PlatformManager {
  private static instance: PlatformManager;
  private activePlatform: PlatformType | null = null;

  private constructor() {
    this.initializePlatforms();
  }

  static getInstance(): PlatformManager {
    if (!PlatformManager.instance) {
      PlatformManager.instance = new PlatformManager();
    }
    return PlatformManager.instance;
  }

  private initializePlatforms() {
    // Register all available platform services
    PlatformRegistry.register('jira', new JiraService());
    PlatformRegistry.register('trello', new TrelloService());
    
    // TODO: Register GitHub and Linear when implemented
    // PlatformRegistry.register('github', new GitHubService());
    // PlatformRegistry.register('linear', new LinearService());

    // Set active platform based on what's connected
    this.detectActivePlatform();
  }

  private detectActivePlatform() {
    const connectedPlatforms = PlatformRegistry.getConnectedPlatforms();
    
    if (connectedPlatforms.length > 0) {
      // Use the first connected platform as active
      this.activePlatform = connectedPlatforms[0];
    } else {
      // Check for legacy Jira connection
      const jiraService = PlatformRegistry.get('jira');
      if (jiraService?.isConnected()) {
        this.activePlatform = 'jira';
      }
    }

    // Store active platform preference
    if (typeof window !== 'undefined' && this.activePlatform) {
      localStorage.setItem('ticketwizard-active-platform', this.activePlatform);
    }
  }

  // Public method to refresh active platform detection
  refreshActivePlatform() {
    this.detectActivePlatform();
  }

  // Platform Selection
  getActivePlatform(): PlatformType | null {
    return this.activePlatform;
  }

  setActivePlatform(platform: PlatformType): void {
    const service = PlatformRegistry.get(platform);
    if (!service) {
      throw new Error(`Platform ${platform} is not registered`);
    }

    if (!service.isConnected()) {
      throw new Error(`Platform ${platform} is not connected`);
    }

    this.activePlatform = platform;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('ticketwizard-active-platform', platform);
    }
  }

  getConnectedPlatforms(): PlatformType[] {
    return PlatformRegistry.getConnectedPlatforms();
  }

  getAllPlatforms(): PlatformType[] {
    return PlatformRegistry.getAllPlatforms();
  }

  getPlatformInfo(platform: PlatformType) {
    return PlatformRegistry.getPlatformInfo(platform);
  }

  // Connection Management
  isPlatformConnected(platform: PlatformType): boolean {
    const service = PlatformRegistry.get(platform);
    return service?.isConnected() || false;
  }

  async connectPlatform(platform: PlatformType, instanceUrl?: string): Promise<{ authUrl: string; state?: string }> {
    const service = PlatformRegistry.get(platform);
    if (!service) {
      throw new Error(`Platform ${platform} is not supported`);
    }

    return service.startOAuthFlow(instanceUrl);
  }

  async disconnectPlatform(platform: PlatformType): Promise<void> {
    const service = PlatformRegistry.get(platform);
    if (!service) {
      throw new Error(`Platform ${platform} is not supported`);
    }

    service.clearConnection();

    // If this was the active platform, switch to another connected one
    if (this.activePlatform === platform) {
      const connectedPlatforms = this.getConnectedPlatforms();
      this.activePlatform = connectedPlatforms.length > 0 ? connectedPlatforms[0] : null;
      
      if (typeof window !== 'undefined') {
        if (this.activePlatform) {
          localStorage.setItem('ticketwizard-active-platform', this.activePlatform);
        } else {
          localStorage.removeItem('ticketwizard-active-platform');
        }
      }
    }
  }

  // Data Operations with Active Platform
  async searchTickets(options?: PlatformSearchOptions): Promise<PlatformTicket[]> {
    const service = this.getActiveService();
    return service.searchTickets(options);
  }

  async getTicket(ticketKey: string): Promise<PlatformTicket> {
    const service = this.getActiveService();
    return service.getTicket(ticketKey);
  }

  async getProjects(): Promise<PlatformProject[]> {
    const service = this.getActiveService();
    return service.getProjects();
  }

  async getCurrentUser(): Promise<PlatformUser> {
    const service = this.getActiveService();
    return service.getCurrentUser();
  }

  async createTicket(projectKey: string, data: CreateTicketData): Promise<PlatformTicket> {
    const service = this.getActiveService();
    return service.createTicket(projectKey, data);
  }

  async updateTicket(ticketKey: string, data: UpdateTicketData): Promise<void> {
    const service = this.getActiveService();
    return service.updateTicket(ticketKey, data);
  }

  // Cross-Platform Operations
  async searchAllPlatforms(options?: PlatformSearchOptions): Promise<{
    platform: PlatformType;
    tickets: PlatformTicket[];
    error?: string;
  }[]> {
    const connectedPlatforms = this.getConnectedPlatforms();
    const results = await Promise.allSettled(
      connectedPlatforms.map(async (platform) => {
        const service = PlatformRegistry.get(platform)!;
        const tickets = await service.searchTickets(options);
        return { platform, tickets };
      })
    );

    return results.map((result, index) => {
      const platform = connectedPlatforms[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          platform,
          tickets: [],
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  async getAllProjects(): Promise<{
    platform: PlatformType;
    projects: PlatformProject[];
    error?: string;
  }[]> {
    const connectedPlatforms = this.getConnectedPlatforms();
    const results = await Promise.allSettled(
      connectedPlatforms.map(async (platform) => {
        const service = PlatformRegistry.get(platform)!;
        const projects = await service.getProjects();
        return { platform, projects };
      })
    );

    return results.map((result, index) => {
      const platform = connectedPlatforms[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          platform,
          projects: [],
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  // Platform-Specific Operations
  async searchTicketsOnPlatform(platform: PlatformType, options?: PlatformSearchOptions): Promise<PlatformTicket[]> {
    const service = PlatformRegistry.get(platform);
    if (!service) {
      throw new Error(`Platform ${platform} is not supported`);
    }
    if (!service.isConnected()) {
      throw new Error(`Platform ${platform} is not connected`);
    }

    return service.searchTickets(options);
  }

  async getProjectsFromPlatform(platform: PlatformType): Promise<PlatformProject[]> {
    const service = PlatformRegistry.get(platform);
    if (!service) {
      throw new Error(`Platform ${platform} is not supported`);
    }
    if (!service.isConnected()) {
      throw new Error(`Platform ${platform} is not connected`);
    }

    return service.getProjects();
  }

  // Migration and Import/Export
  async migrateTicket(ticket: PlatformTicket, targetPlatform: PlatformType, targetProjectKey: string): Promise<PlatformTicket> {
    if (ticket.platform === targetPlatform) {
      throw new Error('Cannot migrate ticket to the same platform');
    }

    const targetService = PlatformRegistry.get(targetPlatform);
    if (!targetService) {
      throw new Error(`Target platform ${targetPlatform} is not supported`);
    }
    if (!targetService.isConnected()) {
      throw new Error(`Target platform ${targetPlatform} is not connected`);
    }

    // Create ticket data from source ticket
    const createData: CreateTicketData = {
      title: ticket.title,
      description: `${ticket.description}\n\n---\n*Migrated from ${ticket.platform.toUpperCase()}: ${ticket.url}*`,
      type: ticket.type,
      priority: ticket.priority,
      labels: ticket.labels,
      projectKey: targetProjectKey
    };

    return targetService.createTicket(targetProjectKey, createData);
  }

  // Utility Methods
  getActiveService(): PlatformService {
    if (!this.activePlatform) {
      throw new Error('No platform is currently active. Please connect to a platform first.');
    }

    const service = PlatformRegistry.get(this.activePlatform);
    if (!service) {
      throw new Error(`Active platform ${this.activePlatform} service is not available`);
    }

    if (!service.isConnected()) {
      throw new Error(`Active platform ${this.activePlatform} is not connected`);
    }

    return service;
  }

  hasAnyConnection(): boolean {
    return this.getConnectedPlatforms().length > 0;
  }

  getConnectionStatus(): Record<PlatformType, boolean> {
    const allPlatforms = this.getAllPlatforms();
    const status: Record<PlatformType, boolean> = {} as any;

    for (const platform of allPlatforms) {
      status[platform] = this.isPlatformConnected(platform);
    }

    return status;
  }

  // Backward compatibility with legacy jiraApi
  getLegacyJiraConnection() {
    const jiraService = PlatformRegistry.get('jira');
    if (jiraService && jiraService.isConnected()) {
      return jiraService.loadConnection();
    }
    return null;
  }
}

// Export singleton instance
export const platformManager = PlatformManager.getInstance();

// Legacy compatibility exports
export const isAnyPlatformConnected = (): boolean => {
  return platformManager.hasAnyConnection();
};

export const getActiveConnection = () => {
  return platformManager.getLegacyJiraConnection();
};

// Modern exports for new code
export const useActivePlatform = () => {
  return {
    platform: platformManager.getActivePlatform(),
    isConnected: platformManager.getActivePlatform() ? platformManager.isPlatformConnected(platformManager.getActivePlatform()!) : false,
    service: platformManager.getActivePlatform() ? PlatformRegistry.get(platformManager.getActivePlatform()!) : null
  };
};

export const usePlatformConnections = () => {
  return {
    connected: platformManager.getConnectedPlatforms(),
    status: platformManager.getConnectionStatus(),
    hasAnyConnection: platformManager.hasAnyConnection()
  };
};