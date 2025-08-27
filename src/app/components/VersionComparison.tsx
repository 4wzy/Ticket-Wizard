"use client";

import { useState, useMemo } from 'react';
import { ArrowPathIcon, CheckIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import { TicketData } from './TicketForm';

interface VersionDiffProps {
  prevVersion: TicketData;
  currentVersion: TicketData;
  sections: string[];
  onAcceptChanges?: (section: string) => void;
  onRejectChanges?: (section: string) => void;
  getCurrentFormData?: () => TicketData; // Function to get live form data
  liveFormData?: TicketData; // Live form data as a prop to trigger re-renders
  acceptedSections?: Set<string>; // Sections that have been visually accepted by the user
}

const VersionComparison: React.FC<VersionDiffProps> = ({
  prevVersion,
  currentVersion,
  sections,
  onAcceptChanges,
  onRejectChanges,
  getCurrentFormData,
  liveFormData,
  acceptedSections
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [highlightChanges, setHighlightChanges] = useState<boolean>(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Calculate changes between versions
  const sectionChanges = useMemo(() => {
    return sections.reduce((acc, section) => {
      const prev = prevVersion[section as keyof TicketData] as string || '';
      // Use live form data if available, otherwise fall back to currentVersion or function call
      const current = (liveFormData?.[section as keyof TicketData] as string) ||
                     (getCurrentFormData?.()[section as keyof TicketData] as string) ||
                     (currentVersion[section as keyof TicketData] as string) || '';
      acc[section] = prev !== current;
      return acc;
    }, {} as Record<string, boolean>);
  }, [prevVersion, currentVersion, sections, getCurrentFormData, liveFormData]);
  
  // Helper function to identify changes with improved highlighting
  const getTextWithHighlight = (prevText: string, newText: string) => {
    if (!highlightChanges) return newText;
    if (prevText === newText) return newText;
    
    // This is a simplified highlighting for demo purposes
    // In production, use a proper diff algorithm
    return (
      <div className="relative">
        <span className="text-green-400">{newText}</span>
        <span className="absolute bottom-0 left-0 right-0 border-b border-green-400"></span>
      </div>
    );
  };
  
  // Display the section value with proper formatting
  const renderSectionContent = (section: string, data: TicketData, isNew: boolean = false) => {
    let value: string;
    
    if (isNew) {
      // For the "Current" section, prioritize live form data prop, then function call, then static data
      value = (liveFormData?.[section as keyof TicketData] as string) ||
              (getCurrentFormData?.()[section as keyof TicketData] as string) ||
              (data[section as keyof TicketData] as string);
    } else {
      value = data[section as keyof TicketData] as string;
    }
    
    if (section === 'title') {
      return (
        <h3 className="text-lg font-medium">
          {isNew 
            ? getTextWithHighlight(prevVersion.title, value) 
            : value}
        </h3>
      );
    }
    
    // For description and acceptanceCriteria, handle multi-line text
    const content = value || 'Not provided';
    
    if (isNew) {
      return (
        <div className="whitespace-pre-line">
          {getTextWithHighlight(
            prevVersion[section as keyof TicketData] as string, 
            content
          )}
        </div>
      );
    }
    
    return <div className="whitespace-pre-line">{content}</div>;
  };
  
  // Rendering helper for section title
  const renderSectionTitle = (section: string) => {
    return (
      <div className="text-sm font-medium mb-1 text-neutral-400">
        {section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
      </div>
    );
  };

  // Handle section expand/collapse
  const toggleSectionExpand = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center py-2">
        <h3 className="text-lg font-semibold text-neutral-200 flex items-center">
          <ArrowPathIcon className="h-5 w-5 mr-2 text-blue-400" />
          Version Comparison
        </h3>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="highlight-changes"
              checked={highlightChanges}
              onChange={() => setHighlightChanges(!highlightChanges)}
              className="mr-2 h-4 w-4 rounded border-neutral-600 text-purple-600 focus:ring-purple-600"
            />
            <label htmlFor="highlight-changes" className="text-sm text-neutral-300">
              Highlight Changes
            </label>
          </div>
          
          <div className="flex items-center space-x-1 bg-neutral-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'split' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'unified' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Unified View
            </button>
          </div>
        </div>
      </div>
      
      {/* Section comparisons with improved UI */}
      {sections.map((section) => {
        const hasChanges = sectionChanges[section];
        const isAccepted = acceptedSections?.has(section) || false;
        // Show as unchanged if section has been accepted, otherwise show original state
        const displayAsModified = hasChanges && !isAccepted;
        
        return (
          <div 
            key={section} 
            className={`border rounded-lg overflow-hidden transition-all duration-300 ${
              displayAsModified 
                ? 'border-green-600/30 shadow-[0_0_10px_rgba(22,163,74,0.1)]' 
                : 'border-neutral-700'
            } ${expandedSection === section ? 'shadow-lg' : ''}`}
          >
            <div 
              className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                displayAsModified 
                  ? 'bg-green-900/20 border-b border-green-800/30' 
                  : 'bg-neutral-800/50 border-b border-neutral-700'
              }`}
              onClick={() => toggleSectionExpand(section)}
            >
              <div className="flex items-center space-x-2">
                {displayAsModified && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
                <span className={`text-sm font-medium ${displayAsModified ? 'text-green-400' : 'text-neutral-300'}`}>
                  {section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                {displayAsModified && (
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                    Modified
                  </span>
                )}
                {isAccepted && hasChanges && (
                  <span className="text-xs bg-neutral-700/50 text-neutral-400 px-2 py-0.5 rounded">
                    Accepted
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {displayAsModified && onAcceptChanges && onRejectChanges && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcceptChanges(section);
                      }}
                      className="p-1 bg-green-600/20 hover:bg-green-600/40 rounded-full text-green-400"
                      title="Accept changes"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRejectChanges(section);
                      }}
                      className="p-1 bg-red-600/20 hover:bg-red-600/40 rounded-full text-red-400"
                      title="Reject changes"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
                <EyeIcon className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
            
            {(expandedSection === section || expandedSection === null) && (
              <div className={viewMode === 'split' ? 'grid grid-cols-2 divide-x divide-neutral-700' : ''}>
                {/* If in split view, show the previous version */}
                {viewMode === 'split' && (
                  <div className="p-4 bg-neutral-900/50">
                    {renderSectionTitle('Previous')}
                    {renderSectionContent(section, prevVersion)}
                  </div>
                )}
                
                {/* Current version (always shown) */}
                <div className="p-4">
                  {viewMode === 'split' 
                    ? renderSectionTitle('Current')
                    : renderSectionTitle('Changes')}
                    
                  {renderSectionContent(section, currentVersion, true)}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      <div className="text-xs text-neutral-500 mt-2 text-center">
        <span>
          Showing changes between versions. {viewMode === 'unified' ? 'Highlights show modified content.' : 'Left side shows previous version.'}
        </span>
      </div>
    </div>
  );
};

export default VersionComparison;
