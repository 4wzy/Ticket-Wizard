// TicketWizard Trello Platform Service ✨
// Magical Trello integration with OAuth 1.0a authentication

import { 
  PlatformService, 
  PlatformConnection, 
  PlatformTicket, 
  PlatformProject, 
  PlatformUser,
  PlatformSearchOptions,
  CreateTicketData,
  UpdateTicketData,
  TrelloCredentials
} from '../platformApi';

// Trello-specific connection interface
interface TrelloConnection extends PlatformConnection {
  credentials?: TrelloCredentials;
  userName?: string;
  selectedBoardIds?: string[]; // User-selected boards for selective access
  allBoardsCache?: any[]; // Cache of all user boards for selection UI
}

export class TrelloService extends PlatformService {
  private apiKey: string = '';
  private token: string = '';
  private baseUrl = 'https://api.trello.com/1';

  constructor() {
    super('trello');
    this.loadConnection();
  }

  // Connection Management
  loadConnection(): TrelloConnection {
    if (typeof window === 'undefined') {
      return { platform: 'trello', isConnected: false };
    }

    const savedConnection = localStorage.getItem('trello-connection');
    if (!savedConnection) {
      return { platform: 'trello', isConnected: false };
    }

    try {
      const connection: TrelloConnection = JSON.parse(savedConnection);
      
      if (connection.isConnected && connection.credentials?.apiKey && connection.credentials?.token) {
        this.apiKey = connection.credentials.apiKey;
        this.token = connection.credentials.token;
      }

      return connection;
    } catch (error) {
      console.error('Error loading Trello connection:', error);
      return { platform: 'trello', isConnected: false };
    }
  }

  isConnected(): boolean {
    const connection = this.loadConnection();
    
    if (!connection.isConnected || !connection.credentials?.apiKey || !connection.credentials?.token) {
      return false;
    }

    // Check if token is expired (if expiry is set)
    const tokenExpiry = connection.credentials.tokenExpiry;
    if (tokenExpiry && Date.now() >= tokenExpiry) {
      return false;
    }

    return true;
  }

  saveConnection(connection: TrelloConnection): void {
    this.connection = connection;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('trello-connection', JSON.stringify(connection));
    }

