"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon, 
  CheckIcon, 
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  DocumentCheckIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  ArrowPathRoundedSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { TicketData } from './TicketForm';
import InvestScore from './InvestScore';
import { convertFilesToBase64, FileData } from '@/lib/fileHelpers';
import { getUserSelectedModel } from '@/lib/ai-config';
import { authenticatedFetch } from '@/lib/api-client';

interface TeamContext {
  id: string;
  name: string;
  description: string;
  abbreviations: Record<string, string>;
  terminology: Record<string, string>;
  projectInfo: string;
  standards: string;
}

interface InvestCriteria {
  independent: number;
  negotiable: number;
  valuable: number;
  estimable: number;
  small: number;
  testable: number;
}

interface VersionedTicketProps {
  initialData: TicketData;
  onVersionChange?: (version: number, refinedSections?: TicketSection[]) => void;
  onBackToForm?: () => void;
  teamContext?: TeamContext;
  uploadedFiles?: File[];
}

export interface VersionedTicketRef {
  getCurrentVersionData: () => TicketData;
  updateCurrentVersion: (data: TicketData) => void;
  getVersionByIndex: (index: number) => TicketData | null;
  getAllVersions: () => TicketVersion[];
  setClarityScore: (score: number | null, reasoning?: string | null, investBreakdown?: InvestCriteria | null) => void;
  createNewVersionFromChat: (updatedData: TicketData, chatMessage: string, changedSections: string[], clarityScore?: number | null, clarityScoreReasoning?: string | null, investBreakdown?: InvestCriteria | null) => number;
}

// Define the ticket sections that can be refined
type TicketSection = 'title' | 'description' | 'acceptanceCriteria';

interface TicketVersion extends TicketData {
  timestamp: Date;
  changes: TicketSection[];
  aiPrompt?: string;
  clarityScore?: number | null;
  clarityScoreReasoning?: string | null;
  investBreakdown?: InvestCriteria | null;
  improvementSummary?: string | null;
}

