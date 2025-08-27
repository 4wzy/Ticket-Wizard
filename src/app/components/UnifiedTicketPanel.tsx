"use client";

import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import TicketForm, { TicketData, TicketFormRef } from './TicketForm';
import VersionedTicket, { VersionedTicketRef } from './VersionedTicket';
import VersionComparison from './VersionComparison';
import FileUploadSection from './FileUploadSection';
import JiraPushModal from './JiraPushModal';
import Toast from './Toast';
import { ClockIcon, XMarkIcon, ArrowPathRoundedSquareIcon, ArrowUpTrayIcon, PlusIcon } from '@heroicons/react/24/outline';
import { isJiraConnected } from '@/lib/jiraApi';

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

interface UnifiedTicketPanelProps {
  initialMode: 'edit' | 'create';
  selectedEpic: string;
  onRefine?: (formData: TicketData) => void;
  onVersionChange?: (versionNumber: number, refinedSections?: string[]) => void;
  showVersionComparison?: boolean;
  comparisonData?: {
    prevVersion: TicketData | null;
    currentVersion: TicketData | null;
    sections: string[];
  };
  onAcceptChanges?: (section: string) => void;
  onRejectChanges?: (section: string) => void;
  onCloseComparison?: () => void;
  onReopenComparison?: () => void;
  acceptedSections?: Set<string>; // Sections that have been visually accepted by the user
  teamContext?: TeamContext;
}

export interface UnifiedTicketPanelRef {
  getFormData: () => TicketData | null;
  setFormData: (data: TicketData) => void;
  resetForm: () => void;
  simulateJiraPopulation: () => void;
  setTicketData: (data: TicketData) => void;
  triggerVersionedMode: (formData: TicketData) => void;
  getVersionByIndex: (index: number) => TicketData | null;
  getAllVersions: () => TicketData[];
  getUploadedFiles: () => File[];
  getSelectedJiraAttachments: () => string[];
  populateFromTemplate: (templateContent: { title: string; description: string; acceptanceCriteria: string }) => void;
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
  createNewVersionFromChat: (updatedData: TicketData, chatMessage: string, changedSections: string[], clarityScore?: number | null, clarityScoreReasoning?: string | null, investBreakdown?: InvestCriteria | null) => number | null;
}

