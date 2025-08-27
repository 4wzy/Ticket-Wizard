"use client";
import React, { useState, useEffect } from 'react';
import { SparklesIcon, LightBulbIcon, CheckCircleIcon, ArrowUpTrayIcon, PlusIcon } from '@heroicons/react/24/outline';
import FileUploadSection from './FileUploadSection';
import InvestScore from './InvestScore';
import JiraPushModal from './JiraPushModal';
import Toast from './Toast';
import { isJiraConnected } from '@/lib/jiraApi';

interface GuidedJiraDetails {
  title: string;
  description: string;
  acceptanceCriteria: string;
  jiraKey?: string;
  jiraUrl?: string;
}

interface InvestCriteria {
  independent: number;
  negotiable: number;
  valuable: number;
  estimable: number;
  small: number;
  testable: number;
}

interface GuidedTicketEditorProps {
  jiraDetails: GuidedJiraDetails;
  onDetailsChange: (details: GuidedJiraDetails) => void;
  isAiProcessing: boolean; // Renamed from isProcessing for clarity
  onStartGuidance: () => void;
  wizardScore: number | null; // Renamed from initialWizardScore
  wizardScoreReasoning?: string | null;
  investBreakdown?: InvestCriteria | null;
  isGuidanceActive: boolean;
  onFilesChange?: (files: File[]) => void;
}

