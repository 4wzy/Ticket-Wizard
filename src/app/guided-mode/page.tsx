"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import NavHelper from '@/app/components/NavHelper';
import CursorEffects from '@/app/components/CursorEffects';
import TemplateSelection from '@/app/components/TemplateSelection';
import GuidedTicketEditor from '@/app/components/GuidedTicketEditor'; // New
import AiChatPanel from '@/app/components/AiChatPanel'; // New
import { 
    ChatBubbleLeftIcon, DocumentTextIcon, PlusIcon, CursorArrowRaysIcon, 
    UserGroupIcon, ChevronDownIcon, InformationCircleIcon, XMarkIcon, 
    MagnifyingGlassIcon, ClockIcon, StarIcon, PuzzlePieceIcon, ExclamationTriangleIcon, LinkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { Template } from '@/lib/templatesData';
import { convertFilesToBase64 } from '@/lib/fileHelpers';
import { platformManager } from '@/lib/platformManager';
import { PlatformType, PlatformTicket, PlatformRegistry } from '@/lib/platformApi';
// Backward compatibility
import { jiraApi, isJiraConnected, getJiraConnection } from '@/lib/jiraApiCompat';
import { authenticatedFetch } from '@/lib/api-client';
import { getUserSelectedModel } from '@/lib/ai-config';

// Project context interface
interface ProjectContext {
  id: string; name: string; description: string; abbreviations: Record<string, string>;
  terminology: Record<string, string>; projectInfo: string; standards: string;
  createdAt: string; updatedAt: string;
}
// Use universal platform ticket interface
interface Ticket extends PlatformTicket {
  // Add any guided-mode specific properties if needed
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
    epic: 'Demo Epic',
    labels: ['demo'],
    components: ['Demo'],
    lastModified: new Date().toISOString(),
    created: new Date().toISOString(),
    url: '#',
    platform: 'jira'
  }
];

// Guided Mode specific interfaces
interface GuidedJiraDetails {
  title: string;
  description: string;
  acceptanceCriteria: string;
  jiraKey?: string;
  jiraUrl?: string;
}

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  isLoading?: boolean;
  questions?: string[];
}

