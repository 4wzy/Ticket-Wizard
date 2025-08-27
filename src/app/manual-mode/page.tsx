"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import NavHelper from '@/app/components/NavHelper';
import UnifiedTicketPanel, { UnifiedTicketPanelRef } from '@/app/components/UnifiedTicketPanel';
import CursorEffects from '@/app/components/CursorEffects';
import TemplateSelection from '@/app/components/TemplateSelection';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { ChatBubbleLeftIcon, DocumentTextIcon, PlusIcon, CursorArrowRaysIcon, UserGroupIcon, ChevronDownIcon, InformationCircleIcon, XMarkIcon, MagnifyingGlassIcon, ClockIcon, StarIcon, PuzzlePieceIcon, ExclamationTriangleIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { Template } from '@/lib/templatesData';
import { convertFilesToBase64 } from '@/lib/fileHelpers';
import { platformManager, usePlatformConnections } from '@/lib/platformManager';
import { PlatformType, PlatformTicket } from '@/lib/platformApi';
// Backward compatibility
import { jiraApi, isJiraConnected, getJiraConnection } from '@/lib/jiraApiCompat';
import { authenticatedFetch } from '@/lib/api-client';
import { getUserSelectedModel } from '@/lib/ai-config';

// Project context interface
interface ProjectContext {
  id: string;
  name: string;
  description: string;
  abbreviations: Record<string, string>;
  terminology: Record<string, string>;
  projectInfo: string;
  standards: string;
  createdAt: string;
  updatedAt: string;
}

// Use universal platform ticket interface
interface Ticket extends PlatformTicket {
  // Add any manual-mode specific properties if needed
}

// Mock data for fallback when no platform is connected
const mockTickets: Ticket[] = [
  {
    id: '1',
    key: 'DEMO-101',
    title: 'Connect to a platform to see real tickets',
    description: 'This is a demo ticket. Connect your Jira or Trello account in Settings to see your real tickets.',
    type: 'Story',
    status: 'To Do',
    priority: 'High',
    assignee: 'Demo User',
    reporter: 'Demo User',
    project: 'Demo Project',
    projectKey: 'DEMO',
    epic: 'Demo Epic',
    labels: ['demo'],
    components: ['Demo'],
    lastModified: new Date().toISOString(),
    created: new Date().toISOString(),
    url: '#',
    platform: 'jira'
  }
];

export default function ManualMode() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { user, userProfile, loading } = useAuth();
  
  // Configuration state
  const [config, setConfig] = useState({
    cursorEffects: true
  });

  // Project context state
  const [projectContexts, setProjectContexts] = useState<ProjectContext[]>([]);
  const [selectedProjectContextId, setSelectedProjectContextId] = useState<string | null>(null);
  const [selectedProjectContext, setSelectedProjectContext] = useState<ProjectContext | null>(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState<boolean>(false);
  const [showTeamInfoPopup, setShowTeamInfoPopup] = useState<boolean>(false);

  // State for project selection
  const [selectedEpic, setSelectedEpic] = useState<string>('');
  const [selectedStory, setSelectedStory] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  
  // Enhanced Jira selection state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [projectContextSearchQuery, setProjectContextSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketSearch, setShowTicketSearch] = useState<boolean>(false);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [favoriteTickets, setFavoriteTickets] = useState<string[]>([]);
  
  // Platform connection state
  const [platformConnected, setPlatformConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [allTickets, setAllTickets] = useState<Ticket[]>(mockTickets);
  const [currentPlatform, setCurrentPlatform] = useState<PlatformType | null>(null);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  // Modal dialog states for compact UI
  const [showTicketModal, setShowTicketModal] = useState<boolean>(false);
  const [showProjectContextModal, setShowProjectContextModal] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filteredProjectContexts, setFilteredProjectContexts] = useState<ProjectContext[]>([]);
  
  // State for chat functionality
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{role: string, text: string, sections?: string[]}[]>([
    {role: 'assistant', text: 'Hello! I\'m your TicketWizard assistant. How can I help with your tickets today?'}
  ]);
  
  // State for ticket details
  const [ticketMode, setTicketMode] = useState<'edit' | 'create'>('edit');
  const [ticketData, setTicketData] = useState<{
    title: string;
    description: string;
    acceptanceCriteria: string;
  } | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(0);
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined); // Added state for active template ID
  
  // Template selection handler
  const handleTemplateSelect = (template: any) => {
    console.log('Template selected in manual mode:', template);
    setActiveTemplateId(template.id);
    
    // Switch to create mode first
    setTicketMode('create');
    
    // Apply the template structure to the form fields if structure exists
    if (template.structure) {
      console.log('Applying template structure:', template.structure);
      
      // Create ticket data from template
      const templateTicketData = {
        title: template.structure.titleFormat || '',
        description: template.structure.descriptionFormat || '',
        acceptanceCriteria: template.structure.acceptanceCriteriaFormat || '',
        priority: 'Medium',
        assignee: '',
        labels: [],
        components: [],
        epic: null
      };
      
      // Apply template data to form
      setTicketData(templateTicketData);
      
      // Also apply via UnifiedTicketPanel ref if available
      if (unifiedTicketPanelRef.current) {
        unifiedTicketPanelRef.current.setFormData(templateTicketData);
        unifiedTicketPanelRef.current.setTemplateStructure(template.structure);
      }
    } else {
      console.warn('Template structure missing:', template);
    }
    
    // Add a message to the chat about using a template
    setChatHistory(currentChat => [
      ...currentChat,
      {role: 'assistant', text: `Great! I've applied the "${template.name}" template. You can now customize it to your needs.`}
    ]);
  };
  
  // State for version comparison
  const [showVersionComparison, setShowVersionComparison] = useState<boolean>(false);
  const [comparisonData, setComparisonData] = useState<{
    prevVersion: {
      title: string;
      description: string;
      acceptanceCriteria: string;
    } | null;
    currentVersion: {
      title: string;
      description: string;
      acceptanceCriteria: string;
    } | null;
    sections: string[];
  }>({
    prevVersion: null,
    currentVersion: null,
    sections: []
  });
  
  // State to track which sections have been visually "accepted" by the user
  const [acceptedSections, setAcceptedSections] = useState<Set<string>>(new Set());

  // Reference to the UnifiedTicketPanel component
  const unifiedTicketPanelRef = useRef<UnifiedTicketPanelRef>(null);

  // Helper function to get platform-specific terminology
  const getPlatformTerms = () => {
    const platform = currentPlatform || 'platform';
    switch (platform) {
      case 'jira':
        return {
          platform: 'Jira',
          ticket: 'Ticket',
          tickets: 'Tickets',
          project: 'Project',
          projects: 'Projects',
          key: 'Key',
          selection: 'Jira Ticket Selection',
          connect: 'Connect to Jira'
        };
      case 'trello':
        return {
          platform: 'Trello',
          ticket: 'Card',
          tickets: 'Cards',
          project: 'Board',
          projects: 'Boards',
          key: 'Card ID',
          selection: 'Trello Card Selection',
          connect: 'Connect to Trello'
        };
      default:
        return {
          platform: 'Platform',
          ticket: 'Ticket',
          tickets: 'Tickets',
          project: 'Project',
          projects: 'Projects',
          key: 'ID',
          selection: 'Ticket Selection',
          connect: 'Connect to Platform'
        };
    }
  };

  // Check platform connection status
  const checkPlatformConnection = () => {
    // Force refresh of active platform detection
    platformManager.refreshActivePlatform();
    
    const activePlatform = platformManager.getActivePlatform();
    const connected = platformManager.hasAnyConnection();
    
    setPlatformConnected(connected);
    setCurrentPlatform(activePlatform);
    
    if (!connected || !activePlatform) {
      setAllTickets(mockTickets);
      setConnectionError('Not connected to any platform. Connect in Settings to see real tickets.');
    } else {
      setConnectionError(null);
    }
    return connected && activePlatform;
  };

  // Load tickets from active platform
  const loadPlatformTickets = async (searchType: 'recent' | 'search' = 'recent', query: string = '') => {
    if (!checkPlatformConnection()) {
      return;
    }

    setLoadingTickets(true);
    setConnectionError(null);

    try {
      // Use platform manager to fetch tickets from active platform
      const tickets = await platformManager.searchTickets({
        searchType,
        query,
        maxResults: 50,
      });

      setAllTickets(tickets);
      
      // Update recent tickets for quick access
      if (searchType === 'recent') {
        setRecentTickets(tickets.slice(0, 5) || []);
      }
    } catch (error: any) {
      console.error('Error loading platform tickets:', error);
      setConnectionError(error.message);
      
      // If auth failed, suggest reconnection
      if (error.message.includes('Authentication failed') || error.message.includes('expired')) {
        const platform = platformManager.getActivePlatform();
        setConnectionError(`Authentication expired. Please reconnect to ${platform} in Settings.`);
        setPlatformConnected(false);
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  // Handle when user opens ticket selection modal
  const handleOpenTicketModal = () => {
    if (!checkPlatformConnection()) {
      // Show connection prompt
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: `You need to connect to a platform first to access your tickets. Please go to Settings to connect your ${currentPlatform || 'preferred'} account.`}
      ]);
      return;
    }
    
    // Load recent tickets if connected
    loadPlatformTickets('recent');
    setShowTicketModal(true);
  };

  // Add animated background style
  React.useEffect(() => {
    // Apply gradient background and custom cursor to the body only when dashboard is mounted
    document.body.classList.add('dashboard-gradient');
    
    if (config.cursorEffects) {
      document.body.classList.add('cursor-none');
    }
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('dashboard-gradient', 'cursor-none');
    };
  }, [config.cursorEffects]);

  // Listen for ticket push events and reset events
  useEffect(() => {
    const handleTicketPushed = (event: CustomEvent) => {
      const { success, isNew, ticketData: eventTicketData } = event.detail;
      
      if (success) {
        // Add a message to the chat about the success
        setChatHistory(currentChat => [
          ...currentChat,
          {role: 'assistant', text: isNew 
            ? `Great! I've created the ticket "${eventTicketData.title}" in Jira. Is there anything else you'd like to work on?` 
            : `Perfect! I've updated the ticket in Jira with your changes. Is there anything else you'd like to help with?`}
        ]);
        
        // Reset the form if we created a new ticket
        if (isNew && unifiedTicketPanelRef.current) {
          unifiedTicketPanelRef.current.resetForm();
        }
      }
    };
    
    // Handler for ticket reset event (after successful push)
    const handleTicketReset = () => {
      // Clear the ticket data to avoid the loading animation
      setTicketData(null);
    };
    
    window.addEventListener('jiraTicketPushed', handleTicketPushed as EventListener);
    window.addEventListener('jiraTicketReset', handleTicketReset as EventListener);
    
    return () => {
      window.removeEventListener('jiraTicketPushed', handleTicketPushed as EventListener);
      window.removeEventListener('jiraTicketReset', handleTicketReset as EventListener);
    };
  }, []);

  // Check platform connection on component mount
  useEffect(() => {
    checkPlatformConnection();
    
    // Load recent tickets if connected
    if (platformConnected && currentPlatform) {
      loadPlatformTickets('recent');
    }
  }, []);

  // Re-check connection status when window regains focus (e.g., navigating back from settings)
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to allow localStorage to sync after navigation
      setTimeout(() => {
        checkPlatformConnection();
        
        // Load recent tickets if now connected
        if (platformManager.hasAnyConnection()) {
          loadPlatformTickets('recent').catch(error => {
            console.error('Error loading tickets after focus:', error);
            // Don't throw - just log the error
          });
        }
      }, 100);
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Load project contexts from database
  const loadProjectContexts = async () => {
    try {
      // Load project contexts
      const contextsResponse = await authenticatedFetch('/api/project-contexts');
      if (contextsResponse.ok) {
        const contextsData = await contextsResponse.json();
        // Convert project contexts to ProjectContext format
        const convertedProjectContexts: ProjectContext[] = (contextsData.projectContexts || []).map((ctx: {
          id: string;
          name: string;
          description: string;
          abbreviations?: Record<string, string>;
          terminology?: Record<string, string>;
          project_info?: string;
          standards?: string;
          created_at: string;
          updated_at: string;
        }) => ({
          id: ctx.id,
          name: ctx.name,
          description: ctx.description,
          abbreviations: ctx.abbreviations || {},
          terminology: ctx.terminology || {},
          projectInfo: ctx.project_info || '',
          standards: ctx.standards || '',
          createdAt: ctx.created_at,
          updatedAt: ctx.updated_at
        }));
        setProjectContexts(convertedProjectContexts);
      } else {
        console.error('Failed to load project contexts:', contextsResponse.statusText);
      }
    } catch (error) {
      console.error('Error loading project contexts:', error);
    }
    
    // Don't set a default selection - let user choose
    setSelectedProjectContextId(null);
    setSelectedProjectContext(null);
  };

  // Load project contexts and set default selection
  useEffect(() => {
    if (user) {
      loadProjectContexts();
    }
  }, [user]);

  // Update selected project context when selectedProjectContextId changes
  useEffect(() => {
    if (selectedProjectContextId && projectContexts.length > 0) {
      const projectContext = projectContexts.find(ctx => ctx.id === selectedProjectContextId);
      setSelectedProjectContext(projectContext || null);
    }
  }, [selectedProjectContextId, projectContexts]);

  // Initialize recent tickets, favorites and check for selected template from localStorage
  useEffect(() => {
    const savedRecentTickets = localStorage.getItem('ticketwizard-recent-tickets');
    const savedFavorites = localStorage.getItem('ticketwizard-favorite-tickets');
    const selectedTemplateData = localStorage.getItem('selectedTemplate');
    
    if (savedRecentTickets) {
      try {
        const recent = JSON.parse(savedRecentTickets);
        setRecentTickets(recent.slice(0, 5)); // Keep only last 5
      } catch (error) {
        console.error('Error loading recent tickets:', error);
      }
    }
    
    if (savedFavorites) {
      try {
        setFavoriteTickets(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorite tickets:', error);
      }
    }
    
    // Check if we have a template selected from the templates page
    if (selectedTemplateData) {
      try {
        const template = JSON.parse(selectedTemplateData);
        localStorage.removeItem('selectedTemplate');
        
        // If not already editing a ticket, switch to create mode with the template.
        // If already editing, apply template structure but keep existing ticket data and mode.
        if (!selectedTicket) {
            setIsCreatingNew(true);
            setTicketMode('create');
        }
        
        setActiveTemplateId(template.id); // Set active template

        setTimeout(() => {
          if (unifiedTicketPanelRef.current) {
            if (!selectedTicket) { // Only reset form if we are creating a new ticket
                unifiedTicketPanelRef.current.resetForm();
            }
            unifiedTicketPanelRef.current.setTemplateStructure(template.structure);
            
            // No chat message needed here as per new requirement
            // setChatHistory(currentChat => [
            //   ...currentChat,
            //   {role: 'assistant', text: `I've loaded the "${template.name}" template structure. ...`}
            // ]);
          }
        }, 100); // Reduced timeout slightly
      } catch (error) {
        console.error('Error loading selected template:', error);
      }
    }
  }, [selectedTicket]); // Add selectedTicket to dependency array

  // Filter tickets based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTickets([]);
      return;
    }

    // If connected to platform, use API search; otherwise filter local tickets
    if (platformConnected && currentPlatform) {
      // Debounce the API search to avoid too many requests
      const searchTimeout = setTimeout(() => {
        loadPlatformTickets('search', searchQuery).then(() => {
          // After loading search results, allTickets will be updated
          // and we can filter from there if needed
          const query = searchQuery.toLowerCase();
          const filtered = allTickets.filter(ticket => 
            ticket.key.toLowerCase().includes(query) ||
            ticket.title.toLowerCase().includes(query) ||
            ticket.description.toLowerCase().includes(query) ||
            ticket.project.toLowerCase().includes(query) ||
            ticket.epic?.toLowerCase().includes(query) ||
            ticket.assignee?.toLowerCase().includes(query) ||
            ticket.labels.some(label => label.toLowerCase().includes(query)) ||
            ticket.components.some(component => component.toLowerCase().includes(query))
          );
          setFilteredTickets(filtered.slice(0, 10));
        });
      }, 500); // 500ms debounce

      return () => clearTimeout(searchTimeout);
    } else {
      // Fallback to local filtering for mock data
      const query = searchQuery.toLowerCase();
      const filtered = allTickets.filter(ticket => 
        ticket.key.toLowerCase().includes(query) ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.project.toLowerCase().includes(query) ||
        ticket.epic?.toLowerCase().includes(query) ||
        ticket.assignee?.toLowerCase().includes(query) ||
        ticket.labels.some(label => label.toLowerCase().includes(query)) ||
        ticket.components.some(component => component.toLowerCase().includes(query))
      );

      // Sort by relevance (exact key match first, then title match, then description)
      filtered.sort((a, b) => {
        const aKeyMatch = a.key.toLowerCase().includes(query);
        const bKeyMatch = b.key.toLowerCase().includes(query);
        const aTitleMatch = a.title.toLowerCase().includes(query);
        const bTitleMatch = b.title.toLowerCase().includes(query);
        
        if (aKeyMatch && !bKeyMatch) return -1;
        if (!aKeyMatch && bKeyMatch) return 1;
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        // Sort by last modified (most recent first)
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      });

      setFilteredTickets(filtered.slice(0, 10)); // Limit to 10 results
    }
  }, [searchQuery, platformConnected, currentPlatform, allTickets]);

  // Filter project contexts based on search query
  useEffect(() => {
    if (!projectContextSearchQuery.trim()) {
      setFilteredProjectContexts(projectContexts);
      return;
    }

    const query = projectContextSearchQuery.toLowerCase();
    const filtered = projectContexts.filter(context => 
      context.name.toLowerCase().includes(query) ||
      context.description.toLowerCase().includes(query) ||
      context.projectInfo.toLowerCase().includes(query)
    );

    setFilteredProjectContexts(filtered);
  }, [projectContextSearchQuery, projectContexts]);

  // Save recent tickets to localStorage when a ticket is selected
  const addToRecentTickets = (ticket: Ticket) => {
    const updatedRecent = [ticket, ...recentTickets.filter(t => t.id !== ticket.id)].slice(0, 5);
    setRecentTickets(updatedRecent);
    localStorage.setItem('ticketwizard-recent-tickets', JSON.stringify(updatedRecent));
  };

  // Toggle favorite ticket
  const toggleFavorite = (ticketKey: string) => {
    const updatedFavorites = favoriteTickets.includes(ticketKey)
      ? favoriteTickets.filter(key => key !== ticketKey)
      : [...favoriteTickets, ticketKey];
    
    setFavoriteTickets(updatedFavorites);
    localStorage.setItem('ticketwizard-favorite-tickets', JSON.stringify(updatedFavorites));
  };

  // Get favorite tickets
  const getFavoriteTickets = (): Ticket[] => {
    return allTickets.filter(ticket => favoriteTickets.includes(ticket.key));
  };
  
  // EARLY RETURNS AFTER ALL HOOKS ARE CALLED
  if (loading) {
    return <div className="text-center mt-10 text-neutral-300">Loading...</div>;
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'; // adjust if your login page is elsewhere
    }
    return null;
  }

  // Check if user needs to complete signup
  if (user && !userProfile && !loading) { 
    if (typeof window !== 'undefined') window.location.href = '/complete-signup'; 
    return null; 
  }

  // Handler to update specific fields in the form
  const updateTicketField = (field: string, value: string) => {
    if (unifiedTicketPanelRef.current) {
      const currentData = unifiedTicketPanelRef.current.getFormData();
      
      // Create an updated form data object with the new field value, ensuring we have valid data
      const updatedData = {
        title: '',
        description: '',
        acceptanceCriteria: '',
        ...currentData,
        [field]: value
      };
      
      // Update the form data
      unifiedTicketPanelRef.current.setFormData(updatedData);
      
      // Provide confirmation in chat
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: `I've updated the ${field} field for you. Would you like me to help with anything else?`}
      ]);
    }
  };

  // Handler for a user confirming they want to update something
  const handleUserConfirmation = (text: string) => {
    const msg = message.toLowerCase();
    
    // Check if the message is a confirmation to update something
    if (
      (msg.includes('yes') || msg.includes('sure') || msg.includes('update') || msg.includes('apply')) && 
      chatHistory.length >= 2
    ) {
      // Get the previous assistant message to determine what they're confirming
      const prevMessage = chatHistory[chatHistory.length - 2];
      const prevMessageText = prevMessage.text.toLowerCase();
      
      // Handle different types of confirmations
      if (prevMessageText.includes('improved description')) {
        // Extract the description from the previous message - would use regex in real implementation
        const startIndex = prevMessageText.indexOf("here's an improved description:");
        if (startIndex !== -1) {
          const description = prevMessage.text.substring(startIndex + 30).trim();
          updateTicketField('description', description);
        }
      }
      else if (prevMessageText.includes('acceptance criteria')) {
        // Extract the criteria from the previous message - would use regex in real implementation
        const startIndex = prevMessageText.indexOf("here's some suggested acceptance criteria:");
        if (startIndex !== -1) {
          const criteria = prevMessage.text.substring(startIndex + 40).trim();
          updateTicketField('acceptanceCriteria', criteria);
        }
      }
      // New: Handle refinement for specific sections
      else if (prevMessageText.includes('refined') && prevMessage.sections && prevMessage.sections.length > 0) {
        const sectionsToUpdate = prevMessage.sections;
        
        // In a real implementation, we'd get the refined content from the API
        // For now, we'll simulate by updating with placeholder content
        if (sectionsToUpdate.includes('description')) {
          updateTicketField('description', 'Refined description with improved clarity and more details about implementation requirements.');
        }
        
        if (sectionsToUpdate.includes('acceptanceCriteria')) {
          updateTicketField('acceptanceCriteria', '- Feature must handle at least 100 concurrent users\n- Response time under 500ms for all operations\n- Must include comprehensive error handling\n- Should follow accessibility guidelines\n- Requires unit and integration tests');
        }
        
        setChatHistory(currentChat => [
          ...currentChat,
          {role: 'assistant', text: `I've applied the refined content to your ticket. You can now push these changes to Jira or continue editing.`}
        ]);
      }
    }
  };

  // Helper functions for AI assistance requests
  const requestTicketRefinement = (sections?: string[]) => {
    if (unifiedTicketPanelRef.current) {
      const currentFormData = unifiedTicketPanelRef.current.getFormData();
      
      // Check if the form has enough data to refine
      if (!currentFormData || !currentFormData.title || !currentFormData.description) {
        setChatHistory(currentChat => [
          ...currentChat,
          {role: 'assistant', text: "I need more information to refine the ticket. Please add at least a title and description."}
        ]);
        return;
      }
      
      // If specific sections are provided, refine only those
      const sectionsMessage = sections && sections.length > 0 
        ? `I'll refine the ${sections.join(', ')} sections of your ticket.` 
        : "I'll refine your entire ticket.";
      
      // Add a message that the AI is working on refinements
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: `${sectionsMessage} Please wait a moment...`, sections}
      ]);
      
      // Trigger the refinement process after a short delay
      setTimeout(() => {
        // In a real app, this would call an API with the specific sections to refine
        // For now, we'll simulate it with a chat message
        setChatHistory(currentChat => [
          ...currentChat,
          {
            role: 'assistant', 
            text: `I've refined the ${sections ? sections.join(', ') : 'ticket content'}. The changes include improved clarity, more detailed technical specifications, and better organization. Would you like me to apply these refinements to your ticket?`,
            sections
          }
        ]);
      }, 2000);
    }
  };

  const suggestAcceptanceCriteria = () => {
    if (unifiedTicketPanelRef.current) {
      const currentFormData = unifiedTicketPanelRef.current.getFormData();
      
      // Check if there's enough context
      if (!currentFormData || !currentFormData.description) {
        setChatHistory(currentChat => [
          ...currentChat,
          {role: 'assistant', text: "I need a ticket description to suggest acceptance criteria. Please add a description first."}
        ]);
        return;
      }
      
      // Simulate generating acceptance criteria
      setTimeout(() => {
        const suggestedCriteria = generateAcceptanceCriteria(currentFormData.description);
        
        setChatHistory(currentChat => [
          ...currentChat,
          {role: 'assistant', text: `Based on your description, here's some suggested acceptance criteria:\n\n${suggestedCriteria}\n\nWould you like me to update the ticket with these criteria?`}
        ]);
      }, 1000);
    }
  };
  
  // Generate acceptance criteria based on description
  const generateAcceptanceCriteria = (description: string): string => {
    // This would normally call an API, but for demo purposes we'll use simple pattern matching
    if (description.toLowerCase().includes('authentication') || description.toLowerCase().includes('login')) {
      return "- User can successfully create a new account\n- User can log in with valid credentials\n- User sees appropriate error messages for invalid credentials\n- User can reset their password\n- User can log out from the system";
    } else if (description.toLowerCase().includes('dashboard') || description.toLowerCase().includes('ui')) {
      return "- Dashboard displays all required metrics correctly\n- UI is responsive on mobile, tablet and desktop\n- All interactive elements work as expected\n- Data is refreshed automatically\n- User settings are preserved";
    } else {
      return "- Feature is implemented according to specifications\n- All edge cases are handled appropriately\n- UI follows the design guidelines\n- Performance meets requirements\n- Code is properly tested";
    }
  };

  // Legacy data for backward compatibility (will be removed)
  const epics = ['Epic 1', 'Epic 2', 'Epic 3']; 
  const stories: Record<string, string[]> = {
    'Epic 1': ['JIRA-101: Implement login page', 'JIRA-102: Add password reset'],
    'Epic 2': ['JIRA-201: Create dashboard widgets', 'JIRA-202: Add data visualization'],
    'Epic 3': ['JIRA-301: Setup CI/CD pipeline', 'JIRA-302: Configure monitoring'],
  };
  
  // Handle sending messages in the chat with real AI
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const userMessage = chatMessage;
    
    // Add user message to chat and show loading
    setChatHistory(prev => [...prev, 
      {role: 'user', text: userMessage},
      {role: 'assistant', text: 'Thinking...', sections: []}
    ]);
    setChatMessage('');
    
    try {
      // Get current ticket context
      const currentTicketData = unifiedTicketPanelRef.current?.getFormData();
      
      // Get uploaded files
      const uploadedFiles = unifiedTicketPanelRef.current?.getUploadedFiles() || [];
      let filesData = [];
      
      if (uploadedFiles.length > 0) {
        try {
          filesData = await convertFilesToBase64(uploadedFiles);
        } catch (error) {
          console.error('Error converting files to base64:', error);
          setChatHistory(prev => [
            ...prev.slice(0, -1), // Remove loading message
            {role: 'assistant', text: 'Error processing uploaded files. Please try again without files or with different files.', sections: []}
          ]);
          return;
        }
      }
      
      // Call real AI chat endpoint
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          text: userMessage,
          chatHistory: chatHistory.map(msg => ({
            role: msg.role,
            text: msg.text
          })),
          ticketContext: currentTicketData,
          teamContext: selectedProjectContext,
          mode: 'manual',
          files: filesData,
          selectedModel: getUserSelectedModel()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle usage limit exceeded with proper messaging
        if (response.status === 429 && errorData.usage_limit_exceeded) {
          const isOrgAdmin = userRole?.isOrgAdmin || false;
          
          let errorMessage = '';
          if (isOrgAdmin) {
            errorMessage = `⚠️ **Token Limit Reached**\n\nYou've reached your monthly limit of ${errorData.limit?.toLocaleString()} tokens (currently used: ${errorData.current_usage?.toLocaleString()}).\n\nAs an organization admin, you can [upgrade your plan](/settings?tab=account) to get more tokens and continue using AI features.`;
          } else {
            errorMessage = `⚠️ **Token Limit Reached**\n\nYour team has reached the monthly token limit of ${errorData.limit?.toLocaleString()} tokens (currently used: ${errorData.current_usage?.toLocaleString()}).\n\nPlease contact your organization admin to upgrade your plan for continued access to AI features.`;
          }
          
          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = {
              role: 'assistant',
              text: errorMessage,
              sections: []
            };
            return newHistory;
          });
          return;
        }
        
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const aiResponse = await response.json();
      
      // Update chat with real AI response
      setChatHistory(prev => {
        const newHistory = [...prev];
        let responseMessage = aiResponse.response;
        
        // Add file processing feedback if files were uploaded
        if (aiResponse.uploadedFiles > 0) {
          responseMessage += `\n\n*Successfully processed ${aiResponse.uploadedFiles} file(s) for context.*`;
        }
        if (aiResponse.fileErrors && aiResponse.fileErrors.length > 0) {
          responseMessage += `\n\n*File processing issues: ${aiResponse.fileErrors.join(', ')}*`;
        }
        
        // Replace the "Thinking..." message with the real response
        newHistory[newHistory.length - 1] = {
          role: 'assistant',
          text: responseMessage,
          sections: []
        };
        return newHistory;
      });

      // If AI suggests ticket updates, create a new version (like the refine function does)
      if (aiResponse.updatedTicket && unifiedTicketPanelRef.current) {
        // Check if we're in versioned mode to create a new version
        const currentVersions = unifiedTicketPanelRef.current.getAllVersions();
        if (currentVersions.length > 0) {
          // We're in versioned mode - create a new version
          // First determine what sections were changed by comparing with current data
          const currentData = unifiedTicketPanelRef.current.getFormData();
          const changedSections: string[] = [];
          
          if (currentData) {
            if (aiResponse.updatedTicket.title !== currentData.title) changedSections.push('title');
            if (aiResponse.updatedTicket.description !== currentData.description) changedSections.push('description'); 
            if (aiResponse.updatedTicket.acceptanceCriteria !== currentData.acceptanceCriteria) changedSections.push('acceptanceCriteria');
          }
          
          // Create a new version using the new method
          if (changedSections.length > 0) {
            // Merge current data with AI updates to ensure all fields are present
            const mergedData = {
              title: aiResponse.updatedTicket.title || currentData.title || '',
              description: aiResponse.updatedTicket.description || currentData.description || '',
              acceptanceCriteria: aiResponse.updatedTicket.acceptanceCriteria || currentData.acceptanceCriteria || ''
            };
            
            unifiedTicketPanelRef.current.createNewVersionFromChat(
              mergedData,
              userMessage,
              changedSections,
              aiResponse.clarityScore,
              aiResponse.clarityScoreReasoning,
              aiResponse.investBreakdown
            );
          } else {
            // No changes detected, just update the current version
            unifiedTicketPanelRef.current.setFormData(aiResponse.updatedTicket);
          }
        } else {
          // We're in form mode - just update the form data normally
          unifiedTicketPanelRef.current.setFormData(aiResponse.updatedTicket);
        }
      }

      // If AI provides a clarity score and we're not in versioned mode (since versioned mode handles it in createNewVersionFromChat)
      if (aiResponse.clarityScore && unifiedTicketPanelRef.current && unifiedTicketPanelRef.current.getAllVersions().length === 0) {
        unifiedTicketPanelRef.current.setClarityScore(aiResponse.clarityScore, aiResponse.clarityScoreReasoning, aiResponse.investBreakdown);
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      // Replace loading message with error
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = {
          role: 'assistant',
          text: 'Sorry, I encountered an error. Please try again.',
          sections: []
        };
        return newHistory;
      });
    }
  };
  
  // Helper function to enhance descriptions (would normally be an API call)
  const enhanceDescription = (description: string): string => {
    if (description.toLowerCase().includes('authentication') || description.toLowerCase().includes('login')) {
      return "Implement a secure authentication system that allows users to sign up, log in, and reset passwords. The system should integrate with our existing user database and provide proper error handling for invalid credentials. Include email verification for new accounts and support both password-based and social authentication methods (Google, GitHub).";
    } else if (description.toLowerCase().includes('dashboard') || description.toLowerCase().includes('ui')) {
      return "Design and implement a responsive dashboard interface that displays key metrics and user activity in real-time. The dashboard should feature an intuitive layout with customizable widgets that users can arrange according to their preferences. Ensure the design follows our design system and provides a seamless experience across desktop and mobile.";
    } else {
      return description + "\n\nAdditional considerations:\n- Ensure cross-browser compatibility\n- Include appropriate error handling\n- Add comprehensive logging\n- Write unit and integration tests\n- Document the implementation";
    }
  };

  // Handle selection of a Jira ticket
  const handleTicketSelection = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedStory(ticket.key);
    setIsCreatingNew(false);
    setTicketMode('edit');
    
    // Populate the form with actual Jira ticket data
    if (unifiedTicketPanelRef.current) {
      const ticketData = {
        title: ticket.title,
        description: ticket.description,
        acceptanceCriteria: '', // Could be parsed from description if standardized
        jiraKey: ticket.key,
        jiraUrl: ticket.url
      };
      
      unifiedTicketPanelRef.current.setFormData(ticketData);
      setTicketData(ticketData);
    }
    
    // Add visual feedback about loading the ticket
    setTimeout(() => {
      setChatHistory(currentChat => [
        ...currentChat, 
        {role: 'assistant', text: `I've loaded the details for ticket "${ticket.key}: ${ticket.title}". You can now upload additional context files and select any section to refine with AI.`}
      ]);
    }, 500);
  };
  
  // Handle creating a new ticket
  const handleCreateNewTicket = () => {
    setIsCreatingNew(true);
    setSelectedStory('');
    setTicketMode('create');
    
    // Reset the form data
    if (unifiedTicketPanelRef.current) {
      unifiedTicketPanelRef.current.resetForm();
    }
    
    // Add visual feedback about the current status by adding a message to the chat
    if (selectedEpic) {
      setTimeout(() => {
        setChatHistory(currentChat => [
          ...currentChat, 
          {role: 'assistant', text: `I'll help you create a new ticket under the epic "${selectedEpic}". What would you like to name this ticket?`}
        ]);
      }, 500);
    } else {
      setTimeout(() => {
        setChatHistory(currentChat => [
          ...currentChat, 
          {role: 'assistant', text: `I'll help you create a new standalone ticket. What would you like to name it?`}
        ]);
      }, 500);
    }
  };

  // Handle ticket version changes
  const handleVersionChange = (versionNumber: number, refinedSections?: string[]) => {
    setChatHistory(currentChat => [
      ...currentChat,
      {role: 'assistant', text: `You're now viewing version ${versionNumber + 1} of this ticket.`}
    ]);
    
    // Store the current version number for comparison
    setCurrentVersionNumber(versionNumber);
    
    // If this is a new version created by refinement (refinedSections provided and not empty)
    if (versionNumber > 0 && refinedSections && refinedSections.length > 0) {
      // Get the current version data from the UnifiedTicketPanel which includes manual edits
      const currentVersionData = unifiedTicketPanelRef.current?.getFormData();
      
      if (currentVersionData && ticketData) {
        // Use the current version data (with manual edits) as prevVersion for comparison
        // This ensures the comparison shows changes against the manually edited baseline
        
        // Create currentVersion object that only shows AI refinements for sections that were actually refined
        const currentVersion: {
          title: string;
          description: string;
          acceptanceCriteria: string;
        } = {
          title: currentVersionData.title,
          description: currentVersionData.description,
          acceptanceCriteria: currentVersionData.acceptanceCriteria,
        };
        
        // Only apply AI refinements to sections that were actually selected for refinement
        refinedSections.forEach(section => {
          switch (section) {
            case 'title':
              currentVersion.title = `${currentVersionData.title} (AI enhanced)`;
              break;
            case 'description':
              currentVersion.description = `${currentVersionData.description}\n\nAI refinement: This description has been clarified and expanded with more details about implementation requirements.`;
              break;
            case 'acceptanceCriteria':
              currentVersion.acceptanceCriteria = "- Users can successfully complete the action\n- The system responds within 2 seconds\n- Error states are handled gracefully\n- Accessibility standards are met";
              break;
          }
        });
        
        setComparisonData({
          prevVersion: {
            title: currentVersionData.title,
            description: currentVersionData.description,
            acceptanceCriteria: currentVersionData.acceptanceCriteria
          },
          currentVersion,
          sections: refinedSections
        });
        setShowVersionComparison(true);
      }
    }
    // If this is historical version navigation (no refinedSections or empty array)
    else if (versionNumber > 0 && (!refinedSections || refinedSections.length === 0)) {
      // For historical version browsing, get actual version data from the VersionedTicket component
      if (unifiedTicketPanelRef.current) {
        const currentVersionData = unifiedTicketPanelRef.current.getVersionByIndex(versionNumber);
        const previousVersionData = unifiedTicketPanelRef.current.getVersionByIndex(versionNumber - 1);
        
        if (currentVersionData && previousVersionData) {
          setComparisonData({
            prevVersion: previousVersionData,
            currentVersion: currentVersionData,
            sections: ['title', 'description', 'acceptanceCriteria']
          });
          setShowVersionComparison(true);
        }
      }
    }
  };
  
  // Accept changes from a version comparison
  const handleAcceptChanges = (section: string) => {
    // Since AI enhanced content is already applied to the form,
    // we only need to mark this section as visually "accepted"
    setAcceptedSections(prev => new Set([...prev, section]));
    
    // Notify the user in the chat
    setChatHistory(currentChat => [
      ...currentChat,
      {role: 'assistant', text: `I've marked the ${section} section as accepted. The enhanced content was already applied to your form.`}
    ]);
  };
  
  // Reject changes from a version comparison
  const handleRejectChanges = (section: string) => {
    if (comparisonData && comparisonData.prevVersion) {
      // Update the form with the previous version content to revert changes
      if (unifiedTicketPanelRef.current) {
        const sectionKey = section as keyof typeof comparisonData.prevVersion;
        updateTicketField(section, comparisonData.prevVersion[sectionKey]);
      }
      
      // Notify the user in the chat
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: `I've reverted the ${section} section back to the previous version. The changes have been rejected.`}
      ]);
    }
  };

  // Reopen version comparison
  const handleReopenComparison = () => {
    if (comparisonData && comparisonData.prevVersion && comparisonData.currentVersion) {
      setShowVersionComparison(true);
      
      // Notify the user in the chat
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: "I've reopened the version comparison for you. You can review and accept or reject changes as needed."}
      ]);
    }
  };


  // Select a project context from the dropdown
  const selectProjectContext = (projectContext: ProjectContext | null) => {
    setSelectedProjectContext(projectContext);
    setSelectedProjectContextId(projectContext?.id || null);
    setShowTeamDropdown(false);
    
    // Update chat history with project context selection
    if (projectContext) {
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: `You've selected the project context: ${projectContext.name}. AI refinements will now use your project's context for more relevant suggestions.`}
      ]);
    } else {
      setChatHistory(currentChat => [
        ...currentChat,
        {role: 'assistant', text: `Project context selection cleared. AI refinements will use general suggestions without project-specific context.`}
      ]);
    }
  };

  // Main render
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Enhanced Magical Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Multi-layered magical gradient orbs */}
        <motion.div 
          className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/15 to-purple-600/15 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 50, 0],
            scale: [1, 1.25, 1]
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[320px] h-[320px] bg-gradient-to-r from-indigo-600/12 to-cyan-600/12 rounded-full blur-2xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute top-1/4 right-1/3 w-[280px] h-[280px] bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 rounded-full blur-xl"
          animate={{
            x: [0, -30, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />

        {/* Enhanced magical floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 5 === 0 
                ? 'w-2.5 h-2.5 bg-gradient-to-r from-purple-400 to-pink-400' 
                : i % 5 === 1 
                ? 'w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400'
                : i % 5 === 2 
                ? 'w-1.5 h-1.5 bg-gradient-to-r from-pink-400 to-rose-400'
                : i % 5 === 3
                ? 'w-1 h-1 bg-gradient-to-r from-cyan-400 to-indigo-400'
                : 'w-0.5 h-0.5 bg-gradient-to-r from-violet-400 to-fuchsia-400'
            }`}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              y: [null, -70, 15, 0],
              x: [null, Math.random() * 30 - 15, 0],
              opacity: [0, 0.7, 0.2, 0],
              scale: [0.2, 2.0, 1.2, 0.2],
              rotate: [0, 270]
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 7,
            }}
          />
        ))}

        {/* Enhanced animated grid pattern */}
        <motion.div 
          className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.04)_1px,transparent_1px)] bg-[size:90px_90px] opacity-35"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Magical spotlight effects */}
        <motion.div 
          className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-r from-purple-500/8 to-indigo-500/8 rounded-full blur-3xl"
          animate={{
            x: [-60, 60, -60],
            y: [-30, 30, -30],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Radial gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-slate-950/10 to-slate-950/30"></div>
      </div>

      {/* Add CursorEffects at the top level for global cursor effects */}
      <CursorEffects enabled={config.cursorEffects} />
      
      <NavHelper />
      
      {/* Cursor Effects Toggle */}
      <div className="fixed top-25 right-5 z-50">
        <button 
          onClick={() => {
            setConfig(prev => {
              const newConfig = { ...prev, cursorEffects: !prev.cursorEffects };
              
              // Update body class immediately to sync with state change
              if (newConfig.cursorEffects) {
                document.body.classList.add('cursor-none');
              } else {
                document.body.classList.remove('cursor-none');
              }
              
              return newConfig;
            });
          }}
          className={`p-2 rounded-full ${
            config.cursorEffects 
              ? 'bg-purple-600 text-white' 
              : 'bg-neutral-700 text-neutral-300'
          }`}
          title={config.cursorEffects ? "Disable cursor effects" : "Enable cursor effects"}
        >
          <CursorArrowRaysIcon className="h-6 w-6" />
        </button>
      </div>
      
      <main className="flex-1 flex">
        <CollapsibleSidebar />
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-subtle-glow">
            <motion.h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 flex items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.span
                className="inline-block"
                animate={{
                  textShadow: [
                    "0 0 0px rgba(147, 51, 234, 0)",
                    "0 0 25px rgba(147, 51, 234, 0.4)",
                    "0 0 0px rgba(147, 51, 234, 0)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                🔧 Manual Mode
              </motion.span>
              <motion.span 
                className="ml-3 text-xs font-normal rounded-full bg-gradient-to-r from-indigo-900/40 to-purple-900/40 text-indigo-300 px-3 py-1.5 hidden md:inline-block shadow-lg border border-indigo-700/50 backdrop-blur-sm"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                Direct Ticket Editing
              </motion.span>
            </motion.h1>

            {/* New compact selection section - Improved for responsiveness */}
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Dynamic Ticket Selection - Compact View */}
                <motion.div 
                  className={`bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md p-4 rounded-2xl border shadow-2xl transition-all duration-500 group hover:shadow-purple-500/25 relative overflow-hidden ${selectedTicket ? 'border-green-500/50 shadow-green-500/10' : 'border-neutral-700/60 hover:border-purple-400/60'}`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -4,
                    transition: { duration: 0.3 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold flex items-center text-neutral-100 group-hover:text-white transition-colors duration-300">
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-300" />
                      </motion.div>
                      {getPlatformTerms().platform} {getPlatformTerms().ticket}
                    </h2>
                    <motion.button 
                      onClick={handleOpenTicketModal}
                      className="px-3 py-1 min-w-[72px] text-center bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-purple-600 hover:to-indigo-600 text-neutral-300 hover:text-white rounded-lg text-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedTicket ? 'Change' : 'Select'}
                    </motion.button>
                  </div>
                  
                  {selectedTicket ? (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 mb-1 overflow-hidden">
                        <span className="text-green-400 font-mono text-sm flex-shrink-0">{selectedTicket?.key || ''}</span>
                        <span className="text-neutral-200 font-medium truncate">{selectedTicket?.title || ''}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs inline-block mt-1 ${
                        selectedTicket?.type === 'Story' ? 'bg-blue-900/50 text-blue-300' :
                        selectedTicket?.type === 'Task' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-red-900/50 text-red-300'
                      }`}>
                        {selectedTicket?.type || 'Task'}
                      </span>
                      {selectedTicket?.status && (
                        <span className="px-2 py-1 rounded text-xs inline-block mt-1 ml-2 bg-purple-900/50 text-purple-300">
                          {selectedTicket.status}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-neutral-400 text-sm">No ticket selected</p>
                      <button 
                        onClick={handleCreateNewTicket}
                        className="px-3 py-1 min-w-[72px] text-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                      >
                        <PlusIcon className="w-3 h-3" />
                        <span>New</span>
                      </button>
                    </div>
                  )}
                  
                  {/* Connection Status Indicator */}
                  {connectionError && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-yellow-400">{connectionError}</span>
                      <a href="/settings" className="text-indigo-400 hover:text-indigo-300 underline">
                        Settings
                      </a>
                    </div>
                  )}
                  {!connectionError && platformConnected && currentPlatform && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      <LinkIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-green-400">Connected to {currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1)}</span>
                    </div>
                  )}
                  
                  {/* Magical corner accent */}
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-600/10 to-indigo-600/10 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </motion.div>

                {/* Project Context - Compact View */}
                <motion.div 
                  className={`bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md p-4 rounded-2xl border shadow-2xl transition-all duration-500 group hover:shadow-purple-500/25 relative overflow-hidden ${selectedProjectContext ? 'border-purple-500/50 shadow-purple-500/10' : 'border-neutral-700/60 hover:border-purple-400/60'}`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -4,
                    transition: { duration: 0.3 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold flex items-center text-neutral-100 group-hover:text-white transition-colors duration-300">
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-300" />
                      </motion.div>
                      Project Context
                    </h2>
                    <motion.button 
                      onClick={() => setShowProjectContextModal(true)}
                      className="px-3 py-1 bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-purple-600 hover:to-indigo-600 text-neutral-300 hover:text-white rounded-lg text-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedProjectContext ? 'Change' : 'Select'}
                    </motion.button>
                  </div>
                  
                  {selectedProjectContext ? (
                    <div className="mt-2">
                      <div className="flex items-center flex-wrap">
                        <span className="text-purple-300 flex-shrink-0">Project: 
                          <strong className="ml-1">{selectedProjectContext.name}</strong>
                        </span>
                        <span className="text-xs ml-2 px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-full">Active</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2">{selectedProjectContext.description}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-12 justify-center">
                      <p className="text-neutral-400 text-sm">No project context selected</p>
                    </div>
                  )}
                  
                  {/* Magical corner accent */}
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-600/8 to-pink-600/8 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </motion.div>

                {/* Template Selection - Compact View */}
                <motion.div 
                  className={`bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 backdrop-blur-md p-4 rounded-2xl border shadow-2xl transition-all duration-500 group hover:shadow-purple-500/25 relative overflow-hidden ${activeTemplateId ? 'border-indigo-500/50 shadow-indigo-500/10' : 'border-neutral-700/60 hover:border-purple-400/60'}`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -4,
                    transition: { duration: 0.3 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold flex items-center text-neutral-100 group-hover:text-white transition-colors duration-300">
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PuzzlePieceIcon className="h-5 w-5 mr-2 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-300" />
                      </motion.div>
                      Template
                    </h2>
                    <motion.button 
                      onClick={() => setShowTemplateModal(true)}
                      className="px-3 py-1 bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-purple-600 hover:to-indigo-600 text-neutral-300 hover:text-white rounded-lg text-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {activeTemplateId ? 'Change' : 'Select'}
                    </motion.button>
                  </div>
                  
                  {activeTemplateId ? (
                    <div className="mt-2">
                      <div className="flex items-center flex-wrap">
                        <p className="text-indigo-300 font-medium">Template active</p>
                        <span className="text-xs ml-2 px-2 py-0.5 bg-indigo-900/40 text-indigo-300 rounded-full">Applied</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-2">Structure applied to ticket</p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-12 justify-center">
                      <p className="text-neutral-400 text-sm">No template selected</p>
                    </div>
                  )}
                  
                  {/* Magical corner accent */}
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-indigo-600/8 to-cyan-600/8 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </motion.div>
              </div>
            </div>

            {/* Main Content - Two Columns with improved layout */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
              {/* Left Column - Unified Ticket Panel (60%) */}
              <div className="xl:col-span-3 space-y-4 sm:space-y-6">
                <UnifiedTicketPanel
                  initialMode={ticketMode}
                  selectedEpic={selectedTicket?.key || ''}
                  ref={unifiedTicketPanelRef}
                  teamContext={selectedProjectContext || undefined}
                  onRefine={(formData) => {
                    // Set loading state in chat before sending data
                    setChatHistory(currentChat => [
                      ...currentChat,
                      {role: 'assistant', text: "I'm analyzing your ticket and preparing refinements..."}
                    ]);
                    
                    // Trigger versioned mode - this will switch from form to version view
                    if (unifiedTicketPanelRef.current) {
                      unifiedTicketPanelRef.current.triggerVersionedMode(formData);
                      
                      // No automatic clarity score - let AI provide it when user interacts
                    }
                    
                    // Set the ticket data for version comparison logic
                    setTicketData(formData);
                    
                    // Add a detailed message to chat history about refinement
                    setTimeout(() => {
                      setChatHistory(currentChat => [
                        ...currentChat,
                        {role: 'assistant', text: "I've switched to version control mode. Your original ticket is now Version 1. You can now refine specific sections to create Version 2."}
                      ]);
                    }, 1500);
                  }}
                  onVersionChange={handleVersionChange}
                  showVersionComparison={showVersionComparison}
                  comparisonData={comparisonData}
                  acceptedSections={acceptedSections}
                  onAcceptChanges={handleAcceptChanges}
                  onRejectChanges={handleRejectChanges}
                  onCloseComparison={() => setShowVersionComparison(false)}
                  onReopenComparison={handleReopenComparison}
                />
              </div>

              {/* Right Column - AI Chat Interface (40%) */}
              <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                <div className="bg-neutral-900/70 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-neutral-800 shadow-lg flex flex-col h-[500px] md:h-[600px]">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
                    <ChatBubbleLeftIcon className="h-5 w-5 mr-2 text-purple-400" />
                    TicketWizard Assistant
                  </h2>
                  
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4" ref={(el) => {
                    // Auto-scroll to bottom when messages are added
                    if (el) {
                      setTimeout(() => {
                        el.scrollTop = el.scrollHeight;
                      }, 100);
                    }
                  }}>
                    {chatHistory.map((chat, index) => (
                      <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-3 ${
                          chat.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-blue-900/70 text-blue-100 rounded-tl-none'
                        }`}>
                          <div className="text-sm">
                            <MarkdownRenderer>{chat.text}</MarkdownRenderer>
                          </div>
                          
                          {/* Display selected sections if applicable */}
                          {chat.sections && chat.sections.length > 0 && chat.role === 'assistant' && (
                            <div className="mt-2 pt-2 border-t border-neutral-600">
                              <div className="text-xs text-neutral-400">Sections: </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {chat.sections.map(section => (
                                  <span key={section} className="px-2 py-0.5 bg-purple-900/40 text-purple-300 text-xs rounded">
                                    {section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chat Input */}
                  <form onSubmit={sendMessage} className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 p-3 rounded-lg bg-neutral-900/70 text-neutral-100 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ask TicketWizard anything..."
                    />
                    <button 
                      type="submit"
                      className="p-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 text-white transition-all active:scale-95"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dynamic Ticket Selection Modal - improved for mobile and accessibility */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden animate-fade-in-up"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal contents
            if (e.target === e.currentTarget) {
              setShowTicketModal(false);
            }
          }}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-neutral-900 z-10 py-2">
              <h2 className="text-xl font-semibold flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-400" />
                Select {getPlatformTerms().platform} {getPlatformTerms().ticket}
              </h2>
              <button
                onClick={() => setShowTicketModal(false)}
                aria-label="Close modal"
                className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            {/* Create New Button */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
              <h3 className="text-neutral-300 text-sm sm:text-base">Select existing ticket or create a new one</h3>
              <button 
                onClick={() => {
                  handleCreateNewTicket();
                  setShowTicketModal(false);
                }}
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-purple-600 hover:bg-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create New</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                placeholder={`Search existing ${getPlatformTerms().tickets.toLowerCase()}...`}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/70 text-neutral-200 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Recent Tickets */}
            {searchQuery === '' && recentTickets.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-sm font-medium text-neutral-300 mb-2 sm:mb-3 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-indigo-400" />
                  Recent Tickets
                </h3>
                <div className="space-y-2">
                  {recentTickets.slice(0, 3).map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        addToRecentTickets(ticket);
                        handleTicketSelection(ticket);
                        setShowTicketModal(false);
                      }}
                      className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-lg border border-neutral-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-indigo-400 font-mono text-sm">{ticket.key}</span>
                          {ticket.projectKey && (
                            <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-300 border border-green-700/50">
                              {ticket.projectKey}
                            </span>
                          )}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(ticket.key);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFavorite(ticket.key);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={favoriteTickets.includes(ticket.key) ? "Remove from favorites" : "Add to favorites"}
                            className="text-neutral-400 hover:text-yellow-400 transition-colors focus:outline-none cursor-pointer"
                          >
                            <StarIcon className={`h-4 w-4 ${favoriteTickets.includes(ticket.key) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          ticket.type === 'Story' ? 'bg-blue-900/50 text-blue-300' :
                          ticket.type === 'Task' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-red-900/50 text-red-300'
                        }`}>
                          {ticket.type}
                        </span>
                      </div>
                      <p className="text-neutral-300 text-sm truncate">{ticket.title}</p>
                      {ticket.project && (
                        <p className="text-neutral-500 text-xs mt-1">Project: {ticket.project}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {filteredTickets.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-sm font-medium text-neutral-300 mb-2 sm:mb-3">
                  {searchQuery ? `Search Results (${filteredTickets.length})` : 'All Tickets'}
                </h3>
                <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        addToRecentTickets(ticket);
                        handleTicketSelection(ticket);
                        setShowTicketModal(false);
                      }}
                      className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-lg border border-neutral-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <div className="flex flex-wrap items-start justify-between mb-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-indigo-400 font-mono text-sm">{ticket.key}</span>
                          {ticket.projectKey && (
                            <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-300 border border-green-700/50">
                              {ticket.projectKey}
                            </span>
                          )}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(ticket.key);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFavorite(ticket.key);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={favoriteTickets.includes(ticket.key) ? "Remove from favorites" : "Add to favorites"}
                            className="text-neutral-400 hover:text-yellow-400 transition-colors focus:outline-none cursor-pointer"
                          >
                            <StarIcon className={`h-4 w-4 ${favoriteTickets.includes(ticket.key) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            ticket.type === 'Story' ? 'bg-blue-900/50 text-blue-300' :
                            ticket.type === 'Task' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-red-900/50 text-red-300'
                          }`}>
                            {ticket.type}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            ticket.priority === 'High' ? 'bg-red-900/50 text-red-300' :
                            ticket.priority === 'Medium' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-green-900/50 text-green-300'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <p className="text-neutral-200 font-medium text-sm mb-1">{ticket.title}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                        <span>{ticket.project}</span>
                        {ticket.assignee && <span>@{ticket.assignee}</span>}
                        <span>{ticket.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {filteredTickets.length === 0 && searchQuery && (
              <div className="text-center py-6 text-neutral-400">
                <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tickets found matching &quot;{searchQuery}&quot;</p>
              </div>
            )}

            <div className="flex justify-end mt-4 sm:mt-6 border-t border-neutral-800 pt-4">
              <button
                onClick={() => {
                  setSearchQuery(''); // Clear search when closing
                  setShowTicketModal(false);
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Context Modal - Improved for mobile and accessibility */}
      {showProjectContextModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden animate-fade-in-up"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal contents
            if (e.target === e.currentTarget) {
              setShowProjectContextModal(false);
            }
          }}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-neutral-900 z-10 py-2">
              <h2 className="text-xl font-semibold flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-400" />
                Select Project Context
              </h2>
              <button
                onClick={() => setShowProjectContextModal(false)}
                aria-label="Close modal"
                className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4 bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3">
              <p className="text-neutral-300 text-sm">
                Team context helps the AI provide more relevant and accurate refinements for your Jira tickets.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                placeholder="Search project contexts..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/70 text-neutral-200 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={projectContextSearchQuery}
                onChange={(e) => setProjectContextSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Team Selection */}
            <div className="space-y-3 mb-6 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
              {filteredProjectContexts.length > 0 ? (
                filteredProjectContexts.map(projectContext => (
                <button
                  key={projectContext.id}
                  onClick={() => {
                    selectProjectContext(projectContext);
                    setShowProjectContextModal(false);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    selectedProjectContext?.id === projectContext.id 
                      ? 'bg-purple-900/20 border-purple-500/50 hover:bg-purple-900/30' 
                      : 'bg-neutral-800/70 border-neutral-700 hover:bg-neutral-700/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="font-medium text-neutral-200">{projectContext.name}</h3>
                    {selectedProjectContext?.id === projectContext.id && (
                      <span className="text-purple-400 text-xs px-2 py-0.5 bg-purple-900/40 rounded-full">Currently Selected</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400 mb-3">{projectContext.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="px-2 py-1 bg-neutral-900/50 rounded">
                      <span className="text-neutral-500">Project: </span>
                      <span className="text-neutral-300">{projectContext.projectInfo.substring(0, 20)}...</span>
                    </div>
                    <div className="px-2 py-1 bg-neutral-900/50 rounded">
                      <span className="text-neutral-500">Last Updated: </span>
                      <span className="text-neutral-300">{new Date(projectContext.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              ))) : (
                <div className="text-center py-6 text-neutral-400">
                  <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No project contexts found matching &quot;{projectContextSearchQuery}&quot;</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0 mt-4 border-t border-neutral-800 pt-4">
              <button
                onClick={() => {
                  selectProjectContext(null);
                  setShowProjectContextModal(false);
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowProjectContextModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal - Improved for mobile and accessibility */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden animate-fade-in-up"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal contents
            if (e.target === e.currentTarget) {
              setShowTemplateModal(false);
            }
          }}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-neutral-900 z-10 py-2">
              <h2 className="text-xl font-semibold flex items-center">
                <PuzzlePieceIcon className="h-5 w-5 mr-2 text-indigo-400" />
                Select Template
              </h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                aria-label="Close modal"
                className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Template Selection Component */}
            <div className="mb-6">
              <TemplateSelection 
                onTemplateSelect={(template) => {
                  handleTemplateSelect(template);
                  setShowTemplateModal(false);
                }}
                activeTemplateId={activeTemplateId}
                className=""
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0 mt-4 border-t border-neutral-800 pt-4">
              <button
                onClick={() => {
                  setActiveTemplateId(undefined);
                  setShowTemplateModal(false);
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