const GuidedTicketEditor: React.FC<GuidedTicketEditorProps> = ({
  jiraDetails,
  onDetailsChange,
  isAiProcessing,
  onStartGuidance,
  wizardScore,
  wizardScoreReasoning,
  investBreakdown,
  isGuidanceActive,
  onFilesChange,
}) => {
  const [localJiraDetails, setLocalJiraDetails] = useState<GuidedJiraDetails>(jiraDetails);
  const [highlightedFields, setHighlightedFields] = useState<Set<keyof GuidedJiraDetails>>(new Set());
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [showJiraPushModal, setShowJiraPushModal] = useState<boolean>(false);
  const [jiraPushMode, setJiraPushMode] = useState<'create' | 'update'>('create');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState<boolean>(false);

  // Sync local state with prop changes (e.g., when AI updates details)
  useEffect(() => {
    // Detect which fields were changed by AI to highlight them
    const changedFields = new Set<keyof GuidedJiraDetails>();
    if (jiraDetails.title !== localJiraDetails.title) changedFields.add('title');
    if (jiraDetails.description !== localJiraDetails.description) changedFields.add('description');
    if (jiraDetails.acceptanceCriteria !== localJiraDetails.acceptanceCriteria) changedFields.add('acceptanceCriteria');
    
    setLocalJiraDetails(jiraDetails);

    if (changedFields.size > 0) {
      setHighlightedFields(changedFields);
      const timer = setTimeout(() => setHighlightedFields(new Set()), 1500); // Highlight for 1.5s
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jiraDetails]); // Only run when external jiraDetails prop changes

  // Show file upload section immediately - always visible
  useEffect(() => {
    setShowFileUpload(true);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof GuidedJiraDetails
  ) => {
    const newDetails = {
      ...localJiraDetails,
      [field]: e.target.value,
    };
    setLocalJiraDetails(newDetails);
    onDetailsChange(newDetails); // Propagate changes up immediately for AI to use current state
  };


  const getFieldClass = (field: keyof GuidedJiraDetails) => {
    let baseClass = "w-full p-3 rounded-lg bg-neutral-800/50 text-neutral-100 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-70";
    if (highlightedFields.has(field)) {
      baseClass += " animate-highlight-flash border-purple-500 ring-2 ring-purple-500";
    }
    return baseClass;
  };

  const handleJiraPush = (mode: 'create' | 'update') => {
    setJiraPushMode(mode);
    setShowJiraPushModal(true);
  };

  const handleJiraPushSuccess = (ticketKey: string, ticketUrl: string) => {
    console.log(`Ticket ${jiraPushMode === 'create' ? 'created' : 'updated'} successfully:`, ticketKey, ticketUrl);
    
    // Show success toast
    setToastMessage(
      jiraPushMode === 'create' 
        ? `🎉 Ticket ${ticketKey} created successfully!` 
        : `✅ Ticket ${ticketKey} updated successfully!`
    );
    setToastType('success');
    setShowToast(true);
    
    // Update local details with Jira info if this was a creation
    if (jiraPushMode === 'create') {
      const updatedDetails = {
        ...localJiraDetails,
        jiraKey: ticketKey,
        jiraUrl: ticketUrl
      };
      setLocalJiraDetails(updatedDetails);
      onDetailsChange(updatedDetails);
    }
  };

  const handleJiraPushError = (error: string) => {
    console.error('Jira push error:', error);
    
    // Show error toast
    setToastMessage(`❌ ${error}`);
    setToastType('error');
    setShowToast(true);
  };

  return (
    <div className="bg-neutral-900/70 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-neutral-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold flex items-center">
            <LightBulbIcon className="h-6 w-6 mr-2 text-yellow-400" />
            Jira Ticket Editor
          </h2>
          
          {/* Jira Push Button - Prominent Header Location */}
          {isJiraConnected() && (
            <div className="flex items-center space-x-2">
              {localJiraDetails.jiraKey && (
                <span className="text-xs text-neutral-400 font-mono bg-neutral-700/50 px-2 py-1 rounded">
                  {localJiraDetails.jiraKey}
                </span>
              )}
              {localJiraDetails.jiraKey ? (
                <button
                  onClick={() => handleJiraPush('update')}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span>Push Updates (to existing Jira)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleJiraPush('create')}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Push to Jira (create new)</span>
                </button>
              )}
            </div>
          )}
        </div>
        
        <InvestScore score={wizardScore} reasoning={wizardScoreReasoning} investBreakdown={investBreakdown} label="INVEST Score" />
      </div>

      <form className="space-y-4">
        <div>
          <label htmlFor="title-field" className="block text-sm font-medium mb-1 text-neutral-300">Title</label>
          <input
            id="title-field"
            type="text"
            value={localJiraDetails.title}
            onChange={(e) => handleChange(e, 'title')}
            readOnly={isAiProcessing && isGuidanceActive} // Readonly if AI active & processing
            className={getFieldClass('title')}
            placeholder="Enter ticket title..."
          />
        </div>
        <div>
          <label htmlFor="description-field" className="block text-sm font-medium mb-1 text-neutral-300">Description</label>
          <textarea
            id="description-field"
            value={localJiraDetails.description}
            onChange={(e) => handleChange(e, 'description')}
            readOnly={isAiProcessing && isGuidanceActive}
            rows={8}
            className={getFieldClass('description')}
            placeholder="Describe the task, bug, or feature..."
          />
        </div>
        <div>
          <label htmlFor="ac-field" className="block text-sm font-medium mb-1 text-neutral-300">Acceptance Criteria</label>
          <textarea
            id="ac-field"
            value={localJiraDetails.acceptanceCriteria}
            onChange={(e) => handleChange(e, 'acceptanceCriteria')}
            readOnly={isAiProcessing && isGuidanceActive}
            rows={5}
            className={getFieldClass('acceptanceCriteria')}
            placeholder="List conditions for completion (one per line)..."
          />
        </div>

        {!isGuidanceActive ? (
          <button
            type="button"
            onClick={onStartGuidance}
            disabled={isAiProcessing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            Start AI Guidance
          </button>
        ) : (
          <div className="text-center py-3 px-4 rounded-lg bg-green-900/30 border border-green-700 text-green-300">
            <p className="flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              AI Guidance Active. Use the chat panel to interact.
            </p>
          </div>
        )}
      </form>


      {/* File Upload Section - shown when form has content */}
      {showFileUpload && (
        <FileUploadSection 
          onFilesChange={onFilesChange}
        />
      )}

      {/* Jira Push Modal */}
      <JiraPushModal
        isOpen={showJiraPushModal}
        onClose={() => setShowJiraPushModal(false)}
        ticketData={{
          title: localJiraDetails.title,
          description: localJiraDetails.description,
          acceptanceCriteria: localJiraDetails.acceptanceCriteria,
          key: localJiraDetails.jiraKey
        }}
        mode={jiraPushMode}
        onSuccess={handleJiraPushSuccess}
        onError={handleJiraPushError}
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default GuidedTicketEditor;