export default function GuidedMode() {
  const { user, userProfile, loading, userRole } = useAuth();
  const [config, setConfig] = useState({ cursorEffects: true });
  const [projectContexts, setProjectContexts] = useState<ProjectContext[]>([]);
  const [selectedProjectContextId, setSelectedProjectContextId] = useState<string | null>(null);
  const [selectedProjectContext, setSelectedProjectContext] = useState<ProjectContext | null>(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState<boolean>(false); // Retained if used by modal trigger
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [projectContextSearchQuery, setProjectContextSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [favoriteTickets, setFavoriteTickets] = useState<string[]>([]);
  const [showTicketModal, setShowTicketModal] = useState<boolean>(false);
  const [showProjectContextModal, setShowProjectContextModal] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filteredProjectContexts, setFilteredProjectContexts] = useState<ProjectContext[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Platform connection state
  const [platformConnected, setPlatformConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [allTickets, setAllTickets] = useState<Ticket[]>(mockTickets);
  const [currentPlatform, setCurrentPlatform] = useState<PlatformType | null>(null);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  // --- Guided Mode Specific State ---
  const [jiraDetails, setJiraDetails] = useState<GuidedJiraDetails>({
    title: '', description: '', acceptanceCriteria: '',
  });
  const [wizardScore, setWizardScore] = useState<number | null>(null);
  const [wizardScoreReasoning, setWizardScoreReasoning] = useState<string | null>(null);
  const [investBreakdown, setInvestBreakdown] = useState<{
    independent: number;
    negotiable: number;
    valuable: number;
    estimable: number;
    small: number;
    testable: number;
  } | null>(null);
  const [aiChatHistory, setAiChatHistory] = useState<AiChatMessage[]>([
    { id: 'init', role: 'assistant', text: "Hello! I'm TicketWizard. Fill in your ticket details or select an existing one, then click 'Start AI Guidance'." }
  ]);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');
  const [isGuidanceActive, setIsGuidanceActive] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
    
    const connected = platformManager.hasAnyConnection();
    const activePlatform = platformManager.getActivePlatform();
    const connectedPlatforms = platformManager.getConnectedPlatforms();
    
    // Debug logging
    console.log('🔍 Connection check:', {
      connected,
      activePlatform,
      connectedPlatforms,
      localStorage: typeof window !== 'undefined' ? localStorage.getItem('jira-connection') : 'SSR'
    });
    
    setPlatformConnected(connected);
    setCurrentPlatform(activePlatform);
    if (!connected) {
      setAllTickets(mockTickets);
      setConnectionError('Not connected to any platform. Connect in Settings to see real tickets.');
    } else {
      setConnectionError(null);
    }
    return connected;
  };

  // Load tickets from platform
  const loadTickets = async (searchType: 'recent' | 'search' = 'recent', query: string = '') => {
    if (!checkPlatformConnection()) {
      return;
    }

    setLoadingTickets(true);
    setConnectionError(null);

    try {
      // Use platform manager for universal ticket search - it will handle connection validation internally
      const tickets = await platformManager.searchTickets({
        searchType: searchType as 'recent' | 'search' | 'assigned',
        query,
        maxResults: 50
      });

      setAllTickets(tickets || []);
      
      // Update recent tickets for quick access
      if (searchType === 'recent') {
        setRecentTickets(tickets.slice(0, 5) || []);
      }
    } catch (error: any) {
      console.error('Error loading platform tickets:', error);
      setConnectionError(error.message);
      
      // If auth failed, suggest reconnection
      if (error.message.includes('Authentication failed')) {
        setConnectionError(`Authentication expired. Please reconnect to ${currentPlatform || 'your platform'} in Settings.`);
        setPlatformConnected(false);
      }
      setAllTickets(mockTickets);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Handle when user opens ticket selection modal
  const handleOpenTicketModal = () => {
    if (!checkPlatformConnection()) {
      // Show connection prompt
      setAiChatHistory(currentChat => [
        ...currentChat,
        {id: Date.now().toString(), role: 'assistant', text: `You need to connect to a platform first to access your tickets. Please go to Settings to connect your ${currentPlatform || 'preferred'} account.`}
      ]);
      return;
    }
    
    // Load recent tickets if connected
    loadTickets('recent');
    setShowTicketModal(true);
  };

  // --- Effects for managing selections (largely reused from original) ---
  // Load templates and project contexts from database
  const loadTemplatesAndProjectContexts = async () => {
    try {
      // Load template favorites from localStorage
      const savedFavorites = localStorage.getItem('template-favorites');
      const favoriteTemplateIds = savedFavorites ? JSON.parse(savedFavorites) : [];

      // Load templates
      const templatesResponse = await authenticatedFetch('/api/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        console.log('Templates received from API:', templatesData.templates?.length || 0, templatesData.templates);
        
        // Convert database template format to component format
        const convertedTemplates = (templatesData.templates || []).map((dbTemplate: any) => ({
          id: dbTemplate.id,
          name: dbTemplate.name,
          description: dbTemplate.description,
          category: dbTemplate.category || 'General',
          tags: dbTemplate.tags || [],
          createdBy: dbTemplate.created_by || 'Unknown',
          createdAt: dbTemplate.created_at,
          updatedAt: dbTemplate.updated_at,
          isPublic: dbTemplate.visibility_scope === 'global' || dbTemplate.visibility_scope === 'organization',
          isFavorite: favoriteTemplateIds.includes(dbTemplate.id),
          structure: {
            titleFormat: dbTemplate.title_format || '',
            descriptionFormat: dbTemplate.description_format || '',
            acceptanceCriteriaFormat: dbTemplate.acceptance_criteria_format || '',
            additionalFields: dbTemplate.additional_fields || {}
          }
        }));
        
        console.log('Converted templates:', convertedTemplates.length, convertedTemplates);
        setTemplates(convertedTemplates);
      } else {
        console.error('Failed to load templates:', templatesResponse.statusText);
      }

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
      console.error('Error loading templates and project contexts:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadTemplatesAndProjectContexts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectContextId && projectContexts.length > 0) {
      setSelectedProjectContext(projectContexts.find(ctx => ctx.id === selectedProjectContextId) || null);
    } else {
      setSelectedProjectContext(null);
    }
  }, [selectedProjectContextId, projectContexts]);

  useEffect(() => {
    // Load recent/favorite tickets from localStorage
    const savedRecent = localStorage.getItem('ticketwizard-recent-tickets');
    if (savedRecent) setRecentTickets(JSON.parse(savedRecent).slice(0,5));
    const savedFav = localStorage.getItem('ticketwizard-favorite-tickets');
    if (savedFav) setFavoriteTickets(JSON.parse(savedFav));

    // Load template from localStorage (e.g., if navigated from template page)
    const selectedTemplateData = localStorage.getItem('selectedTemplate');
    if (selectedTemplateData) {
      try {
        const template = JSON.parse(selectedTemplateData) as Template;
        localStorage.removeItem('selectedTemplate');
        if (!selectedTicket) { // If no ticket selected, imply creating new
            setIsCreatingNew(true);
        }
        setActiveTemplateId(template.id);
        // System message for chat
        setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Template "${template.name}" loaded from previous selection.` }]);
      } catch (error) { console.error('Error loading selected template from localStorage:', error); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Check platform connection on component mount
  useEffect(() => {
    checkPlatformConnection();
    
    // Load recent tickets if connected
    if (platformManager.hasAnyConnection()) {
      loadTickets('recent');
    }
  }, []);

  // Re-check connection status when window regains focus (e.g., navigating back from settings)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 Window focus event triggered');
      // Small delay to allow localStorage to sync after navigation
      setTimeout(() => {
        console.log('🔄 Re-checking connection after focus...');
        checkPlatformConnection();
        
        // Load recent tickets if now connected
        if (platformManager.hasAnyConnection()) {
          console.log('✅ Connection found, loading tickets...');
          loadTickets('recent').catch(error => {
            console.error('❌ Error loading tickets after focus:', error);
            // Don't throw - just log the error
          });
        } else {
          console.log('❌ No connection found after focus');
        }
      }, 100);
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Cursor management for guided mode
  useEffect(() => {
    if (config.cursorEffects) {
      document.body.classList.add('cursor-none');
    } else {
      document.body.classList.remove('cursor-none');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('cursor-none');
    };
  }, [config.cursorEffects]);

  // Filter tickets/teams for modals
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTickets([]);
      return;
    }

    // If connected to Jira, use API search; otherwise filter local tickets
    if (platformConnected) {
      // Debounce the API search to avoid too many requests
      const searchTimeout = setTimeout(() => {
        loadTickets('search', searchQuery).then(() => {
          // After loading search results, allTickets will be updated
          const q = searchQuery.toLowerCase();
          const filtered = allTickets.filter(t => 
            t.key.toLowerCase().includes(q) || 
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.project.toLowerCase().includes(q)
          );
          setFilteredTickets(filtered.slice(0, 10));
        });
      }, 500); // 500ms debounce

      return () => clearTimeout(searchTimeout);
    } else {
      // Fallback to local filtering for mock data
      const q = searchQuery.toLowerCase();
      setFilteredTickets(allTickets.filter(t => t.key.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)).slice(0, 10));
    }
  }, [searchQuery, platformConnected, allTickets]);
  useEffect(() => {
    if (!projectContextSearchQuery.trim()) { setFilteredProjectContexts(projectContexts); return; }
    const q = projectContextSearchQuery.toLowerCase();
    setFilteredProjectContexts(projectContexts.filter(ctx => ctx.name.toLowerCase().includes(q) || ctx.description.toLowerCase().includes(q)));
  }, [projectContextSearchQuery, projectContexts]);


  // --- Workflow Effects for Guided Mode ---
  useEffect(() => {
    // When a Jira ticket is selected or user decides to create new
    let initialDetails: GuidedJiraDetails = { title: '', description: '', acceptanceCriteria: '' };
    let chatMessage = "Let's create a new high-quality Jira ticket!";
    
    if (selectedTicket) {
      initialDetails = {
        title: selectedTicket.title,
        description: selectedTicket.description,
        // Attempt to find AC if structured, otherwise use part of description or leave blank
        acceptanceCriteria: selectedTicket.description.toLowerCase().includes("acceptance criteria:")
            ? selectedTicket.description.substring(selectedTicket.description.toLowerCase().indexOf("acceptance criteria:") + "acceptance criteria:".length).trim()
            : "",
        jiraKey: selectedTicket.key,
        jiraUrl: selectedTicket.url
      };
      chatMessage = `Selected ticket ${selectedTicket.key}. Review and click 'Start AI Guidance'.`;
      setIsCreatingNew(false);
    } else if (isCreatingNew) {
      // initialDetails already set to empty
    } else { // No ticket selected, not creating new -> effectively empty start
        chatMessage = "Fill in ticket details or select an existing one, then 'Start AI Guidance'.";
    }

    setJiraDetails(initialDetails);
    setWizardScore(null); // Reset score
    setIsGuidanceActive(false); // Reset guidance state
    // Keep existing chat history unless it's just the very first init message
    if(aiChatHistory.length > 1 || (aiChatHistory.length === 1 && aiChatHistory[0].id !== 'init')) {
        setAiChatHistory([{ id: 'init-selected', role: 'assistant', text: chatMessage }]);
    }
    // If a template is active and we're creating new or have no ticket, apply it
    if (activeTemplateId && (isCreatingNew || !selectedTicket)) {
        const template = templates.find(t => t.id === activeTemplateId);
        if (template && template.structure) {
             // Apply template respecting current user input if any, or use template as base
            const currentTitle = initialDetails.title || '';
            const currentDesc = initialDetails.description || '';
            const currentAc = initialDetails.acceptanceCriteria || '';

            const titleFormat = template.structure.titleFormat || '';
            const descFormat = template.structure.descriptionFormat || '';
            const acFormat = template.structure.acceptanceCriteriaFormat || '';

            initialDetails.title = titleFormat.replace(/{[^}]+}/g, (match) => currentTitle || match);
            initialDetails.description = descFormat.replace(/{[^}]+}/g, (match) => currentDesc || match);
            initialDetails.acceptanceCriteria = acFormat.replace(/{[^}]+}/g, (match) => currentAc || match);
            
            // If fields were completely empty, use template structure directly
            if(!currentTitle) initialDetails.title = titleFormat.replace(/{[^}]+}/g, '');
            if(!currentDesc) initialDetails.description = descFormat.replace(/{[^}]+}/g, '');
            if(!currentAc) initialDetails.acceptanceCriteria = acFormat.replace(/{[^}]+}/g, '');

            setJiraDetails(initialDetails);
             setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Template "${template.name}" applied to the new ticket.` }]);
        }
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket, isCreatingNew]); // Removed activeTemplateId, templates to avoid loop, handle template in its own effect

  useEffect(() => {
    // Apply template when activeTemplateId changes, for new tickets or if user wants to apply to existing
    if (activeTemplateId) {
        const template = templates.find(t => t.id === activeTemplateId);
        if (template && template.structure) {
            setJiraDetails(currentDetails => {
                // Intelligent merge: if user typed something, try to preserve it within template placeholders.
                // If placeholder like {Description}, and user typed "foo", it becomes "foo".
                // If template is "Details: {Details}", and user typed "bar", it becomes "Details: bar".
                // This is a simplified placeholder replacement.
                let newTitle = template.structure.titleFormat || '';
                let newDesc = template.structure.descriptionFormat || '';
                let newAc = template.structure.acceptanceCriteriaFormat || '';

                const replacePlaceholders = (format: string, value: string) => {
                    // Try to find a generic placeholder like {Description}, {Title}, etc.
                    const placeholderMatch = format.match(/{([^}]+)}/);
                    if (placeholderMatch && value) {
                        return format.replace(placeholderMatch[0], value);
                    }
                    return value || format.replace(/{[^}]+}/g, ''); // Fallback: use value or clear placeholders
                };

                return {
                    title: replacePlaceholders(newTitle, currentDetails.title),
                    description: replacePlaceholders(newDesc, currentDetails.description),
                    acceptanceCriteria: replacePlaceholders(newAc, currentDetails.acceptanceCriteria)
                };
            });
             setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Template "${template.name}" structure applied.` }]);
        }
    }
  }, [activeTemplateId, templates]);


  // --- Handlers ---
  const addToRecentTickets = (ticket: Ticket) => {
    const updatedRecent = [ticket, ...recentTickets.filter(t => t.id !== ticket.id)].slice(0, 5);
    setRecentTickets(updatedRecent);
    localStorage.setItem('ticketwizard-recent-tickets', JSON.stringify(updatedRecent));
  };

  const toggleFavorite = (ticketKey: string) => {
    const updatedFavorites = favoriteTickets.includes(ticketKey) ? favoriteTickets.filter(key => key !== ticketKey) : [...favoriteTickets, ticketKey];
    setFavoriteTickets(updatedFavorites);
    localStorage.setItem('ticketwizard-favorite-tickets', JSON.stringify(updatedFavorites));
  };
  
  const handleTicketSelection = (ticketData: Ticket) => { // Changed param type
    setSelectedTicket(ticketData);
    addToRecentTickets(ticketData);
    setIsCreatingNew(false); // Explicitly set when selecting an existing ticket
    setShowTicketModal(false); // Close modal
  };

  const handleCreateNewTicket = () => {
    setSelectedTicket(null); // Clear selected ticket
    setIsCreatingNew(true); // Set mode to creating new
    setShowTicketModal(false); // Close modal
  };
  
  const handleTemplateSelect = (template: Template) => {
    setActiveTemplateId(template.id);
    setSelectedTicket(null); // Clear selected ticket
    setIsCreatingNew(true); // Set mode to creating new
    setShowTemplateModal(false); // Close modal
    // Chat message is handled by useEffect for activeTemplateId or AI interaction
  };

  const selectProjectContext = (projectContext: ProjectContext | null) => {
    setSelectedProjectContext(projectContext);
    setSelectedProjectContextId(projectContext?.id || null);
    setShowProjectContextModal(false);
    if (projectContext) {
      setAiChatHistory(currentChat => [ ...currentChat, {id: Date.now().toString(), role: 'system', text: `Project context "${projectContext.name}" selected. AI will use this for refinements.`}]);
    } else {
      setAiChatHistory(currentChat => [ ...currentChat, {id: Date.now().toString(), role: 'system', text: "Project context cleared."}]);
    }
  };


  const handleJiraDetailsChange = (newDetails: GuidedJiraDetails) => {
    setJiraDetails(newDetails);
    if (isGuidanceActive) {
        // Maybe set a flag that user has manually edited after AI, for AI's context
    }
  };

  const handleStartAiGuidance = async () => {
    if (!jiraDetails.title && !jiraDetails.description) {
      setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: "Please provide at least a title or description before I can assist." }]);
      return;
    }
    setIsAiProcessing(true);
    setIsGuidanceActive(true);
    setAiChatHistory(prev => [...prev, { id: 'ai-processing-start', role: 'assistant', text: "Analyzing your Jira ticket...", isLoading: true }]);

    try {
      // Convert uploaded files to base64
      let filesData = [];
      if (uploadedFiles.length > 0) {
        try {
          filesData = await convertFilesToBase64(uploadedFiles);
        } catch (error) {
          console.error('Error converting files to base64:', error);
          setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-start'));
          setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'Error processing uploaded files. Please try again without files or with different files.' }]);
          setIsAiProcessing(false);
          setIsGuidanceActive(false);
          return;
        }
      }
      
      const response = await authenticatedFetch('/api/guided-refine/assess', {
        method: 'POST',
        body: JSON.stringify({ 
          jiraDetails, 
          teamContext: selectedProjectContext, 
          template: activeTemplateId ? templates.find(t => t.id === activeTemplateId) : null,
          files: filesData,
          selectedModel: getUserSelectedModel()
        }),
      });
      if (!response.ok) { 
        const err = await response.json(); 
        
        // Handle usage limit exceeded with proper messaging
        if (response.status === 429 && err.usage_limit_exceeded) {
          const isOrgAdmin = userRole?.isOrgAdmin || false;
          
          let errorMessage = '';
          if (isOrgAdmin) {
            errorMessage = `⚠️ Token limit reached! You've used ${err.current_usage?.toLocaleString()} of ${err.limit?.toLocaleString()} monthly tokens. Please upgrade your plan to continue.`;
          } else {
            errorMessage = `⚠️ Token limit reached! Your team has used ${err.current_usage?.toLocaleString()} of ${err.limit?.toLocaleString()} monthly tokens. Please contact your organization admin to upgrade.`;
          }
          
          setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-start'));
          setAiChatHistory(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'assistant', 
            text: errorMessage 
          }]);
          setIsAiProcessing(false);
          setIsGuidanceActive(false);
          return;
        }
        
        throw new Error(err.error || 'API assessment failed'); 
      }
      const data = await response.json();

      setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-start'));
      setWizardScore(data.wizardScore);
      setWizardScoreReasoning(data.wizardScoreReasoning);
      setInvestBreakdown(data.investBreakdown);
      const newAiMessages: AiChatMessage[] = [];
      if (data.updatedJiraDetails) { // AI might make initial subtle changes
        // Preserve jiraKey and jiraUrl when AI updates the details
        setJiraDetails({
          ...data.updatedJiraDetails,
          jiraKey: jiraDetails.jiraKey,
          jiraUrl: jiraDetails.jiraUrl
        });
        newAiMessages.push({id: Date.now().toString() + "-update", role: 'system', text: "AI made initial adjustments to the ticket."});
      }
      if (data.aiMessage) {
        let responseMessage = data.aiMessage;
        
        // Add file processing feedback if files were uploaded
        if (data.uploadedFiles > 0) {
          responseMessage += `\n\n*Successfully processed ${data.uploadedFiles} file(s) for context.*`;
        }
        if (data.fileErrors && data.fileErrors.length > 0) {
          responseMessage += `\n\n*File processing issues: ${data.fileErrors.join(', ')}*`;
        }
        
        newAiMessages.push({ id: Date.now().toString(), role: 'assistant', text: responseMessage, questions: data.questions });
      }
      setAiChatHistory(prev => [...prev, ...newAiMessages]);

    } catch (error: any) {
      console.error("Error starting AI guidance:", error);
      setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-start'));
      setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: `Sorry, an error occurred: ${error.message}` }]);
      setIsGuidanceActive(false); // Revert guidance active state on error
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSendUserResponse = async () => {
    if (!userInput.trim()) return;

    const newUserMessage: AiChatMessage = { id: Date.now().toString(), role: 'user', text: userInput };
    setAiChatHistory(prev => [...prev, newUserMessage, { id: 'ai-processing-response', role: 'assistant', text: "Thinking...", isLoading: true }]);
    setUserInput('');
    setIsAiProcessing(true);

    try {
      // Convert uploaded files to base64
      let filesData = [];
      if (uploadedFiles.length > 0) {
        try {
          filesData = await convertFilesToBase64(uploadedFiles);
        } catch (error) {
          console.error('Error converting files to base64:', error);
          setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-response'));
          setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'Error processing uploaded files. Please try again without files or with different files.' }]);
          setIsAiProcessing(false);
          return;
        }
      }
      
      const response = await authenticatedFetch('/api/guided-refine/respond', {
        method: 'POST',
        body: JSON.stringify({
          jiraDetails,
          chatHistory: [...aiChatHistory, newUserMessage], // Send up to and including new user message
          teamContext: selectedProjectContext,
          template: activeTemplateId ? templates.find(t => t.id === activeTemplateId) : null,
          files: filesData,
          selectedModel: getUserSelectedModel()
        }),
      });
      if (!response.ok) { 
        const err = await response.json(); 
        
        // Handle usage limit exceeded with proper messaging
        if (response.status === 429 && err.usage_limit_exceeded) {
          const isOrgAdmin = userRole?.isOrgAdmin || false;
          
          let errorMessage = '';
          if (isOrgAdmin) {
            errorMessage = `⚠️ Token limit reached! You've used ${err.current_usage?.toLocaleString()} of ${err.limit?.toLocaleString()} monthly tokens. Please upgrade your plan to continue.`;
          } else {
            errorMessage = `⚠️ Token limit reached! Your team has used ${err.current_usage?.toLocaleString()} of ${err.limit?.toLocaleString()} monthly tokens. Please contact your organization admin to upgrade.`;
          }
          
          setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-response'));
          setAiChatHistory(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'assistant', 
            text: errorMessage 
          }]);
          setIsAiProcessing(false);
          return;
        }
        
        throw new Error(err.error || 'API response failed'); 
      }
      const data = await response.json();

      setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-response'));
      if (data.updatedJiraDetails) {
        // Preserve jiraKey and jiraUrl when AI updates the details
        setJiraDetails({
          ...data.updatedJiraDetails,
          jiraKey: jiraDetails.jiraKey,
          jiraUrl: jiraDetails.jiraUrl
        });
      }
      setWizardScore(data.wizardScore);
      setWizardScoreReasoning(data.wizardScoreReasoning);
      setInvestBreakdown(data.investBreakdown);
      const newAiMessages: AiChatMessage[] = [];
      if (data.updatedJiraDetails) {
         newAiMessages.push({id: Date.now().toString() + "-update", role: 'system', text: "Jira ticket has been updated by AI based on your input."});
      }
      if (data.aiMessage) {
         let responseMessage = data.aiMessage;
         
         // Add file processing feedback if files were uploaded
         if (data.uploadedFiles > 0) {
           responseMessage += `\n\n*Successfully processed ${data.uploadedFiles} file(s) for context.*`;
         }
         if (data.fileErrors && data.fileErrors.length > 0) {
           responseMessage += `\n\n*File processing issues: ${data.fileErrors.join(', ')}*`;
         }
         
         newAiMessages.push({ id: Date.now().toString(), role: 'assistant', text: responseMessage, questions: data.questions });
      }
      setAiChatHistory(prev => [...prev, ...newAiMessages]);

    } catch (error: any) {
      console.error("Error sending user response:", error);
      setAiChatHistory(prev => prev.filter(m => m.id !== 'ai-processing-response'));
      setAiChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: `Sorry, an error occurred: ${error.message}` }]);
    } finally {
      setIsAiProcessing(false);
    }
  };
  

  // Auth loading/redirect
  if (loading) return <div className="text-center mt-10 text-neutral-300">Loading authentication...</div>;
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/login'; return null; }
  
  // Check if user needs to complete signup
  if (user && !userProfile && !loading) { 
    if (typeof window !== 'undefined') window.location.href = '/complete-signup'; 
    return null; 
  }


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Enhanced Magical Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Multi-layered magical gradient orbs */}
        <motion.div 
          className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/15 to-purple-600/15 rounded-full blur-3xl"
          animate={{
            x: [0, 90, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[320px] h-[320px] bg-gradient-to-r from-indigo-600/12 to-cyan-600/12 rounded-full blur-2xl"
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 rounded-full blur-xl"
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.25, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6
          }}
        />

        {/* Enhanced magical floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 5 === 0 
                ? 'w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-400' 
                : i % 5 === 1 
                ? 'w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400'
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
              y: [null, -80, 20, 0],
              x: [null, Math.random() * 40 - 20, 0],
              opacity: [0, 0.8, 0.3, 0],
              scale: [0.2, 2.2, 1.5, 0.2],
              rotate: [0, 360]
            }}
            transition={{
              duration: 12 + Math.random() * 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 8,
            }}
          />
        ))}

        {/* Enhanced animated grid pattern */}
        <motion.div 
          className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.04)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Magical spotlight effects */}
        <motion.div 
          className="absolute top-1/3 left-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/8 to-indigo-500/8 rounded-full blur-3xl"
          animate={{
            x: [-70, 70, -70],
            y: [-40, 40, -40],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Radial gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-slate-950/10 to-slate-950/30"></div>
      </div>

      <CursorEffects enabled={config.cursorEffects} />
      <NavHelper />
      <div className="fixed top-25 right-5 z-50"> {/* Ensure top-25 is defined or adjust */}
        <button 
            onClick={() => setConfig(prev => ({ ...prev, cursorEffects: !prev.cursorEffects }))}
            className={`p-2 rounded-full ${config.cursorEffects ? 'bg-purple-600 text-white' : 'bg-neutral-700 text-neutral-300'}`}
            title={config.cursorEffects ? "Disable cursor effects" : "Enable cursor effects"}
        >
          <CursorArrowRaysIcon className="h-6 w-6" />
        </button>
      </div>

      <main className="flex-1 flex pt-16"> {/* Added pt-16 assuming NavHelper has fixed height */}
        <CollapsibleSidebar />
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto"> {/* Removed animate-subtle-glow, add if desired */}
            <motion.h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 flex items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.span
                animate={{
                  textShadow: [
                    "0 0 0px rgba(147, 51, 234, 0)",
                    "0 0 20px rgba(147, 51, 234, 0.3)",
                    "0 0 0px rgba(147, 51, 234, 0)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                ✨ Guided Mode
              </motion.span>
              <motion.span 
                className="ml-3 text-xs font-normal rounded-full bg-gradient-to-r from-indigo-900/40 to-purple-900/40 text-indigo-300 px-3 py-1.5 hidden md:inline-block shadow-lg border border-indigo-700/50 backdrop-blur-sm"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                AI-Driven Refinement
              </motion.span>
            </motion.h1>

            {/* Compact selection section (Jira, Team, Template) - Reused from original */}
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Platform Ticket Selection */}
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
                      <div className="flex items-center space-x-2 mb-1 overflow-hidden"><span className="text-green-400 font-mono text-sm flex-shrink-0">{selectedTicket.key}</span><span className="text-neutral-200 font-medium truncate">{selectedTicket.title}</span></div>
                      <span className={`px-2 py-1 rounded text-xs inline-block mt-1 ${selectedTicket.type === 'Story' ? 'bg-blue-900/50 text-blue-300' : selectedTicket.type === 'Task' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>{selectedTicket.type}</span>
                      {selectedTicket.status && <span className="px-2 py-1 rounded text-xs inline-block mt-1 ml-2 bg-purple-900/50 text-purple-300">{selectedTicket.status}</span>}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-neutral-400 text-sm">{isCreatingNew ? "Creating new ticket..." : "No ticket selected"}</p>
                      {!isCreatingNew && <button onClick={handleCreateNewTicket} className="px-3 py-1 min-w-[72px] text-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"><PlusIcon className="w-3 h-3" /><span>New</span></button>}
                    </div>
                  )}
                  
                  {/* Connection Status Indicator */}
                  {connectionError && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2 text-xs">
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-400">{connectionError}</span>
                        <a href="/settings" className="text-indigo-400 hover:text-indigo-300 underline">
                          Settings
                        </a>
                      </div>
                      <button 
                        onClick={() => {
                          console.log('🔄 Manual connection refresh triggered');
                          checkPlatformConnection();
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                      >
                        Refresh Connection
                      </button>
                    </div>
                  )}
                  {!connectionError && platformConnected && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      <LinkIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-green-400">Connected to {getPlatformTerms().platform}</span>
                    </div>
                  )}
                  
                  {/* Magical corner accent */}
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-600/10 to-indigo-600/10 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </motion.div>
                {/* Project Context */}
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
                            <div className="flex items-center flex-wrap"><span className="text-purple-300 flex-shrink-0">Project: <strong className="ml-1">{selectedProjectContext.name}</strong></span><span className="text-xs ml-2 px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-full">Active</span></div>
                            <p className="text-xs text-neutral-400 mt-2 line-clamp-2">{selectedProjectContext.description}</p>
                        </div>
                    ) : (<div className="flex flex-col h-12 justify-center"><p className="text-neutral-400 text-sm">No project context selected</p></div>)}
                    
                    {/* Magical corner accent */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-600/8 to-pink-600/8 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </motion.div>
                {/* Template Selection */}
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
                            <div className="flex items-center flex-wrap"><p className="text-indigo-300 font-medium">{templates.find(t=>t.id === activeTemplateId)?.name || "Template Active"}</p><span className="text-xs ml-2 px-2 py-0.5 bg-indigo-900/40 text-indigo-300 rounded-full">Applied</span></div>
                            <p className="text-xs text-neutral-400 mt-2">Structure applied to ticket editor.</p>
                        </div>
                    ) : (<div className="flex flex-col h-12 justify-center"><p className="text-neutral-400 text-sm">No template selected</p></div>)}
                    
                    {/* Magical corner accent */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-indigo-600/8 to-cyan-600/8 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </motion.div>
              </div>
            </div>

            {/* Main Content - Two Columns with magical animations */}
            <motion.div 
              className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="xl:col-span-3 space-y-4 sm:space-y-6">
                <GuidedTicketEditor
                  jiraDetails={jiraDetails}
                  onDetailsChange={handleJiraDetailsChange}
                  isAiProcessing={isAiProcessing}
                  onStartGuidance={handleStartAiGuidance}
                  wizardScore={wizardScore}
                  wizardScoreReasoning={wizardScoreReasoning}
                  investBreakdown={investBreakdown}
                  isGuidanceActive={isGuidanceActive}
                  onFilesChange={setUploadedFiles}
                />
              </div>
              <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                <AiChatPanel
                  chatHistory={aiChatHistory}
                  userInput={userInput}
                  onUserInput={setUserInput}
                  onSendMessage={handleSendUserResponse}
                  isAiProcessing={isAiProcessing}
                  isGuidanceActive={isGuidanceActive}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Modals (Jira, Team, Template) - Reused from original */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={(e) => e.target === e.currentTarget && setShowTicketModal(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* ... (modal header and create new button) ... */}
            <div className="relative mb-4 sm:mb-6"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" /></div><input type="text" placeholder="Search existing tickets..." className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/70 text-neutral-200 border border-neutral-800 focus:ring-2 focus:ring-purple-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus /></div>
            
            {/* Recent Tickets - FIX APPLIED HERE */}
            {searchQuery === '' && recentTickets.length > 0 && (
                <div className="mb-4 sm:mb-6">
                    <h3 className="text-sm font-medium text-neutral-300 mb-2 sm:mb-3 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-indigo-400" />Recent Tickets
                    </h3>
                    <div className="space-y-2">
                        {recentTickets.slice(0, 3).map(ticket => (
                            <button 
                                key={ticket.id} 
                                onClick={() => handleTicketSelection(ticket)} 
                                className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-lg border border-neutral-700 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/70 transition-colors"
                            >
                                <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-indigo-400 font-mono text-sm">{ticket.key}</span>
                                        {ticket.projectKey && (
                                            <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-300 border border-green-700/50">
                                                {ticket.projectKey}
                                            </span>
                                        )}
                                        {/* Changed inner button to a div with role="button" */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(ticket.key);}}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); toggleFavorite(ticket.key);}}}
                                            aria-label={favoriteTickets.includes(ticket.key) ? "Remove from favorites" : "Add to favorites"}
                                            className="p-1 rounded-full text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700/30 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                        >
                                            <StarIcon className={`h-4 w-4 ${favoriteTickets.includes(ticket.key) ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-500'}`} />
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${ticket.type === 'Story' ? 'bg-blue-900/50 text-blue-300' : ticket.type === 'Task' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>{ticket.type}</span>
                                </div>
                                <p className="text-neutral-200 font-medium text-sm mb-1">{ticket.title}</p>
                                {ticket.project && (
                                    <p className="text-neutral-500 text-xs mt-1">Project: {ticket.project}</p>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Filtered Tickets - FIX APPLIED HERE */}
            {(searchQuery || filteredTickets.length > 0) && ! (searchQuery === '' && recentTickets.length > 0) && ( // Avoid double listing if recent also matches search
                <div className="mb-4 sm:mb-6">
                    <h3 className="text-sm font-medium text-neutral-300 mb-2 sm:mb-3">
                        {searchQuery ? `Search Results (${filteredTickets.length})` : 'All Tickets'}
                    </h3>
                    <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800/50">
                        {filteredTickets.map(ticket => (
                            <button 
                                key={ticket.id} 
                                onClick={() => handleTicketSelection(ticket)} 
                                className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-lg border border-neutral-700 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/70 transition-colors"
                            >
                                <div className="flex flex-wrap items-start justify-between mb-2 gap-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-indigo-400 font-mono text-sm">{ticket.key}</span>
                                        {ticket.projectKey && (
                                            <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-300 border border-green-700/50">
                                                {ticket.projectKey}
                                            </span>
                                        )}
                                        {/* Changed inner button to a div with role="button" */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(ticket.key);}}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); toggleFavorite(ticket.key);}}}
                                            aria-label={favoriteTickets.includes(ticket.key) ? "Remove from favorites" : "Add to favorites"}
                                            className="p-1 rounded-full text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700/30 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                        >
                                            <StarIcon className={`h-4 w-4 ${favoriteTickets.includes(ticket.key) ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-500'}`} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs ${ticket.type === 'Story' ? 'bg-blue-900/50 text-blue-300' : ticket.type === 'Task' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>{ticket.type}</span>
                                        <span className={`px-2 py-1 rounded text-xs ${ticket.priority === 'High' || ticket.priority === 'Highest' ? 'bg-red-900/50 text-red-300' : ticket.priority === 'Medium' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-green-900/50 text-green-300'}`}>{ticket.priority}</span>
                                    </div>
                                </div>
                                <p className="text-neutral-200 font-medium text-sm mb-1">{ticket.title}</p>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                                    <span>{ticket.project}</span>{ticket.assignee && <span>@{ticket.assignee}</span>}<span>{ticket.status}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {filteredTickets.length === 0 && searchQuery && (<div className="text-center py-6 text-neutral-400"><MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No tickets found matching "{searchQuery}"</p></div>)}
            <div className="flex justify-end mt-4 sm:mt-6 border-t border-neutral-800 pt-4"><button onClick={() => { setSearchQuery(''); setShowTicketModal(false); }} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg">Cancel</button></div>
          </div>
        </div>
      )}
      {showProjectContextModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={(e) => e.target === e.currentTarget && setShowProjectContextModal(false)}>
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-neutral-900 z-10 py-2"><h2 className="text-xl font-semibold flex items-center text-neutral-100"><UserGroupIcon className="h-5 w-5 mr-2 text-indigo-400" /> Select Project Context</h2><button onClick={() => setShowProjectContextModal(false)} className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"><XMarkIcon className="h-5 w-5" /></button></div>
                  <div className="mb-4 bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3"><p className="text-neutral-300 text-sm">Project context helps AI provide relevant refinements.</p></div>
                  <div className="relative mb-4"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" /></div><input type="text" placeholder="Search project contexts..." className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/70 text-neutral-200 border border-neutral-800 focus:ring-2 focus:ring-purple-500" value={projectContextSearchQuery} onChange={(e) => setProjectContextSearchQuery(e.target.value)} autoFocus /></div>
                  <div className="space-y-3 mb-6 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
                      {filteredProjectContexts.length > 0 ? filteredProjectContexts.map(projectContext => (<button key={projectContext.id} onClick={() => selectProjectContext(projectContext)} className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedProjectContext?.id === projectContext.id ? 'bg-purple-900/20 border-purple-500/50' : 'bg-neutral-800/70 border-neutral-700 hover:bg-neutral-700/70'}`}><div className="flex items-center justify-between mb-2 flex-wrap gap-2"><h3 className="font-medium text-neutral-200">{projectContext.name}</h3>{selectedProjectContext?.id === projectContext.id && (<span className="text-purple-400 text-xs px-2 py-0.5 bg-purple-900/40 rounded-full">Selected</span>)}</div><p className="text-sm text-neutral-400 mb-3">{projectContext.description}</p></button>)) : (<div className="text-center py-6 text-neutral-400"><MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No project contexts found matching "{projectContextSearchQuery}"</p></div>)}
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-4 border-t border-neutral-800 pt-4"><button onClick={() => selectProjectContext(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg">Clear</button><button onClick={() => setShowProjectContextModal(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg">Cancel</button></div>
              </div>
          </div>
      )}
      {showTemplateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={(e) => e.target === e.currentTarget && setShowTemplateModal(false)}>
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-neutral-900 z-10 py-2"><h2 className="text-xl font-semibold flex items-center text-neutral-100"><PuzzlePieceIcon className="h-5 w-5 mr-2 text-indigo-400" /> Select Template</h2><button onClick={() => setShowTemplateModal(false)} className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"><XMarkIcon className="h-5 w-5" /></button></div>
                  <div className="mb-6"><TemplateSelection onTemplateSelect={handleTemplateSelect} activeTemplateId={activeTemplateId} className="" /></div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-4 border-t border-neutral-800 pt-4"><button onClick={() => {setActiveTemplateId(undefined); setShowTemplateModal(false);}} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg">Clear</button><button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg">Cancel</button></div>
              </div>
          </div>
      )}

    </div>
  );
}