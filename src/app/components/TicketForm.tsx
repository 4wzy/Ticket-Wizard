"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { SparklesIcon, PencilSquareIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import InvestScore from './InvestScore';

interface InvestCriteria {
  independent: number;
  negotiable: number;
  valuable: number;
  estimable: number;
  small: number;
  testable: number;
}

interface TicketFormProps {
  initialMode?: 'edit' | 'create';
  selectedEpic?: string;
  onRefine?: (formData: TicketData) => void;
  onJiraAttachmentsChange?: (selectedAttachmentIds: string[]) => void;
  onAdditionalFilesChange?: (files: File[]) => void;
}

export interface TicketData {
  title: string;
  description: string;
  acceptanceCriteria: string;
  jiraKey?: string;
  jiraUrl?: string;
}

export interface TicketFormRef {
  getFormData: () => TicketData;
  setFormData: (data: TicketData) => void;
  resetForm: () => void;
  simulateJiraPopulation: () => void;
  setMode: (mode: 'edit' | 'create') => void;
  handleRefine: () => void;
  getJiraAttachments: () => Array<{ id: string; name: string; size: number; type: string; url: string; }>;
  isPopulatedFromJira: () => boolean;
  setTemplateStructure: (structure: {
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  }) => void;
  getTemplateStructure: () => {
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  } | null;
  setClarityScore: (score: number | null, reasoning?: string | null, investBreakdown?: InvestCriteria | null) => void;
}