const UnifiedTicketPanel = forwardRef<UnifiedTicketPanelRef, UnifiedTicketPanelProps>(({
  initialMode,
  selectedEpic,
  onRefine,
  onVersionChange,
  showVersionComparison = false,
  comparisonData,
  onAcceptChanges,
  onRejectChanges,
  onCloseComparison,
  onReopenComparison,
  acceptedSections,
  teamContext
}, ref) => {
  const [isVersionedMode, setIsVersionedMode] = useState<boolean>(false);
  const [versionedData, setVersionedData] = useState<TicketData | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(0);
  const [currentFormData, setCurrentFormData] = useState<TicketData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedJiraAttachments, setSelectedJiraAttachments] = useState<string[]>([]);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [showJiraPushModal, setShowJiraPushModal] = useState<boolean>(false);
  const [jiraPushMode, setJiraPushMode] = useState<'create' | 'update'>('create');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [templateStructure, setTemplateStructureState] = useState<{
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  } | null>(null);
  const ticketFormRef = useRef<TicketFormRef>(null);
  const versionedTicketRef = useRef<VersionedTicketRef>(null);

  // Update current form data periodically when version comparison is shown
  useEffect(() => {
    if (!showVersionComparison) return;

    const updateFormData = () => {
      if (isVersionedMode && versionedTicketRef.current) {
        setCurrentFormData(versionedTicketRef.current.getCurrentVersionData());
      } else if (ticketFormRef.current) {
        setCurrentFormData(ticketFormRef.current.getFormData());
      }
    };

    // Update immediately
    updateFormData();

    // Then update every 100ms while comparison is shown
    const interval = setInterval(updateFormData, 100);
    return () => clearInterval(interval);
  }, [showVersionComparison, isVersionedMode]);

  // Show file upload section immediately when in form mode
  useEffect(() => {
    if (!isVersionedMode) {
      setShowFileUpload(true);
    } else {
      setShowFileUpload(false);
    }
  }, [isVersionedMode]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getFormData: () => {
      if (isVersionedMode && versionedTicketRef.current) {
        return versionedTicketRef.current.getCurrentVersionData();
      }
      return ticketFormRef.current?.getFormData() || null;
    },
    setFormData: (data: TicketData) => {
      if (isVersionedMode && versionedTicketRef.current) {
        versionedTicketRef.current.updateCurrentVersion(data);
      } else {
        ticketFormRef.current?.setFormData(data);
      }
    },
    resetForm: () => {
      setIsVersionedMode(false);
      setVersionedData(null);
      setCurrentVersionNumber(0);
      setUploadedFiles([]);
      setSelectedJiraAttachments([]);
      setShowFileUpload(false);
      setTemplateStructureState(null);
      ticketFormRef.current?.resetForm();
    },
    simulateJiraPopulation: () => {
      ticketFormRef.current?.simulateJiraPopulation();
    },
    setTicketData: (data: TicketData) => {
      setVersionedData(data);
    },
    triggerVersionedMode: (formData: TicketData) => {
      setVersionedData(formData);
      setIsVersionedMode(true);
      setCurrentVersionNumber(0);
    },
    getVersionByIndex: (index: number) => {
      if (isVersionedMode && versionedTicketRef.current) {
        return versionedTicketRef.current.getVersionByIndex(index);
      }
      return null;
    },
    getAllVersions: () => {
      if (isVersionedMode && versionedTicketRef.current) {
        return versionedTicketRef.current.getAllVersions();
      }
      return [];
    },
    getUploadedFiles: () => {
      return uploadedFiles;
    },
    getSelectedJiraAttachments: () => {
      return selectedJiraAttachments;
    },
    populateFromTemplate: (templateContent: { title: string; description: string; acceptanceCriteria: string }) => {
      // Only populate when in form mode (not versioned mode)
      if (!isVersionedMode && ticketFormRef.current) {
        ticketFormRef.current.setFormData({
          title: templateContent.title,
          description: templateContent.description,
          acceptanceCriteria: templateContent.acceptanceCriteria
        });
        
        // Show file upload section since form now has content
        setShowFileUpload(true);
      }
    },
    setTemplateStructure: (structure: {
      titleFormat: string;
      descriptionFormat: string;
      acceptanceCriteriaFormat: string;
      additionalFields?: { [key: string]: string };
    }) => {
      setTemplateStructureState(structure);
      
      // Also pass the template structure to the TicketForm if in form mode
      if (!isVersionedMode && ticketFormRef.current) {
        ticketFormRef.current.setTemplateStructure(structure);
      }
    },
    getTemplateStructure: () => {
      return templateStructure;
    },
    setClarityScore: (score: number | null, reasoning?: string | null, investBreakdown?: InvestCriteria | null) => {
      if (isVersionedMode && versionedTicketRef.current) {
        versionedTicketRef.current.setClarityScore(score, reasoning, investBreakdown);
      } else if (ticketFormRef.current) {
        ticketFormRef.current.setClarityScore(score, reasoning, investBreakdown);
      }
    },
    createNewVersionFromChat: (updatedData: TicketData, chatMessage: string, changedSections: string[], clarityScore?: number | null, clarityScoreReasoning?: string | null, investBreakdown?: InvestCriteria | null) => {
      if (isVersionedMode && versionedTicketRef.current) {
        return versionedTicketRef.current.createNewVersionFromChat(updatedData, chatMessage, changedSections, clarityScore, clarityScoreReasoning, investBreakdown);
      }
      return null;
    }
  }));

  const handleVersionChange = (versionNumber: number, refinedSections?: string[]) => {
    setCurrentVersionNumber(versionNumber);
    onVersionChange?.(versionNumber, refinedSections);
  };

  const handleRefine = (formData: TicketData) => {
    // Switch to versioned mode and set the initial data as Version 1
    setVersionedData(formData);
    setIsVersionedMode(true);
    setCurrentVersionNumber(0);
    
    // Pass the form data and template structure to the parent for API call
    onRefine?.(formData);
  };

  const handleBackToForm = () => {
    setIsVersionedMode(false);
    setVersionedData(null);
    setCurrentVersionNumber(0);
  };

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
    // Here you could also pass the files to a parent component or API
    // for processing when the ticket is refined
  };

  const handleJiraAttachmentsChange = (selectedIds: string[]) => {
    setSelectedJiraAttachments(selectedIds);
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
    
    // If this was a new ticket creation, update the form to indicate it's now linked to Jira
    if (jiraPushMode === 'create' && ticketFormRef.current) {
      // You could add a method to mark the ticket as linked to Jira
      // ticketFormRef.current.setJiraLinked(ticketKey, ticketUrl);
    }
  };

  const handleJiraPushError = (error: string) => {
    console.error('Jira push error:', error);
    
    // Show error toast
    setToastMessage(`❌ ${error}`);
    setToastType('error');
    setShowToast(true);
  };

  const getCurrentTicketData = () => {
    if (isVersionedMode && versionedTicketRef.current) {
      return versionedTicketRef.current.getCurrentVersionData();
    }
    // Get current form data, preserving jiraKey and jiraUrl if they exist
    const formData = ticketFormRef.current?.getFormData();
    if (formData) {
      return formData;
    }
    // If no form data, create fallback that preserves any existing jira info
    const fallbackData: TicketData = { 
      title: '', 
      description: '', 
      acceptanceCriteria: ''
    };
    // Try to preserve jiraKey/jiraUrl from versioned data if available
    if (versionedData?.jiraKey) {
      fallbackData.jiraKey = versionedData.jiraKey;
    }
    if (versionedData?.jiraUrl) {
      fallbackData.jiraUrl = versionedData.jiraUrl;
    }
    return fallbackData;
  };

  const getJiraTicketKey = () => {
    const ticketData = getCurrentTicketData();
    // Check if ticket data has a jiraKey field when it comes from Jira
    return (ticketData as TicketData & { jiraKey?: string })?.jiraKey || null;
  };

  return (
    <div className="bg-neutral-900/70 backdrop-blur-sm p-6 rounded-xl border border-neutral-800 shadow-lg">
      {!isVersionedMode ? (
        // Ticket Form Mode
        <div>
          {/* Header with Jira Push Button */}
          {isJiraConnected() && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-700/50">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-neutral-200">
                  Jira Ticket Editor
                </h2>
                
                <div className="flex items-center space-x-2">
                  {getJiraTicketKey() && (
                    <span className="text-xs text-neutral-400 font-mono bg-neutral-700/50 px-2 py-1 rounded">
                      {getJiraTicketKey()}
                    </span>
                  )}
                  {getJiraTicketKey() ? (
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
              </div>
            </div>
          )}
          
          <TicketForm 
            initialMode={initialMode}
            selectedEpic={selectedEpic}
            ref={ticketFormRef}
            onRefine={handleRefine}
          />
          
          {/* File Upload Section - shown when form has content */}
          {showFileUpload && (
            <FileUploadSection 
              onFilesChange={handleFilesChange}
              onJiraAttachmentsChange={handleJiraAttachmentsChange}
              jiraAttachments={ticketFormRef.current?.getJiraAttachments?.() || []}
              isJiraPopulated={ticketFormRef.current?.isPopulatedFromJira?.() || false}
            />
          )}

        </div>
      ) : (
        // Versioned Mode
        <div>
          {versionedData ? (
            <>
              {/* Header with Jira Push Button for Versioned Mode */}
              {isJiraConnected() && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-700/50">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold flex items-center text-neutral-200">
                      <ArrowPathRoundedSquareIcon className="h-5 w-5 mr-2 text-indigo-400" />
                      Versioned Ticket Editor
                    </h2>
                    
                    <div className="flex items-center space-x-2">
                      {getJiraTicketKey() && (
                        <span className="text-xs text-neutral-400 font-mono bg-neutral-700/50 px-2 py-1 rounded">
                          {getJiraTicketKey()}
                        </span>
                      )}
                      {getJiraTicketKey() ? (
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
                  </div>
                </div>
              )}
              
              <VersionedTicket
                ref={versionedTicketRef}
                initialData={versionedData}
                onVersionChange={handleVersionChange}
                onBackToForm={handleBackToForm}
                teamContext={teamContext}
                uploadedFiles={uploadedFiles}
              />
              
              {/* Version comparison section */}
              {showVersionComparison && currentVersionNumber > 0 && comparisonData && 
               comparisonData.prevVersion && comparisonData.currentVersion && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-indigo-400" />
                      Changes Summary
                    </h3>
                    <button 
                      onClick={onCloseComparison}
                      className="text-sm flex items-center px-2 py-1 rounded bg-neutral-800/70 hover:bg-neutral-700/80 text-neutral-300"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Close Comparison
                    </button>
                  </div>
                  
                  <VersionComparison 
                    prevVersion={comparisonData.prevVersion}
                    currentVersion={comparisonData.currentVersion}
                    sections={comparisonData.sections}
                    onAcceptChanges={onAcceptChanges}
                    onRejectChanges={onRejectChanges}
                    liveFormData={currentFormData || undefined}
                    acceptedSections={acceptedSections}
                    getCurrentFormData={() => {
                      if (isVersionedMode && versionedTicketRef.current) {
                        return versionedTicketRef.current.getCurrentVersionData();
                      }
                      const formData = ticketFormRef.current?.getFormData();
                      if (formData) {
                        return formData;
                      }
                      // Fallback that preserves jira info
                      const fallbackData: TicketData = { title: '', description: '', acceptanceCriteria: '' };
                      if (versionedData?.jiraKey) {
                        fallbackData.jiraKey = versionedData.jiraKey;
                      }
                      if (versionedData?.jiraUrl) {
                        fallbackData.jiraUrl = versionedData.jiraUrl;
                      }
                      return fallbackData;
                    }}
                  />
                </div>
              )}
              
              {/* Reopen Comparison button - shown when comparison is closed but data exists */}
              {!showVersionComparison && currentVersionNumber > 0 && comparisonData && comparisonData.prevVersion && onReopenComparison && (
                <div className="mt-6">
                  <div className="bg-neutral-900/50 backdrop-blur-sm p-4 rounded-xl border border-neutral-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ClockIcon className="h-5 w-5 mr-2 text-indigo-400" />
                        <span className="text-sm text-neutral-300">Version comparison available</span>
                      </div>
                      <button
                        onClick={onReopenComparison}
                        className="text-sm flex items-center px-3 py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-600/30 transition-colors"
                      >
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Reopen Comparison
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-neutral-400 mb-4">
                <ArrowPathRoundedSquareIcon className="h-12 w-12 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-neutral-300">No Version Data</h3>
              <p className="text-neutral-500 text-center mt-2">
                Something went wrong. Please go back to the form.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Jira Push Modal */}
      <JiraPushModal
        isOpen={showJiraPushModal}
        onClose={() => setShowJiraPushModal(false)}
        ticketData={{
          ...getCurrentTicketData(),
          key: getJiraTicketKey() || undefined
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
});

UnifiedTicketPanel.displayName = 'UnifiedTicketPanel';

export default UnifiedTicketPanel;