    if (connection.credentials?.apiKey && connection.credentials?.token) {
      this.apiKey = connection.credentials.apiKey;
      this.token = connection.credentials.token;
    }
  }

  clearConnection(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trello-connection');
    }
    
    this.connection = { platform: 'trello', isConnected: false };
    this.apiKey = '';
    this.token = '';
  }

  // Authentication
  async startOAuthFlow(): Promise<{ authUrl: string; state?: string }> {
    const response = await fetch('/api/trello/auth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start Trello OAuth flow');
    }

    return response.json();
  }

  async handleOAuthCallback(params: Record<string, string>): Promise<TrelloConnection> {
    const { oauth_token, oauth_verifier } = params;
    
    if (!oauth_token || !oauth_verifier) {
      throw new Error('Missing OAuth parameters');
    }

    const response = await fetch('/api/trello/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oauth_token, oauth_verifier }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete Trello OAuth');
    }

    const tokenData = await response.json();
    
    const connection: TrelloConnection = {
      platform: 'trello',
      isConnected: true,
      credentials: {
        apiKey: tokenData.apiKey,
        token: tokenData.token,
        tokenExpiry: tokenData.tokenExpiry
      },
      userEmail: tokenData.userEmail,
      userName: tokenData.userName
    };

    this.saveConnection(connection);
    return connection;
  }

  async refreshTokenIfNeeded(): Promise<void> {
    // Trello tokens can be long-lived or permanent, but if they expire
    // we would need to re-authenticate
    const connection = this.loadConnection();
    const tokenExpiry = connection.credentials?.tokenExpiry;
    
    if (tokenExpiry && Date.now() >= tokenExpiry) {
      this.clearConnection();
      throw new Error('Trello token expired. Please reconnect to Trello.');
    }
  }

  // Data Fetching
  async searchTickets(options: PlatformSearchOptions = {}): Promise<PlatformTicket[]> {
    await this.refreshTokenIfNeeded();

    const {
      searchType = 'recent',
      query = '',
      maxResults = 20,
      projectFilter = [], // Board IDs
      statusFilter = [] // List names
    } = options;

    let allCards: any[] = [];

    // Get cards from specific boards or all boards
    if (projectFilter.length > 0) {
      for (const boardId of projectFilter) {
        const cards = await this.getCardsFromBoard(boardId);
        allCards.push(...cards);
      }
    } else {
      // Get cards from all user's boards
      const boards = await this.getUserBoards();
      for (const board of boards.slice(0, 10)) { // Limit to first 10 boards to avoid rate limits
        try {
          const cards = await this.getCardsFromBoard(board.id);
          allCards.push(...cards);
        } catch (error) {
          console.warn(`Failed to fetch cards from board ${board.name}:`, error);
        }
      }
    }

    // Filter cards based on search criteria
    let filteredCards = allCards;

    if (statusFilter.length > 0) {
      filteredCards = filteredCards.filter(card => 
        statusFilter.some(status => 
          card.list?.name?.toLowerCase().includes(status.toLowerCase())
        )
      );
    }

    if (searchType === 'search' && query) {
      const searchQuery = query.toLowerCase();
      filteredCards = filteredCards.filter(card =>
        card.name?.toLowerCase().includes(searchQuery) ||
        card.desc?.toLowerCase().includes(searchQuery)
      );
    } else if (searchType === 'assigned') {
      // Get current user and filter by assignments
      try {
        const currentUser = await this.getCurrentUser();
        filteredCards = filteredCards.filter(card =>
          card.idMembers?.includes(currentUser.id)
        );
      } catch (error) {
        console.warn('Could not filter by assigned cards:', error);
      }
    }

    // Sort by date modified (recent first)
    filteredCards.sort((a, b) => 
      new Date(b.dateLastActivity || b.date).getTime() - 
      new Date(a.dateLastActivity || a.date).getTime()
    );

    // Limit results
    filteredCards = filteredCards.slice(0, maxResults);

    return filteredCards.map(card => this.transformToUniversalFormat(card)) as PlatformTicket[];
  }

  async getTicket(ticketKey: string): Promise<PlatformTicket> {
    await this.refreshTokenIfNeeded();
    
    // Trello ticket key is the card ID or short link
    const cardId = ticketKey.startsWith('#') ? ticketKey.substring(1) : ticketKey;
    
    const response = await this.makeRequest<any>(`/cards/${cardId}?fields=all&members=true&list=true&board=true&labels=true`);
    return this.transformToUniversalFormat(response) as PlatformTicket;
  }

  async getProjects(): Promise<PlatformProject[]> {
    await this.refreshTokenIfNeeded();
    
    const boards = await this.getUserBoards();
    return boards.map(board => this.transformToUniversalFormat(board)) as PlatformProject[];
  }

  async getCurrentUser(): Promise<PlatformUser> {
    await this.refreshTokenIfNeeded();
    
    const response = await this.makeRequest<any>('/members/me?fields=id,username,fullName,email,avatarUrl');
    return this.transformToUniversalFormat(response) as PlatformUser;
  }

  // Data Manipulation
  async createTicket(projectKey: string, data: CreateTicketData): Promise<PlatformTicket> {
    await this.refreshTokenIfNeeded();

    // Get board lists to determine where to create the card
    const lists = await this.makeRequest<any[]>(`/boards/${projectKey}/lists`);
    
    if (lists.length === 0) {
      throw new Error(`No lists found in board ${projectKey}`);
    }

    // Use the first list or find a "To Do" type list
    let targetList = lists[0];
    const todoList = lists.find(list => 
      list.name.toLowerCase().includes('to do') || 
      list.name.toLowerCase().includes('todo') ||
      list.name.toLowerCase().includes('backlog')
    );
    if (todoList) {
      targetList = todoList;
    }

    const cardData = {
      name: data.title,
      desc: data.description,
      idList: targetList.id,
      pos: 'top'
    };

    const response = await this.makeRequest<any>('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });

    return this.transformToUniversalFormat(response) as PlatformTicket;
  }

  async updateTicket(ticketKey: string, data: UpdateTicketData): Promise<void> {
    await this.refreshTokenIfNeeded();

    const cardId = ticketKey.startsWith('#') ? ticketKey.substring(1) : ticketKey;
    const updateData: any = {};

    if (data.title) {
      updateData.name = data.title;
    }

    if (data.description) {
      updateData.desc = data.description;
    }

    if (data.status) {
      // To change status, we need to move the card to a different list
      // This requires knowing the board structure
      const card = await this.makeRequest<any>(`/cards/${cardId}?fields=idBoard`);
      const lists = await this.makeRequest<any[]>(`/boards/${card.idBoard}/lists`);
      
      const targetList = lists.find(list => 
        list.name.toLowerCase().includes(data.status!.toLowerCase())
      );
      
      if (targetList) {
        updateData.idList = targetList.id;
      }
    }

    await this.makeRequest(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Utility Methods
  async validateInstanceUrl(): Promise<boolean> {
    // Trello doesn't use instance URLs - it's always api.trello.com
    return true;
  }

  transformToUniversalFormat(trelloData: any): PlatformTicket | PlatformProject | PlatformUser {
    // Transform Trello card to universal ticket
    if (trelloData.idList !== undefined) {
      return {
        id: trelloData.id,
        key: trelloData.shortLink || trelloData.id,
        title: trelloData.name || '',
        description: trelloData.desc || '',
        type: 'Card', // Trello doesn't have issue types
        status: trelloData.list?.name || 'Unknown',
        priority: this.getPriorityFromLabels(trelloData.labels),
        assignee: trelloData.members?.[0]?.fullName,
        reporter: 'Unknown', // Trello doesn't track reporters
        project: trelloData.board?.name || '',
        projectKey: trelloData.board?.id || trelloData.idBoard || '',
        labels: (trelloData.labels || []).map((label: any) => label.name).filter(Boolean),
        components: [trelloData.list?.name].filter(Boolean),
        lastModified: trelloData.dateLastActivity || trelloData.date || new Date().toISOString(),
        created: trelloData.date || new Date().toISOString(),
        url: trelloData.url || `https://trello.com/c/${trelloData.shortLink}`,
        platform: 'trello' as const,
        platformSpecific: {
          shortLink: trelloData.shortLink,
          idBoard: trelloData.idBoard,
          idList: trelloData.idList,
          pos: trelloData.pos,
          closed: trelloData.closed,
          members: trelloData.members,
          checklists: trelloData.checklists
        }
      } as PlatformTicket;
    }

    // Transform Trello board to universal project
    if (trelloData.name && (trelloData.id || trelloData.url?.includes('trello.com/b/'))) {
      return {
        id: trelloData.id,
        key: trelloData.id,
        name: trelloData.name,
        platform: 'trello' as const,
        description: trelloData.desc || trelloData.description,
        avatarUrl: trelloData.prefs?.backgroundImage,
        platformSpecific: {
          shortLink: trelloData.shortLink,
          closed: trelloData.closed,
          prefs: trelloData.prefs,
          organization: trelloData.idOrganization
        }
      } as PlatformProject;
    }

    // Transform Trello member to universal user
    if (trelloData.username !== undefined) {
      return {
        id: trelloData.id,
        displayName: trelloData.fullName || trelloData.username,
        email: trelloData.email,
        avatarUrl: trelloData.avatarUrl,
        platform: 'trello' as const
      } as PlatformUser;
    }

    throw new Error('Unknown Trello data format');
  }

  // Private helper methods
  private async getUserBoards(): Promise<any[]> {
    const connection = this.loadConnection() as TrelloConnection;
    const selectedBoardIds = connection.selectedBoardIds;
    
    // If no boards selected yet, return all boards (for initial setup)
    if (!selectedBoardIds || selectedBoardIds.length === 0) {
      return this.getAllUserBoards();
    }
    
    // Get all boards and filter to only selected ones
    const allBoards = await this.getAllUserBoards();
    return allBoards.filter(board => selectedBoardIds.includes(board.id));
  }

  // Public method to get all boards for selection UI
  async getAllUserBoards(): Promise<any[]> {
    try {
      const boards = await this.makeRequest<any[]>('/members/me/boards?fields=id,name,desc,shortLink,url,prefs,closed,memberships&filter=open');
      
      // Cache the boards in connection for offline access
      const connection = this.loadConnection() as TrelloConnection;
      connection.allBoardsCache = boards;
      this.saveConnection(connection);
      
      return boards;
    } catch (error) {
      // Fallback to cached boards if API call fails
      const connection = this.loadConnection() as TrelloConnection;
      return connection.allBoardsCache || [];
    }
  }

  // Public method to update selected boards
  updateSelectedBoards(boardIds: string[]): void {
    const connection = this.loadConnection() as TrelloConnection;
    connection.selectedBoardIds = boardIds;
    this.saveConnection(connection);
  }

  // Public method to get selected board IDs
  getSelectedBoardIds(): string[] {
    const connection = this.loadConnection() as TrelloConnection;
    return connection.selectedBoardIds || [];
  }

  // Check if board selection is needed (no boards selected yet)
  needsBoardSelection(): boolean {
    const connection = this.loadConnection() as TrelloConnection;
    return connection.isConnected && (!connection.selectedBoardIds || connection.selectedBoardIds.length === 0);
  }

  private async getCardsFromBoard(boardId: string): Promise<any[]> {
    return this.makeRequest<any[]>(`/boards/${boardId}/cards?fields=all&members=true&list=true&board=true&labels=true`);
  }

  private getPriorityFromLabels(labels: any[]): string {
    if (!labels || labels.length === 0) return 'Medium';
    
    const priorityLabels = ['critical', 'high', 'urgent', 'important', 'low', 'minor'];
    
    for (const label of labels) {
      const labelName = label.name?.toLowerCase() || '';
      if (labelName.includes('critical') || labelName.includes('urgent')) return 'Highest';
      if (labelName.includes('high') || labelName.includes('important')) return 'High';
      if (labelName.includes('low') || labelName.includes('minor')) return 'Low';
    }
    
    return 'Medium';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Trello. Please connect first.');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('token', this.token);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please reconnect to Trello.');
      }
      if (response.status === 403) {
        throw new Error('Permission denied. Check your Trello permissions.');
      }
      
      const errorText = await response.text();
      throw new Error(`Trello API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
}