const VersionedTicket = forwardRef<VersionedTicketRef, VersionedTicketProps>(({ initialData, onVersionChange, onBackToForm, teamContext, uploadedFiles = [] }, ref) => {
  const [versions, setVersions] = useState<TicketVersion[]>([
    { ...initialData, timestamp: new Date(), changes: ['title', 'description', 'acceptanceCriteria'], clarityScore: null, clarityScoreReasoning: null, investBreakdown: null, improvementSummary: null }
  ]);
  const [currentVersion, setCurrentVersion] = useState<number>(0);
  const [selectedSections, setSelectedSections] = useState<TicketSection[]>([]);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [sectionHover, setSectionHover] = useState<TicketSection | null>(null);
  const [lastSelectedSection, setLastSelectedSection] = useState<TicketSection | null>(null);
  const [isShowingHistory, setIsShowingHistory] = useState<boolean>(false);
  const [highlightedVersion, setHighlightedVersion] = useState<number | null>(null);
  
  // New states for editing functionality
  const [editingSections, setEditingSections] = useState<Set<TicketSection>>(new Set());
  const [editValues, setEditValues] = useState<Partial<TicketData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [clarityScore, setClarityScore] = useState<number | null>(null);
  const [clarityScoreReasoning, setClarityScoreReasoning] = useState<string | null>(null);
  const [investBreakdown, setInvestBreakdown] = useState<InvestCriteria | null>(null);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const particlesRef = useRef<Map<string, HTMLElement[]>>(new Map());

  // Clarity score will be set from API responses
  const cursorParticlesRef = useRef<HTMLDivElement[]>([]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getCurrentVersionData: () => {
      const currentTicket = versions[currentVersion];
      return {
        title: currentTicket.title,
        description: currentTicket.description,
        acceptanceCriteria: currentTicket.acceptanceCriteria,
        jiraKey: currentTicket.jiraKey,
        jiraUrl: currentTicket.jiraUrl
      };
    },
    updateCurrentVersion: (data: TicketData) => {
      const updatedVersions = [...versions];
      updatedVersions[currentVersion] = {
        ...updatedVersions[currentVersion],
        ...data,
        timestamp: new Date()
      };
      setVersions(updatedVersions);
    },
    getVersionByIndex: (index: number) => {
      if (index < 0 || index >= versions.length) {
        return null;
      }
      const version = versions[index];
      return {
        title: version.title,
        description: version.description,
        acceptanceCriteria: version.acceptanceCriteria,
        jiraKey: version.jiraKey,
        jiraUrl: version.jiraUrl
      };
    },
    getAllVersions: () => {
      return [...versions];
    },
    setClarityScore: (score: number | null, reasoning?: string | null, investBreakdown?: InvestCriteria | null) => {
      // Update the clarity score for the current version
      setVersions(prevVersions => {
        const updatedVersions = [...prevVersions];
        if (updatedVersions[currentVersion]) {
          updatedVersions[currentVersion] = {
            ...updatedVersions[currentVersion],
            clarityScore: score,
            clarityScoreReasoning: reasoning || null,
            investBreakdown: investBreakdown || null
          };
        }
        return updatedVersions;
      });
      // Also update the standalone clarity score state for immediate UI updates
      setClarityScore(score);
      setClarityScoreReasoning(reasoning || null);
      setInvestBreakdown(investBreakdown || null);
    },
    createNewVersionFromChat: (updatedData: TicketData, chatMessage: string, changedSections: string[], clarityScore?: number | null, clarityScoreReasoning?: string | null, investBreakdown?: InvestCriteria | null) => {
      // Create a new version with the updated data from chat
      const newVersion: TicketVersion = {
        title: updatedData.title,
        description: updatedData.description,
        acceptanceCriteria: updatedData.acceptanceCriteria,
        timestamp: new Date(),
        changes: changedSections as TicketSection[],
        aiPrompt: `Chat update: ${chatMessage.substring(0, 50)}${chatMessage.length > 50 ? '...' : ''}`,
        clarityScore: clarityScore || null,
        clarityScoreReasoning: clarityScoreReasoning || null,
        investBreakdown: investBreakdown || null,
        improvementSummary: `AI updated ${changedSections.join(', ')} based on chat conversation`
      };
      
      // Add the new version and switch to it
      setVersions(prevVersions => {
        const newVersions = [...prevVersions, newVersion];
        const newVersionIndex = newVersions.length - 1;
        
        // Update current version index
        setTimeout(() => {
          setCurrentVersion(newVersionIndex);
          
          // Update clarity score to match the new version
          setClarityScore(newVersion.clarityScore || null);
          setClarityScoreReasoning(newVersion.clarityScoreReasoning || null);
          setInvestBreakdown(newVersion.investBreakdown || null);
          
          // Notify parent component with version number and changed sections
          if (onVersionChange) {
            onVersionChange(newVersionIndex, changedSections as TicketSection[]);
          }
        }, 0);
        
        return newVersions;
      });
      
      // Return the new version index
      return versions.length; // This will be the index of the new version
    }
  }));

  // Handle editing functions
  const startEditing = (section: TicketSection) => {
    if (!isLatestVersion) return; // Only allow editing the latest version
    
    const currentTicket = versions[currentVersion];
    setEditingSections(prev => new Set([...prev, section]));
    setEditValues(prev => ({
      ...prev,
      [section]: currentTicket[section]
    }));
  };

  const cancelEditing = (section: TicketSection) => {
    setEditingSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(section);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[section];
      return newValues;
    });
    
    // Check if there are still unsaved changes
    const hasChanges = Object.keys(editValues).length > 1 || (Object.keys(editValues).length === 1 && !editValues[section]);
    setHasUnsavedChanges(hasChanges);
  };

  const saveEdit = (section: TicketSection) => {
    const newValue = editValues[section];
    if (newValue === undefined) return;

    const currentTicket = versions[currentVersion];
    const updatedTicket = {
      ...currentTicket,
      [section]: newValue,
      timestamp: new Date(),
      changes: [...(currentTicket.changes || []), section].filter((item, index, arr) => arr.indexOf(item) === index)
    };

    const updatedVersions = [...versions];
    updatedVersions[currentVersion] = updatedTicket;
    setVersions(updatedVersions);

    // Clean up edit state
    setEditingSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(section);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[section];
      return newValues;
    });
    
    // Check for remaining unsaved changes
    const remainingChanges = Object.keys(editValues).filter(key => key !== section);
    setHasUnsavedChanges(remainingChanges.length > 0);
  };

  const handleEditChange = (section: TicketSection, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [section]: value
    }));
    setHasUnsavedChanges(true);
  };

  const saveAllEdits = () => {
    if (Object.keys(editValues).length === 0) return;

    const currentTicket = versions[currentVersion];
    const updatedTicket = {
      ...currentTicket,
      ...editValues,
      timestamp: new Date(),
      changes: [...(currentTicket.changes || []), ...Object.keys(editValues)].filter((item, index, arr) => arr.indexOf(item) === index) as TicketSection[]
    };

    const updatedVersions = [...versions];
    updatedVersions[currentVersion] = updatedTicket;
    setVersions(updatedVersions);

    // Clear edit state
    setEditingSections(new Set());
    setEditValues({});
    setHasUnsavedChanges(false);
  };

  const discardAllEdits = () => {
    setEditingSections(new Set());
    setEditValues({});
    setHasUnsavedChanges(false);
  };

  // Creates particle effects for selection with improved implementation
  const createSelectionParticles = useCallback((section: TicketSection) => {
    if (typeof document !== 'undefined') {
      const sectionEl = document.querySelector(`[data-section="${section}"]`);
      if (sectionEl) {
        // Create a container for particles with relative positioning
        const particleContainer = document.createElement('div');
        particleContainer.style.position = 'absolute';
        particleContainer.style.inset = '0';
        particleContainer.style.overflow = 'hidden';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '10';
        particleContainer.className = 'particle-container';
        sectionEl.appendChild(particleContainer);
        
        // Store particles for this section
        const sectionParticles: HTMLElement[] = [];
        if (particlesRef.current.has(section)) {
          // Clean up any existing particles for this section
          const existingParticles = particlesRef.current.get(section) || [];
          existingParticles.forEach(p => p.remove());
        }
        particlesRef.current.set(section, sectionParticles);
        
        // Create particles
        for (let i = 0; i < 12; i++) {
          const particle = document.createElement('div');
          const size = Math.random() * 8 + 4;
          const rect = sectionEl.getBoundingClientRect();
          const startX = Math.random() * rect.width;
          const startY = Math.random() * rect.height;
          
          particle.style.position = 'absolute';
          particle.style.width = `${size}px`;
          particle.style.height = `${size}px`;
          particle.style.left = `${startX}px`;
          particle.style.top = `${startY}px`;
          particle.style.background = `rgba(168, 85, 247, ${Math.random() * 0.5 + 0.5})`;
          particle.style.borderRadius = '50%';
          particle.style.boxShadow = '0 0 8px rgba(168, 85, 247, 0.8)';
          particle.style.pointerEvents = 'none';
          particle.style.zIndex = '10';
          
          // Animation with more dramatic effect
          const animation = particle.animate(
            [
              { opacity: 1, transform: `translate(0, 0) scale(1)` },
              { opacity: 0, transform: `translate(${Math.random() * 160 - 80}px, ${Math.random() * -120}px) scale(0)` }
            ],
            {
              duration: Math.random() * 1200 + 800,
              easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
            }
          );
          
          particleContainer.appendChild(particle);
          sectionParticles.push(particle);
          
          // Remove after animation completes
          animation.onfinish = () => {
            if (particle.parentNode) {
              particle.parentNode.removeChild(particle);
              
              // Clean up the reference
              const currentParticles = particlesRef.current.get(section) || [];
              const updatedParticles = currentParticles.filter(p => p !== particle);
              particlesRef.current.set(section, updatedParticles);
              
              // If all particles are done, remove the container
              if (updatedParticles.length === 0 && particleContainer.parentNode) {
                particleContainer.parentNode.removeChild(particleContainer);
              }
            }
          };
        }
      }
    }
  }, []);
  
  // Create cursor trail effect
  useEffect(() => {
    const createCursorParticle = (e: MouseEvent) => {
      if (!document.querySelector('.section-selected:hover')) {
        return; // Only create particles when hovering over selected sections
      }
      
      const particle = document.createElement('div');
      particle.className = 'cursor-particle';
      
      const size = Math.random() * 10 + 5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${e.clientX}px`;
      particle.style.top = `${e.clientY}px`;
      
      document.body.appendChild(particle);
      cursorParticlesRef.current.push(particle);
      
      // Remove the particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
          cursorParticlesRef.current = cursorParticlesRef.current.filter(p => p !== particle);
        }
      }, 800);
    };
    
    // Create particle every 100ms (throttled)
    let lastTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime > 100) {
        lastTime = now;
        createCursorParticle(e);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      // Clean up any remaining particles
      cursorParticlesRef.current.forEach(p => {
        if (p.parentNode) {
          p.parentNode.removeChild(p);
        }
      });
      cursorParticlesRef.current = [];
    };
  }, []);
  
  // Toggle section selection with enhanced feedback
  const toggleSection = (section: TicketSection) => {
    // Don't allow selection if not viewing the latest version
    if (!isLatestVersion) {
      return;
    }
    
    // Track the last selected section for animation
    setLastSelectedSection(section);
    
    // Play selection sound effect 
    if (typeof window !== 'undefined') {
      try {
        const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = selectedSections.includes(section) ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(
          selectedSections.includes(section) ? 450 : 650, 
          audioContext.currentTime
        );
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch {
        console.log('Web Audio API not supported');
      }
    }
    
    // Toggle selection
    if (selectedSections.includes(section)) {
      setSelectedSections(selectedSections.filter(s => s !== section));
    } else {
      setSelectedSections([...selectedSections, section]);
      
      // Add subtle particles animation on selection
      createSelectionParticles(section);
    }
  };

  // Handle manual save of current version without AI refinement
  const handleManualSave = () => {
    if (!isLatestVersion) return;
    
    const currentData = versions[currentVersion];
    
    // Create a new version with current data
    const newVersion: TicketVersion = {
      title: currentData.title,
      description: currentData.description,
      acceptanceCriteria: currentData.acceptanceCriteria,
      timestamp: new Date(),
      changes: [], // Manual save doesn't target specific sections
      clarityScore: currentData.clarityScore,
      clarityScoreReasoning: currentData.clarityScoreReasoning,
      improvementSummary: null // Manual saves don't have improvement summaries
    };
    
    // Add the new version
    const newVersions = [...versions, newVersion];
    setVersions(newVersions);
    
    // Switch to the new version
    const newVersionIndex = newVersions.length - 1;
    setCurrentVersion(newVersionIndex);
    
    // Notify parent component
    if (onVersionChange) {
      onVersionChange(newVersionIndex, []);
    }
    
    // Clear any selected sections since we're now on a new version
    setSelectedSections([]);
    
    // Optional: Show feedback to user
    console.log(`Created Version ${newVersionIndex + 1} manually`);
  };

  // Handle AI refinement with improved connection to chat interface
  const handleRefine = async () => {
    if (selectedSections.length === 0) {
      // Show notification that no sections are selected
      return;
    }

    setIsRefining(true);

    try {
      // Get the current version data, including any manual edits
      const currentData = versions[currentVersion];
      
      // Convert uploaded files to base64
      let filesData: FileData[] = [];
      if (uploadedFiles.length > 0) {
        try {
          filesData = await convertFilesToBase64(uploadedFiles);
        } catch (error) {
          console.error('Error converting files to base64:', error);
          setIsRefining(false);
          // Could show user notification here
          return;
        }
      }
      
      // Prepare the API request body
      const requestBody = {
        title: currentData.title,
        description: currentData.description,
        acceptanceCriteria: currentData.acceptanceCriteria,
        selectedSections: selectedSections,
        aiPrompt: aiPrompt.trim(),
        teamContext: teamContext,
        previousClarityScore: currentData.clarityScore,
        files: filesData,
        selectedModel: getUserSelectedModel()
      };

      // Make the API call to our refinement endpoint
      const response = await authenticatedFetch('/api/refine', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle usage limit exceeded with proper messaging
        if (response.status === 429 && errorData.usage_limit_exceeded) {
          throw new Error(`Token limit reached! You've used ${errorData.current_usage?.toLocaleString()} of ${errorData.limit?.toLocaleString()} monthly tokens. Please contact your organization admin to upgrade your plan.`);
        }
        
        throw new Error(errorData.error || 'Failed to refine ticket');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Use callback to ensure we get the most current version state
        setVersions(currentVersions => {
          // Create a new version with the refined content from the API
          const newVersion: TicketVersion = {
            title: result.data.title || currentData.title,
            description: result.data.description || currentData.description,
            acceptanceCriteria: result.data.acceptanceCriteria || currentData.acceptanceCriteria,
            timestamp: new Date(),
            changes: [...selectedSections],
            aiPrompt: aiPrompt.trim().length > 0 ? aiPrompt : undefined,
            clarityScore: result.clarityScore || null,
            clarityScoreReasoning: result.clarityScoreReasoning || null,
            investBreakdown: result.investBreakdown || null,
            improvementSummary: result.improvementSummary || null
          };
          
          // Calculate new version index and set it
          const newVersionIndex = currentVersions.length;
          const refinedSections = [...selectedSections]; // Capture the sections that were refined
          setTimeout(() => {
            setCurrentVersion(newVersionIndex);
            
            // Update clarity score to match the new version
            setClarityScore(newVersion.clarityScore || null);
            setClarityScoreReasoning(newVersion.clarityScoreReasoning || null);
            setInvestBreakdown(newVersion.investBreakdown || null);
            
            // Notify parent component with version number and refined sections
            if (onVersionChange) {
              onVersionChange(newVersionIndex, refinedSections);
            }
          }, 0);
          
          // Return updated versions array with new version
          return [...currentVersions, newVersion];
        });
      }
      
      // Reset selections and prompt
      setSelectedSections([]);
      setAiPrompt('');
      setIsChatOpen(false);
      
      // Keep history view collapsed by default after creating a new version
      setIsShowingHistory(false);
    } catch (error) {
      console.error('Error refining with AI:', error);
    } finally {
      setIsRefining(false);
    }
  };

  // Animate when hovering over a section with enhanced effects
  const getSectionHoverClass = (section: TicketSection) => {
    if (sectionHover === section) {
      return 'bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
    }
    return '';
  };

  // Get class for a section based on selection state with improved visual feedback
  const getSectionClass = (section: TicketSection) => {
    const baseClass = 'transition-all duration-300 relative rounded-lg border overflow-hidden group';
    
    // If not on latest version, show as read-only
    if (!isLatestVersion) {
      return `${baseClass} border-neutral-700/50 bg-neutral-800/20 opacity-75`;
    }
    
    if (selectedSections.includes(section)) {
      return `${baseClass} border-purple-500/70 bg-purple-500/10 shadow-[0_0_25px_rgba(168,85,247,0.35)] relative section-selected`;
    }
    
    return `${baseClass} border-neutral-700 hover:border-purple-500/30 hover:bg-purple-500/5`;
  };
  
  // Helper to animate a section border when it's selected
  useEffect(() => {
    if (lastSelectedSection && selectedSections.includes(lastSelectedSection)) {
      const sectionEl = document.querySelector(`[data-section="${lastSelectedSection}"]`);
      if (sectionEl) {
        // Add a pulse animation to the border
        sectionEl.classList.add('animate-pulse-border');
        
        // Remove the animation class after animation completes
        setTimeout(() => {
          sectionEl.classList.remove('animate-pulse-border');
        }, 1000);
      }
    }
  }, [lastSelectedSection, selectedSections]);

  // Handle selection of a previous version with improved history navigation
  const changeVersion = useCallback((versionIndex: number) => {
    setCurrentVersion(versionIndex);
    
    // Update clarity score to match the selected version
    const selectedVersion = versions[versionIndex];
    if (selectedVersion) {
      setClarityScore(selectedVersion.clarityScore || null);
      setClarityScoreReasoning(selectedVersion.clarityScoreReasoning || null);
      setInvestBreakdown(selectedVersion.investBreakdown || null);
    }
    
    // Clear any selected sections when switching versions
    // Only the latest version allows section selection
    const isGoingToLatest = versionIndex === versions.length - 1;
    if (!isGoingToLatest) {
      setSelectedSections([]);
      setAiPrompt('');
      setIsChatOpen(false);
    }
    
    if (onVersionChange) {
      // When manually changing versions, no sections were refined
      onVersionChange(versionIndex, []);
    }
  }, [versions, onVersionChange]);

  // Show the AI chat interface when the user wants to provide specific instructions
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    // Focus the chat input when opened
    if (!isChatOpen) {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };
  
  // Close chat when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsChatOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navigation functions for version pagination
  const navigateToPreviousVersion = useCallback(() => {
    if (currentVersion > 0) {
      changeVersion(currentVersion - 1);
    }
  }, [currentVersion, changeVersion]);
  
  const navigateToNextVersion = useCallback(() => {
    if (currentVersion < versions.length - 1) {
      changeVersion(currentVersion + 1);
    }
  }, [currentVersion, versions.length, changeVersion]);

  // Keyboard navigation for versions
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            navigateToPreviousVersion();
            break;
          case 'ArrowRight':
            event.preventDefault();
            navigateToNextVersion();
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateToPreviousVersion, navigateToNextVersion]);

  // Clarity score will be updated via API calls when refinements are made
  
  // Tooltip to show when hovering over sections
  const [hoverTooltip, setHoverTooltip] = useState<{text: string, x: number, y: number} | null>(null);
  
  // Get the current ticket data
    const currentTicket = versions[currentVersion];
  
  // Accept all changes in current version
  const acceptAllChanges = () => {
    setHighlightedVersion(currentVersion);
    setTimeout(() => setHighlightedVersion(null), 1500);
    
    // In a real app, this would save the current version as the accepted one
    // For this demo, we'll just show a visual confirmation
  };
  
  // Revert to a specific version
  const revertToVersion = (versionIndex: number) => {
    // Create a new version based on the selected historic version
    const versionToRevert = versions[versionIndex];
    
    const newVersion: TicketVersion = {
      ...versionToRevert,
      timestamp: new Date(),
      changes: ['title', 'description', 'acceptanceCriteria'],
      aiPrompt: `Reverted to version ${versionIndex + 1}`
    };
    
    // Add the reverted version
    setVersions([...versions, newVersion]);
    const newVersionIndex = versions.length;
    setCurrentVersion(newVersionIndex);
    
    if (onVersionChange) {
      onVersionChange(newVersionIndex);
    }
    
    // Close history view
    setIsShowingHistory(false);
  };
  
  // Show tooltip for section
  const handleSectionMouseEnter = (section: TicketSection, event: React.MouseEvent) => {
    setSectionHover(section);
    
    if (!isLatestVersion) {
      setHoverTooltip({
        text: 'Read-only - switch to latest version to edit',
        x: event.clientX,
        y: event.clientY - 30
      });
    } else {
      setHoverTooltip({
        text: selectedSections.includes(section) ? 'Click to deselect' : 'Click to select for AI refinement',
        x: event.clientX,
        y: event.clientY - 30
      });
    }
  };
  
  // Hide tooltip when leaving section
  const handleSectionMouseLeave = () => {
    setSectionHover(null);
    setHoverTooltip(null);
  };
  
  // Handle input change in edit mode
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, section: TicketSection) => {
    const { value } = e.target;
    handleEditChange(section, value);
  };
  
  // Helper to check if we're viewing the latest version
  const isLatestVersion = currentVersion === versions.length - 1;

  // Version pagination logic - show exactly 6 elements total (including ellipsis)
  const MAX_TOTAL_ELEMENTS = 6; // Total elements including ellipsis
  
  const getVisibleVersions = () => {
    const totalVersions = versions.length;
    
    // If we have 6 or fewer versions, show all (no ellipsis needed)
    if (totalVersions <= MAX_TOTAL_ELEMENTS) {
      return versions.map((_, index) => ({ type: 'version' as const, index }));
    }
    
    // For more than 6 versions, we need to show exactly 6 elements:
    // Pattern: v1 ... v5 v6 ... v10 (4 version buttons + 2 ellipses = 6 total elements)
    // or: v1 ... v8 v9 v10 (4 version buttons + 1 ellipsis = 5 total elements)
    
    const first = 0;
    const last = totalVersions - 1;
    
    // Strategy: Always show first, last, and current version + one adjacent version
    // Then fill with ellipses as needed
    
    const result: Array<{ type: 'version' | 'ellipsis'; index?: number }> = [];
    
    // Always start with first version
    result.push({ type: 'version', index: first });
    
    // Determine the range around current version to show
    let rangeStart: number, rangeEnd: number;
    
    if (currentVersion <= 2) {
      // Current is near the beginning: show v0, v1, v2, ..., last
      rangeStart = 1;
      rangeEnd = Math.min(2, last - 1);
    } else if (currentVersion >= totalVersions - 3) {
      // Current is near the end: show first, ..., v(n-2), v(n-1), vn
      rangeStart = Math.max(first + 1, totalVersions - 3);
      rangeEnd = last - 1;
    } else {
      // Current is in the middle: show first, ..., v(current-1), v(current), ..., last
      rangeStart = currentVersion;
      rangeEnd = currentVersion;
    }
    
    // Add ellipsis if there's a gap after first
    if (rangeStart > first + 1) {
      result.push({ type: 'ellipsis' });
    }
    
    // Add the range versions
    for (let i = rangeStart; i <= rangeEnd && i < last; i++) {
      if (i !== first) { // Don't duplicate first
        result.push({ type: 'version', index: i });
      }
    }
    
    // Add ellipsis if there's a gap before last
    if (rangeEnd < last - 1) {
      result.push({ type: 'ellipsis' });
    }
    
    // Always end with last version (if it's not already included)
    if (last !== first && !result.some(item => item.type === 'version' && item.index === last)) {
      result.push({ type: 'version', index: last });
    }
    
    // Ensure we don't exceed 6 elements - if we do, prioritize current version area
    if (result.length > MAX_TOTAL_ELEMENTS) {
      return [
        { type: 'version', index: first },
        { type: 'ellipsis' },
        { type: 'version', index: currentVersion },
        { type: 'ellipsis' },
        { type: 'version', index: last }
      ];
    }
    
    return result;
  };
  
  const visibleVersions = getVisibleVersions();
  const hasHiddenVersions = versions.length > MAX_TOTAL_ELEMENTS;
  
  return (
    <div className="space-y-6 relative">      
      {/* Tooltip */}
      {hoverTooltip && (
        <div 
          className="fixed z-50 px-2 py-1 bg-neutral-800 text-neutral-100 text-xs rounded shadow-lg pointer-events-none transform -translate-x-1/2 animate-fade-in-up"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${hoverTooltip.y}px`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          {hoverTooltip.text}
        </div>
      )}
      
      {/* Version history bar */}
      <div className="mb-5 space-y-3">
        {/* Header with title and clarity score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold flex items-center">
              <DocumentCheckIcon className="h-5 w-5 mr-2 text-indigo-400" />
              Ticket Versions
            </h2>
            <InvestScore score={clarityScore} reasoning={clarityScoreReasoning} investBreakdown={versions[currentVersion]?.investBreakdown} size="sm" />
          </div>
          
          {/* Back to form button */}
          <button
            onClick={onBackToForm}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition-all text-sm"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            <span>Back to Form</span>
          </button>
        </div>
        
        {/* Controls bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsShowingHistory(!isShowingHistory)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm transition-all ${
                isShowingHistory 
                  ? 'bg-indigo-600/20 text-indigo-300' 
                  : 'hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              <span>{isShowingHistory ? 'Hide History' : 'Show History'}</span>
            </button>
            
            <div className="text-xs text-neutral-400 flex items-center gap-2">
              <span>{versions.length} version{versions.length !== 1 && 's'}</span>
              {hasHiddenVersions && (
                <span className="text-neutral-500 text-xs" title="Use Ctrl/Cmd + ← → to navigate versions quickly">
                  ⌘ ← →
                </span>
              )}
            </div>
          </div>
          
          {/* Version navigation with pagination */}
          <div className="flex items-center bg-neutral-800/50 rounded-lg overflow-hidden">
            {/* Previous version button */}
            {hasHiddenVersions && (
              <button
                onClick={navigateToPreviousVersion}
                disabled={currentVersion === 0}
                className="px-2 py-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Previous version"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            )}
            
            {/* Version buttons */}
            <div className="flex p-1">
              {visibleVersions.map((item, displayIndex) => {
                if (item.type === 'ellipsis') {
                  return (
                    <div key={`ellipsis-${displayIndex}`} className="flex items-center px-1">
                      <EllipsisHorizontalIcon className="h-3 w-3 text-neutral-500" />
                    </div>
                  );
                }
                
                const versionIndex = item.index!;
                return (
                  <button
                    key={versionIndex}
                    onClick={() => changeVersion(versionIndex)}
                    className={`relative px-3 py-1 text-sm rounded-md transition-all ${
                      currentVersion === versionIndex 
                        ? 'bg-violet-600 text-white shadow-inner shadow-violet-900/50' 
                        : 'text-neutral-300 hover:bg-neutral-700'
                    } ${highlightedVersion === versionIndex ? 'animate-pulse-glow' : ''}`}
                  >
                    v{versionIndex + 1}
                  </button>
                );
              })}
            </div>
            
            {/* Next version button */}
            {hasHiddenVersions && (
              <button
                onClick={navigateToNextVersion}
                disabled={currentVersion === versions.length - 1}
                className="px-2 py-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Next version"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div>
          </div>
        </div>
      </div>
      
      {/* History view */}
      {isShowingHistory && versions.length > 1 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden mb-6 animate-fade-in-up">
          <div className="bg-neutral-800/70 px-4 py-3 flex items-center justify-between border-b border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-200 flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-indigo-400" />
              Version History
            </h3>
            <button 
              onClick={() => setIsShowingHistory(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="px-4 py-2 max-h-[300px] overflow-y-auto divide-y divide-neutral-800">
            {versions.map((version, index) => (
              <div 
                key={index}
                className={`py-3 flex items-center justify-between ${
                  currentVersion === index ? 'bg-indigo-900/10' : ''
                }`}
              >
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs rounded ${
                    currentVersion === index 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    v{index + 1}
                  </span>
                  <span className="text-sm text-neutral-300 ml-3">
                    {version.timestamp.toLocaleString()}
                  </span>
                  
                  {version.aiPrompt && (
                    <span className="ml-3 text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-400">
                      {version.aiPrompt.length > 30
                        ? `${version.aiPrompt.substring(0, 30)}...`
                        : version.aiPrompt}
                    </span>
                  )}
                  
                  {version.improvementSummary && (
                    <span className="ml-3 text-xs px-2 py-1 rounded-full bg-emerald-800/30 text-emerald-300">
                      ✨ {version.improvementSummary.length > 40
                        ? `${version.improvementSummary.substring(0, 40)}...`
                        : version.improvementSummary}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {index < versions.length - 1 && (
                    <button
                      onClick={() => revertToVersion(index)}
                      className="flex items-center space-x-1 text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    >
                      <ArrowUturnLeftIcon className="h-3 w-3" />
                      <span>Revert</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => changeVersion(index)}
                    className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${
                      currentVersion === index 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
                    }`}
                  >
                    <EyeIcon className="h-3 w-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Current version info bar */}
      <div className="flex items-center justify-between mb-4 text-sm px-4 py-2 bg-neutral-800/30 rounded-lg border border-neutral-700">
        <div className="flex items-center">
          <InformationCircleIcon className="h-4 w-4 text-neutral-400 mr-2" />
          <span className="text-neutral-300">
            Version {currentVersion + 1} • {currentTicket.timestamp.toLocaleString()}
          </span>
        </div>
        
        {currentTicket.changes && currentTicket.changes.length > 0 && (
          <div className="flex items-center">
            <span className="text-xs text-neutral-400 mr-2">Changed:</span>
            <div className="flex gap-1">
              {currentTicket.changes.map((section) => (
                <span 
                  key={section}
                  className="px-2 py-0.5 bg-neutral-700/50 rounded text-xs text-neutral-300"
                >
                  {section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {currentVersion > 0 && (
          <button
            onClick={acceptAllChanges}
            className="flex items-center space-x-1 text-xs px-2 py-1 rounded-md bg-green-600/20 hover:bg-green-600/30 text-green-400"
          >
            <CheckIcon className="h-3 w-3" />
            <span>Accept Changes</span>
          </button>
        )}
      </div>

      {/* Add unsaved changes banner */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <span className="text-yellow-200">You have unsaved changes</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveAllEdits}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded"
            >
              Save All
            </button>
            <button
              onClick={discardAllEdits}
              className="px-3 py-1 bg-neutral-600 hover:bg-neutral-500 text-white text-sm rounded"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Previous version notice */}
      {!isLatestVersion && (
        <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-blue-400 mr-2" />
            <span className="text-blue-200">
              You&apos;re viewing version {currentVersion + 1} of {versions.length} (read-only)
            </span>
          </div>
          <button
            onClick={() => changeVersion(versions.length - 1)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Go to Latest
          </button>
        </div>
      )}

      {/* Ticket content with selectable sections */}
      <div className="space-y-4">
        {/* Title section */}
        <div 
          className={`${getSectionClass('title')} ${
            isLatestVersion && selectedSections.includes('title') ? 'cursor-selected section-selected' : 
            isLatestVersion ? 'cursor-select' : 'cursor-not-allowed'
          }`}
          onClick={() => isLatestVersion && !editingSections.has('title') && toggleSection('title')}
          onMouseEnter={(e) => handleSectionMouseEnter('title', e)}
          onMouseLeave={handleSectionMouseLeave}
          data-section="title"
        >
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            {/* Edit button for latest version */}
            {isLatestVersion && !editingSections.has('title') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing('title');
                }}
                className="flex items-center px-2 py-1 text-xs rounded-full bg-blue-600/70 text-white hover:bg-blue-500/70 transition-colors"
              >
                <PencilSquareIcon className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
            
            {/* Save/Cancel buttons when editing */}
            {editingSections.has('title') && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveEdit('title');
                  }}
                  className="flex items-center px-2 py-1 text-xs rounded-full bg-green-600/70 text-white hover:bg-green-500/70"
                >
                  <CheckIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditing('title');
                  }}
                  className="flex items-center px-2 py-1 text-xs rounded-full bg-red-600/70 text-white hover:bg-red-500/70"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Selection indicator */}
            {isLatestVersion && selectedSections.includes('title') ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-purple-600/70 text-white">
                <CheckIcon className="w-3 h-3 mr-1" />
                Selected
              </span>
            ) : isLatestVersion && !editingSections.has('title') ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-neutral-700/70 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <PencilIcon className="w-3 h-3 mr-1" />
                Select
              </span>
            ) : !isLatestVersion ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-neutral-600/70 text-neutral-500">
                <EyeIcon className="w-3 h-3 mr-1" />
                Read-only
              </span>
            ) : null}
          </div>
          
          <div className="p-4 group">
            <div className={`text-sm text-neutral-400 mb-1 group-hover:text-indigo-400 transition-colors ${getSectionHoverClass('title')}`}>
              Title
            </div>
            {editingSections.has('title') ? (
              <input
                type="text"
                value={editValues.title || currentTicket.title || ''}
                onChange={(e) => handleInputChange(e, 'title')}
                className="w-full text-xl font-medium text-neutral-100 bg-neutral-800/50 border border-neutral-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <h3 className="text-xl font-medium text-neutral-100">{currentTicket.title || 'Untitled'}</h3>
            )}
          </div>
          
          {selectedSections.includes('title') && (
            <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none animate-pulse-glow"></div>
          )}
        </div>
        
        {/* Description section */}
        <div 
          className={`${getSectionClass('description')} ${
            isLatestVersion && selectedSections.includes('description') ? 'cursor-selected section-selected' : 
            isLatestVersion ? 'cursor-select' : 'cursor-not-allowed'
          }`}
          onClick={() => isLatestVersion && !editingSections.has('description') && toggleSection('description')}
          onMouseEnter={(e) => handleSectionMouseEnter('description', e)}
          onMouseLeave={handleSectionMouseLeave}
          data-section="description"
        >
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            {/* Edit button for latest version */}
            {isLatestVersion && !editingSections.has('description') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing('description');
                }}
                className="flex items-center px-2 py-1 text-xs rounded-full bg-blue-600/70 text-white hover:bg-blue-500/70 transition-colors"
              >
                <PencilSquareIcon className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
            
            {/* Save/Cancel buttons when editing */}
            {editingSections.has('description') && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveEdit('description');
                  }}
                  className="flex items-center px-2 py-1 text-xs rounded-full bg-green-600/70 text-white hover:bg-green-500/70"
                >
                  <CheckIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditing('description');
                  }}
                  className="flex items-center px-2 py-1 text-xs rounded-full bg-red-600/70 text-white hover:bg-red-500/70"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Selection indicator */}
            {isLatestVersion && selectedSections.includes('description') ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-purple-600/70 text-white">
                <CheckIcon className="w-3 h-3 mr-1" />
                Selected
              </span>
            ) : isLatestVersion && !editingSections.has('description') ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-neutral-700/70 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <PencilIcon className="w-3 h-3 mr-1" />
                Select
              </span>
            ) : !isLatestVersion ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-neutral-600/70 text-neutral-500">
                <EyeIcon className="w-3 h-3 mr-1" />
                Read-only
              </span>
            ) : null}
          </div>
          
          <div className="p-4 group">
            <div className={`text-sm text-neutral-400 mb-2 group-hover:text-indigo-400 transition-colors ${getSectionHoverClass('description')}`}>
              Description
            </div>
            {editingSections.has('description') ? (
              <textarea
                value={editValues.description || currentTicket.description || ''}
                onChange={(e) => handleInputChange(e, 'description')}
                className="w-full min-h-[120px] text-neutral-100 bg-neutral-800/50 border border-neutral-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 resize-vertical"
                autoFocus
              />
            ) : (
              <div className="prose prose-sm prose-invert max-w-none">
                {(currentTicket.description || '').split('\n').map((paragraph, i) => (
                  <p key={i} className="text-neutral-200">{paragraph}</p>
                ))}
              </div>
            )}
          </div>
          
          {selectedSections.includes('description') && (
            <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none animate-pulse-glow"></div>
          )}
        </div>
        
        {/* Acceptance Criteria section */}
        <div 
          className={`${getSectionClass('acceptanceCriteria')} ${
            isLatestVersion && selectedSections.includes('acceptanceCriteria') ? 'cursor-selected section-selected' : 
            isLatestVersion ? 'cursor-select' : 'cursor-not-allowed'
          }`}
          onClick={() => isLatestVersion && !editingSections.has('acceptanceCriteria') && toggleSection('acceptanceCriteria')}
          onMouseEnter={(e) => handleSectionMouseEnter('acceptanceCriteria', e)}
          onMouseLeave={handleSectionMouseLeave}
          data-section="acceptanceCriteria"
        >
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            {/* Edit button for latest version */}
            {isLatestVersion && !editingSections.has('acceptanceCriteria') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing('acceptanceCriteria');
                }}
                className="flex items-center px-2 py-1 text-xs rounded-full bg-blue-600/70 text-white hover:bg-blue-500/70 transition-colors"
              >
                <PencilSquareIcon className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
            
            {/* Save/Cancel buttons when editing */}
            {editingSections.has('acceptanceCriteria') && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveEdit('acceptanceCriteria');
                  }}
                  className="flex items-center px-2 py-1 text-xs rounded-full bg-green-600/70 text-white hover:bg-green-500/70"
                >
                  <CheckIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditing('acceptanceCriteria');
                  }}
                  className="flex items-center px-2 py-1 text-xs rounded-full bg-red-600/70 text-white hover:bg-red-500/70"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Selection indicator */}
            {isLatestVersion && selectedSections.includes('acceptanceCriteria') ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-purple-600/70 text-white">
                <CheckIcon className="w-3 h-3 mr-1" />
                Selected
              </span>
            ) : isLatestVersion && !editingSections.has('acceptanceCriteria') ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-neutral-700/70 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <PencilIcon className="w-3 h-3 mr-1" />
                Select
              </span>
            ) : !isLatestVersion ? (
              <span className="flex items-center px-2 py-1 text-xs rounded-full bg-neutral-600/70 text-neutral-500">
                <EyeIcon className="w-3 h-3 mr-1" />
                Read-only
              </span>
            ) : null}
          </div>
          
          <div className="p-4 group">
            <div className={`text-sm text-neutral-400 mb-2 group-hover:text-indigo-400 transition-colors ${getSectionHoverClass('acceptanceCriteria')}`}>
              Acceptance Criteria
            </div>
            {editingSections.has('acceptanceCriteria') ? (
              <textarea
                value={editValues.acceptanceCriteria || currentTicket.acceptanceCriteria || ''}
                onChange={(e) => handleInputChange(e, 'acceptanceCriteria')}
                className="w-full min-h-[100px] text-neutral-200 bg-neutral-800/50 border border-neutral-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 resize-vertical"
                placeholder="Enter acceptance criteria..."
                autoFocus
              />
            ) : (
              <div className="text-neutral-200 whitespace-pre-line">
                {currentTicket.acceptanceCriteria || 'No acceptance criteria defined.'}
              </div>
            )}
          </div>
          
          {selectedSections.includes('acceptanceCriteria') && (
            <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none animate-pulse-glow"></div>
          )}
        </div>
      </div>
      
      {/* AI instructions and action section - only show for latest version */}
      {isLatestVersion && (
        <div className="mt-6 relative">
          {selectedSections.length > 0 && (
          <div className="text-sm text-purple-300 mb-3 flex items-center">
            <SparklesIcon className="h-4 w-4 mr-2 animate-float" style={{ animationDuration: '2s' }} />
            <span>
              {selectedSections.length === 1
                ? `Selected 1 section to refine`
                : `Selected ${selectedSections.length} sections to refine`}
            </span>
            <button
              onClick={() => setSelectedSections([])}
              className="ml-3 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}
        
        <div className="flex gap-3">
          {/* Chat button */}
          <button
            onClick={toggleChat}
            className={`px-4 py-2.5 rounded-lg flex items-center border transition-all ${
              isChatOpen || aiPrompt.length > 0
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                : 'border-neutral-700 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-neutral-300 hover:text-indigo-300'
            }`}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            <span>{aiPrompt.length > 0 ? 'Edit Instructions' : 'Add Instructions'}</span>
          </button>
          
          {/* Manual Save Version button */}
          <button
            onClick={handleManualSave}
            disabled={!isLatestVersion || isRefining}
            className="px-4 py-2.5 rounded-lg flex items-center border border-emerald-600 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 hover:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
            <span>Save Version</span>
          </button>
          
          {/* Refine button */}
          <button
            onClick={handleRefine}
            disabled={selectedSections.length === 0 || isRefining}
            className="flex-1 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 hover:from-fuchsia-500 hover:via-violet-500 hover:to-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-violet-600/30 flex items-center justify-center disabled:opacity-70 relative overflow-hidden group btn-shine transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Enhanced shine and glow effects */}
            <div className="absolute inset-0 w-full h-full">
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 rounded-lg animate-pulse-glow"></div>
              </div>
            </div>
            
            {/* Button content */}
            <div className="relative z-10 flex items-center">
              {isRefining ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2 animate-float" style={{ animationDuration: '2s' }} />
                  <span>{aiPrompt.trim().length > 0 ? 'Refine with Instructions' : 'Refine Selected Sections'}</span>
                </>
              )}
            </div>
          </button>
        </div>
        
        {/* Chat/Instructions popup */}
        {isChatOpen && (
          <div 
            ref={chatRef}
            className="absolute bottom-full left-0 mb-2 w-full bg-neutral-800/90 backdrop-blur-md border border-indigo-500/30 rounded-lg p-4 shadow-xl animate-fade-in-up z-20"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <SparklesIcon className="h-4 w-4 mr-2 text-indigo-400" />
                <h3 className="text-sm font-medium text-indigo-300">Instructions for AI Refinement</h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <textarea
              ref={chatInputRef}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`Give specific instructions for refining the selected sections${
                selectedSections.length > 0 
                  ? ` (${selectedSections.map(s => 
                      s.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                    ).join(', ')})`
                  : ''
              }. For example: 'Make the description more concise' or 'Add more technical details to the acceptance criteria.'`}
              className="w-full p-3 rounded-lg bg-neutral-900/70 text-neutral-100 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.35)]"
              rows={4}
            ></textarea>
            
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setIsChatOpen(false);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}
        
        {/* AI prompt summary (when instructions were added but chat is closed) */}
        {!isChatOpen && aiPrompt.trim().length > 0 && (
          <div className="mt-3 bg-indigo-900/20 border border-indigo-900/30 rounded-lg p-3">
            <div className="flex items-start">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-200 line-clamp-2">
                <span className="font-medium text-indigo-300">Instructions:</span> {aiPrompt}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      
      {/* Interactive guide for new users */}
      {isLatestVersion && selectedSections.length === 0 && versions.length === 1 && (
        <div className="mt-6 bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 animate-fade-in-up text-sm text-indigo-200">
          <h4 className="font-medium mb-2 text-indigo-300">Using Version Control</h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Click on any section above that you want to refine with AI</li>
            <li>Use the edit button to manually modify sections (latest version only)</li>
            <li>Add specific instructions to guide the AI refinement (optional)</li>
            <li>Click &quot;Refine Selected Sections&quot; to generate a new version</li>
            <li>Browse version history to compare changes and revert if needed</li>
          </ol>
        </div>
      )}
      
      {/* Show version change history if we have multiple versions */}
      {versions.length > 1 && currentVersion > 0 && (currentTicket.aiPrompt || currentTicket.improvementSummary) && (
        <div className="mt-4 border-t border-neutral-800 pt-4 space-y-3">
          {currentTicket.aiPrompt && (
            <div>
              <div className="text-sm text-neutral-400 mb-2 flex items-center">
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                <span>AI Instructions for this version:</span>
              </div>
              <div className="bg-neutral-800/30 p-3 rounded-lg text-sm text-neutral-300 italic">
                &quot;{currentTicket.aiPrompt}&quot;
              </div>
            </div>
          )}
          
          {currentTicket.improvementSummary && (
            <div>
              <div className="text-sm text-neutral-400 mb-2 flex items-center">
                <SparklesIcon className="h-4 w-4 mr-2" />
                <span>Improvements made:</span>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-800/30 p-3 rounded-lg text-sm text-emerald-200">
                {currentTicket.improvementSummary}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

VersionedTicket.displayName = 'VersionedTicket';

export default VersionedTicket;