const TicketForm = forwardRef<TicketFormRef, TicketFormProps>(({ 
  initialMode = 'edit', 
  onRefine
}, ref) => {
  const [mode, setMode] = useState<'edit' | 'create'>(initialMode);
  const [clarityScore, setClarityScore] = useState<number | null>(null);
  const [clarityScoreReasoning, setClarityScoreReasoning] = useState<string | null>(null);
  const [investBreakdown, setInvestBreakdown] = useState<InvestCriteria | null>(null);
  const [formData, setFormData] = useState<TicketData>({
    title: '',
    description: '',
    acceptanceCriteria: '',
    jiraKey: undefined,
    jiraUrl: undefined
  });
  const [templateStructure, setTemplateStructure] = useState<{
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  } | null>(null);
  const [isPopulatedFromJira, setIsPopulatedFromJira] = useState(false);
  const [jiraAttachments, setJiraAttachments] = useState<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>>([]);

  // Clarity score will be set by API responses, not calculated in real-time

  // Watch for changes to initialMode prop and update internal state
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Clarity score will be updated via API calls, not on form changes

  const handleRefine = () => {
    // This button just creates the first version and switches to the versions tab
    // No API call needed - just pass the form data as Version 1
    if (onRefine) {
      onRefine(formData);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof typeof formData
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
    
    // If data was populated from Jira and user starts editing, show indicator
    if (isPopulatedFromJira) {
      // In a real implementation, you might want to track which specific fields were edited
      // For now, we'll just indicate that the form has been edited
    }
  };

  // This would be called when a Jira ticket is selected from the dropdown
  const populateFromJira = () => {
    // In real implementation, this would take data from the Jira API
    setFormData({
      title: 'JIRA-123: Implement user authentication',
      description: 'Add OAuth2 authentication flow to the application...',
      acceptanceCriteria: '- Users can login with Google\n- Users can logout\n- Session persists after browser refresh',
    });
    setIsPopulatedFromJira(true);
  };

  // Simulate populating from Jira for demo purposes
  const simulateJiraPopulation = () => {
    populateFromJira();
  };
  
  // Reset form to empty state
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      acceptanceCriteria: '',
    });
    setJiraAttachments([]);
    setMode('create');
    setIsPopulatedFromJira(false);
  };

  // Set form data programmatically
  const updateFormData = (data: TicketData) => {
    setFormData(data);
  };
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    simulateJiraPopulation,
    resetForm,
    setMode,
    getFormData: () => formData,
    setFormData: updateFormData,
    handleRefine,
    getJiraAttachments: () => jiraAttachments,
    isPopulatedFromJira: () => isPopulatedFromJira,
    setTemplateStructure: (structure: {
      titleFormat: string;
      descriptionFormat: string;
      acceptanceCriteriaFormat: string;
      additionalFields?: { [key: string]: string };
    }) => {
      setTemplateStructure(structure);
    },
    getTemplateStructure: () => templateStructure,
    setClarityScore: (score: number | null, reasoning?: string | null, investBreakdown?: InvestCriteria | null) => {
      setClarityScore(score);
      setClarityScoreReasoning(reasoning || null);
      setInvestBreakdown(investBreakdown || null);
    }
  }));

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-pink-400" />
            Ticket Details
          </h2>
          <InvestScore score={clarityScore} reasoning={clarityScoreReasoning} investBreakdown={investBreakdown} size="sm" />
        </div>
        
        {/* Enhanced Mode toggle */}
        <div className="flex p-1 bg-gradient-to-r from-indigo-900/50 to-violet-900/50 rounded-lg shadow-inner shadow-violet-900/30 backdrop-blur-sm">
          <button
            onClick={() => setMode('edit')}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transform transition-all duration-300 ${
              mode === 'edit'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-violet-900/30 scale-105'
                : 'text-indigo-200 hover:text-white hover:bg-indigo-700/50'
            }`}
          >
            <PencilSquareIcon className={`h-4 w-4 mr-1.5 ${mode === 'edit' ? 'animate-float' : ''}`} style={{ animationDuration: '2s' }} />
            <span className="relative">
              Edit Existing
              {mode === 'edit' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></span>
              )}
            </span>
          </button>
          <button
            onClick={() => {
              setMode('create');
              setIsPopulatedFromJira(false);
              setFormData({
                title: '',
                description: '',
                acceptanceCriteria: '',
              });
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transform transition-all duration-300 ${
              mode === 'create'
                ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md shadow-fuchsia-900/30 scale-105'
                : 'text-fuchsia-200 hover:text-white hover:bg-fuchsia-700/50'
            }`}
          >
            <DocumentPlusIcon className={`h-4 w-4 mr-1.5 ${mode === 'create' ? 'animate-float' : ''}`} style={{ animationDuration: '2s' }} />
            <span className="relative">
              Create New
              {mode === 'create' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></span>
              )}
            </span>
          </button>
        </div>
      </div>
      
      {/* Source indicator banner */}
      {mode === 'edit' && isPopulatedFromJira && (
        <div className="bg-indigo-900/30 border border-indigo-800 text-indigo-300 px-3 py-2 rounded-lg mb-4 text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Populated from Jira. Any edits will be synced back when you push.
        </div>
      )}
      
      {/* Demo buttons for testing - would be removed in production */}
      {mode === 'edit' && !isPopulatedFromJira && (
        <div className="mb-4">
          <button 
            onClick={simulateJiraPopulation}
            className="text-sm text-indigo-400 underline"
          >
            Demo: Simulate Jira data population
          </button>
        </div>
      )}
      
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-neutral-300">
            Title {mode === 'create' && <span className="text-purple-500">*</span>}
          </label>
          <div className="relative">
            <input 
              type="text" 
              value={formData.title}
              onChange={(e) => handleInputChange(e, 'title')}
              className="w-full p-3 rounded-lg bg-neutral-900/70 text-neutral-100 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all focus:shadow-[0_0_15px_rgba(168,85,247,0.35)]" 
              placeholder={mode === 'create' ? "Enter new ticket title..." : "Select a Jira ticket or enter title..."}
            />
            <div className="absolute inset-0 rounded-lg border border-purple-500/0 focus-within:border-purple-500/20 pointer-events-none"></div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-neutral-300">
            Description {mode === 'create' && <span className="text-purple-500">*</span>}
          </label>
          <div className="relative">
            <textarea 
              value={formData.description}
              onChange={(e) => handleInputChange(e, 'description')}
              className="w-full p-3 rounded-lg bg-neutral-900/70 text-neutral-100 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all focus:shadow-[0_0_15px_rgba(168,85,247,0.35)]" 
              rows={4}
              placeholder="Describe what needs to be done..."
            ></textarea>
            <div className="absolute inset-0 rounded-lg border border-purple-500/0 focus-within:border-purple-500/20 pointer-events-none"></div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-neutral-300">
            Acceptance Criteria
          </label>
          <div className="relative">
            <textarea 
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange(e, 'acceptanceCriteria')}
              className="w-full p-3 rounded-lg bg-neutral-900/70 text-neutral-100 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all focus:shadow-[0_0_15px_rgba(168,85,247,0.35)]" 
              rows={3}
              placeholder="List acceptance criteria..."
            ></textarea>
            <div className="absolute inset-0 rounded-lg border border-purple-500/0 focus-within:border-purple-500/20 pointer-events-none"></div>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleRefine}
          className="w-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 hover:from-fuchsia-500 hover:via-violet-500 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-violet-600/30 flex items-center justify-center relative overflow-hidden group btn-shine transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Enhanced shine and glow effects */}
          <div className="absolute inset-0 w-full h-full">
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 rounded-lg animate-pulse-glow"></div>
            </div>
            
            {/* Enhanced shine effect */}
            <div 
              className="absolute top-0 left-0 w-1/3 h-full bg-white opacity-30 blur-md transform -skew-x-45 transition-all duration-300 ease-out"
              style={{
                transform: "translateX(-100%)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.animate([
                  { transform: 'translateX(-100%) skewX(-45deg)', opacity: 0.4 },
                  { transform: 'translateX(200%) skewX(-45deg)', opacity: 0.4 }
                ], {
                  duration: 900,
                  easing: 'ease-in-out'
                });
              }}
            />
            {/* Static highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
          </div>
          
          {/* Button content */}
          <div className="relative z-10 flex items-center">
            {mode === 'create' ? (
              <>
                <DocumentPlusIcon className="h-5 w-5 mr-2 animate-float" style={{ animationDuration: '2s' }} />
                <span>Create Ticket</span>
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5 mr-2 animate-float" style={{ animationDuration: '2s' }} />
                <span>Ready for Refinement</span>
              </>
            )}
          </div>
        </button>
      </form>
    </>
  );
});

TicketForm.displayName = 'TicketForm';

export default TicketForm;
