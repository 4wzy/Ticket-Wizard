"use client";

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  StarIcon,
  ClockIcon,
  CheckIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  isFavorite: boolean;
  structure: {
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: {
      [key: string]: string;
    };
  };
}

const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Standard User Story',
    description: 'Standard user story format with business value and acceptance criteria scaffolding',
    category: 'User Stories',
    tags: ['user-story', 'agile', 'product'],
    createdBy: 'Product Team',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    isPublic: true,
    isFavorite: true,
    structure: {
      titleFormat: 'As a {user_type}, I want to {action} so that {business_value}',
      descriptionFormat: '{Why this exists}\n\n**User Story:**\nAs a {user_type}, I want to {action} so that {business_value}.\n\n**Business Requirements:**\n- {requirement_1}\n- {requirement_2}\n- {requirement_3}\n\n**Dependencies:**\n- {dependency_1}\n- {dependency_2}\n\n**Out of Scope:**\n- {out_of_scope_item}',
      acceptanceCriteriaFormat: '**Given** {precondition}\n**When** {action}\n**Then** {expected_outcome}\n\n**Given** {precondition_2}\n**When** {action_2}\n**Then** {expected_outcome_2}\n\n**Additional Criteria:**\n- {performance_requirement}\n- {accessibility_requirement}\n- {security_requirement}'
    }
  },
  {
    id: '2',
    name: 'Bug Report Structure',
    description: 'Comprehensive bug report template with impact assessment and reproduction steps',
    category: 'Bug Reports',
    tags: ['bug', 'defect', 'quality'],
    createdBy: 'QA Team',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
    isPublic: true,
    isFavorite: false,
    structure: {
      titleFormat: '{Bug summary} - {Affected component}',
      descriptionFormat: '**Bug Summary:**\n{One sentence summary}\n\n**Impact Assessment:**\n- **Severity:** {Critical/High/Medium/Low}\n- **Affected Users:** {User segment}\n- **Business Impact:** {Impact description}\n\n**Environment:**\n- **OS:** {Operating system}\n- **Browser/App Version:** {Version info}\n- **Device:** {Device details}\n\n**Steps to Reproduce:**\n1. {Step 1}\n2. {Step 2}\n3. {Step 3}\n\n**Expected Behavior:**\n{What should happen}\n\n**Actual Behavior:**\n{What actually happens}\n\n**Additional Information:**\n- **Error Messages:** {Error details}\n- **Screenshots/Videos:** {Attachment info}\n- **Workaround:** {If available}',
      acceptanceCriteriaFormat: '**Bug Fix Verification:**\n- [ ] Bug no longer reproduces in the reported environment\n- [ ] Fix doesn\'t introduce new regressions\n- [ ] All related test cases pass\n\n**Testing Requirements:**\n- [ ] Tested across {supported_browsers}\n- [ ] Verified on {supported_devices}\n- [ ] Performance impact assessed\n\n**Documentation:**\n- [ ] Release notes updated\n- [ ] Known issues documentation updated if needed'
    }
  },
  {
    id: '3',
    name: 'Feature Enhancement',
    description: 'Feature enhancement template with business justification and success metrics',
    category: 'Feature Requests',
    tags: ['feature', 'enhancement', 'product'],
    createdBy: 'Product Team',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-22',
    isPublic: true,
    isFavorite: true,
    structure: {
      titleFormat: 'Enhance {feature_name} to {improvement_goal}',
      descriptionFormat: '**Feature Enhancement Overview:**\n{Brief description of the enhancement}\n\n**Business Justification:**\n- **Problem Statement:** {Current limitation}\n- **Opportunity:** {Business opportunity}\n- **Success Metrics:** {How we measure success}\n\n**Current State:**\n{Description of current functionality}\n\n**Proposed Enhancement:**\n{Detailed description of proposed changes}\n\n**User Benefits:**\n- {Benefit 1}\n- {Benefit 2}\n- {Benefit 3}\n\n**Technical Considerations:**\n- **Architecture Impact:** {High-level technical impact}\n- **Integration Points:** {Systems affected}\n- **Performance Implications:** {Performance considerations}\n\n**Implementation Approach:**\n1. {Phase 1}\n2. {Phase 2}\n3. {Phase 3}',
      acceptanceCriteriaFormat: '**Functional Requirements:**\n- [ ] {Core functionality requirement}\n- [ ] {User interaction requirement}\n- [ ] {Data handling requirement}\n\n**Performance Requirements:**\n- [ ] Enhancement doesn\'t degrade existing performance by more than {threshold}\n- [ ] New functionality performs within {performance_target}\n\n**Quality Requirements:**\n- [ ] Feature works across all supported {platforms/browsers}\n- [ ] Accessibility standards maintained (WCAG 2.1 AA)\n- [ ] Feature is responsive on mobile and desktop\n\n**Business Acceptance:**\n- [ ] Success metrics can be measured\n- [ ] Feature delivers expected user benefits\n- [ ] Enhancement integrates seamlessly with existing workflow'
    }
  },
  {
    id: '4',
    name: 'Technical Debt & Refactoring',
    description: 'Technical debt and refactoring template with risk assessment and benefits',
    category: 'Technical Debt',
    tags: ['technical-debt', 'refactoring', 'engineering'],
    createdBy: 'Engineering Team',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-25',
    isPublic: true,
    isFavorite: false,
    structure: {
      titleFormat: 'Refactor {component/system} to {improvement_goal}',
      descriptionFormat: '**Technical Debt Overview:**\n{Description of the technical debt}\n\n**Current Problems:**\n- {Problem 1}\n- {Problem 2}\n- {Problem 3}\n\n**Risk Assessment:**\n- **Current Risk Level:** {High/Medium/Low}\n- **Impact if Not Addressed:** {Consequences}\n- **Effort Required:** {Development time estimate}\n\n**Proposed Solution:**\n{Detailed technical approach}\n\n**Benefits:**\n- **Code Quality:** {Quality improvements}\n- **Performance:** {Performance gains}\n- **Maintainability:** {Maintenance benefits}\n- **Developer Experience:** {DX improvements}\n\n**Migration Strategy:**\n1. {Step 1}\n2. {Step 2}\n3. {Step 3}\n\n**Rollback Plan:**\n{How to revert if issues arise}',
      acceptanceCriteriaFormat: '**Technical Requirements:**\n- [ ] {Code quality metric} improves by {target}\n- [ ] All existing functionality remains intact\n- [ ] No performance regression in {critical_paths}\n- [ ] Test coverage maintained or improved\n\n**Code Quality:**\n- [ ] Code complexity reduced by {target_percentage}\n- [ ] Technical debt score improves\n- [ ] Code follows current architectural patterns\n- [ ] Documentation is updated\n\n**Deployment & Monitoring:**\n- [ ] Changes can be deployed without downtime\n- [ ] Monitoring is in place to detect issues\n- [ ] Rollback procedure is tested and documented\n\n**Team Impact:**\n- [ ] Team productivity improvements are measurable\n- [ ] Developer onboarding time is reduced\n- [ ] Bug resolution time improves'
    }
  },
  {
    id: '5',
    name: 'Research & Discovery',
    description: 'Research and discovery template with investigation methods and deliverables',
    category: 'Research & Discovery',
    tags: ['research', 'discovery', 'investigation'],
    createdBy: 'Product Team',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-28',
    isPublic: true,
    isFavorite: false,
    structure: {
      titleFormat: 'Research: {research_topic} for {objective}',
      descriptionFormat: '**Research Objective:**\n{What we want to learn or validate}\n\n**Background:**\n{Context and why this research is needed}\n\n**Research Questions:**\n1. {Question 1}\n2. {Question 2}\n3. {Question 3}\n\n**Research Methods:**\n- **Primary Research:** {User interviews, surveys, etc.}\n- **Secondary Research:** {Market analysis, competitor review, etc.}\n- **Technical Investigation:** {Feasibility studies, prototypes, etc.}\n\n**Success Criteria:**\n{How we\'ll know the research was successful}\n\n**Timeline:**\n- **Research Phase:** {Duration}\n- **Analysis Phase:** {Duration}\n- **Presentation Phase:** {Duration}\n\n**Resources Needed:**\n- {Resource 1}\n- {Resource 2}\n- {Resource 3}',
      acceptanceCriteriaFormat: '**Research Deliverables:**\n- [ ] Research plan is documented and approved\n- [ ] {Target_number} {research_participants} recruited and interviewed\n- [ ] Data is collected using approved methods\n- [ ] Findings are analyzed and documented\n\n**Analysis & Documentation:**\n- [ ] Key insights are identified and prioritized\n- [ ] Recommendations are actionable and specific\n- [ ] Results are presented to {stakeholder_group}\n- [ ] Raw data is stored securely for future reference\n\n**Decision Making:**\n- [ ] Research questions are answered with sufficient confidence\n- [ ] Next steps are clearly defined\n- [ ] Go/no-go decision is made where applicable\n\n**Knowledge Sharing:**\n- [ ] Findings are shared with broader team\n- [ ] Learnings are documented for future reference\n- [ ] Research methodology is evaluated and improved'
    }
  }
];

interface TemplateSelectionProps {
  onTemplateSelect: (template: Template) => void;
  activeTemplateId?: string; // Added to track the active template
  className?: string;
}

export default function TemplateSelection({ onTemplateSelect, activeTemplateId, className = "" }: TemplateSelectionProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load templates from database
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        // Convert database template format to component format
        const convertedTemplates: Template[] = (data.templates || []).map((dbTemplate: {
          id: string;
          name: string;
          description: string;
          category?: string;
          tags?: string[];
          created_by?: string;
          created_at: string;
          updated_at: string;
          visibility_scope: string;
          title_format: string;
          description_format: string;
          acceptance_criteria_format: string;
          additional_fields?: Record<string, unknown>;
        }) => ({
          id: dbTemplate.id,
          name: dbTemplate.name,
          description: dbTemplate.description,
          category: dbTemplate.category || 'General',
          tags: dbTemplate.tags || [],
          createdBy: dbTemplate.created_by || 'Unknown',
          createdAt: dbTemplate.created_at,
          updatedAt: dbTemplate.updated_at,
          isPublic: dbTemplate.visibility_scope === 'global' || dbTemplate.visibility_scope === 'organization',
          isFavorite: favoriteTemplates.includes(dbTemplate.id),
          structure: {
            titleFormat: dbTemplate.title_format,
            descriptionFormat: dbTemplate.description_format,
            acceptanceCriteriaFormat: dbTemplate.acceptance_criteria_format,
            additionalFields: dbTemplate.additional_fields || {}
          }
        }));
        setTemplates(convertedTemplates);
      } else {
        console.error('Failed to load templates:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load favorites and recents from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('template-favorites');
    const savedRecents = localStorage.getItem('template-recents');
    
    if (savedFavorites) {
      try {
        setFavoriteTemplates(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
    
    if (savedRecents) {
      try {
        setRecentTemplates(JSON.parse(savedRecents));
      } catch (error) {
        console.error('Error loading recents:', error);
      }
    }
  }, []);

  // Check for template data from localStorage (from templates page)
  useEffect(() => {
    const selectedTemplate = localStorage.getItem('selectedTemplate');
    if (selectedTemplate) {
      try {
        const template = JSON.parse(selectedTemplate);
        onTemplateSelect(template);
        localStorage.removeItem('selectedTemplate'); // Clean up
      } catch (error) {
        console.error('Error parsing selected template:', error);
      }
    }
  }, [onTemplateSelect]);

  // Filter templates based on search
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get favorite templates
  const getFavoriteTemplates = () => {
    return templates.filter(template => favoriteTemplates.includes(template.id));
  };

  // Get recent templates
  const getRecentTemplates = () => {
    return templates.filter(template => recentTemplates.includes(template.id));
  };

  // Toggle favorite status
  const toggleFavorite = (templateId: string) => {
    const updated = favoriteTemplates.includes(templateId) 
      ? favoriteTemplates.filter(id => id !== templateId)
      : [...favoriteTemplates, templateId];
    setFavoriteTemplates(updated);
    localStorage.setItem('template-favorites', JSON.stringify(updated));
    
    // Update the isFavorite property in templates state
    setTemplates(prevTemplates => 
      prevTemplates.map(template => 
        template.id === templateId 
          ? { ...template, isFavorite: updated.includes(templateId) }
          : template
      )
    );
  };

  // Add to recent templates
  const addToRecentTemplates = (templateId: string) => {
    const updated = [templateId, ...recentTemplates.filter(id => id !== templateId)].slice(0, 5);
    setRecentTemplates(updated);
    localStorage.setItem('template-recents', JSON.stringify(updated));
  };

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    addToRecentTemplates(template.id);
    onTemplateSelect(template);
  };

  // Helper function to render a template item, now with active state
  const renderTemplateItem = (template: Template, isFavoriteSection: boolean = false) => {
    const isActive = template.id === activeTemplateId;
    return (
      <button
        key={template.id}
        onClick={() => handleTemplateSelect(template)}
        className={`w-full p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-lg border transition-colors text-left group ${
          isActive ? 'border-purple-500 ring-2 ring-purple-500' : 'border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-neutral-200 text-sm truncate">{template.name}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(template.id);
              }}
              className="text-neutral-400 hover:text-yellow-400 transition-colors"
            >
              <StarIcon className={`h-4 w-4 ${favoriteTemplates.includes(template.id) || isFavoriteSection ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
            <ArrowRightIcon className="h-4 w-4 text-neutral-400 group-hover:text-purple-400 transition-colors" />
          </div>
        </div>
        <p className="text-xs text-neutral-400 truncate">{template.description}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
            {template.category}
          </span>
          <span className="text-xs text-neutral-500">
            {template.tags.length} tags
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className={`bg-neutral-900/70 backdrop-blur-sm p-6 rounded-xl border border-neutral-800 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-400" />
          Template Selection
        </h2>
        <a
          href="/templates"
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          View All →
        </a>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
        </div>
        <input
          type="text"
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/70 text-neutral-200 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading templates...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div className="text-center py-8">
          <DocumentTextIcon className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-400">No templates available</p>
          <p className="text-neutral-500 text-sm mt-2">Create templates in the Templates page</p>
        </div>
      )}

      {/* Quick Access - Only show when no search and not loading */}
      {!loading && searchQuery === '' && templates.length > 0 && (
        <div className="space-y-4 mb-4">
          {/* Recent Templates */}
          {getRecentTemplates().length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2 flex items-center">
                <ClockIcon className="h-4 w-4 mr-2" />
                Recent
              </h3>
              <div className="space-y-2">
                {getRecentTemplates().slice(0, 2).map(template => renderTemplateItem(template))}
              </div>
            </div>
          )}

          {/* Favorite Templates */}
          {getFavoriteTemplates().length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2 flex items-center">
                <StarIcon className="h-4 w-4 mr-2 text-yellow-400" />
                Favorites
              </h3>
              <div className="space-y-2">
                {getFavoriteTemplates().slice(0, 2).map(template => renderTemplateItem(template, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtered Templates List (if searching) */}
      {!loading && searchQuery !== '' && (
        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map(template => renderTemplateItem(template))
          ) : (
            <p className="text-neutral-400 text-sm text-center py-4">No templates match your search.</p>
          )}
        </div>
      )}
      
      {/* Show all templates if not searching and no quick access items are shown (or to provide a fallback) */}
      {!loading && searchQuery === '' && getRecentTemplates().length === 0 && getFavoriteTemplates().length === 0 && (
         <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2">
          {templates.length > 0 ? (
            templates.slice(0, 5).map(template => renderTemplateItem(template)) // Show first 5 as a general list
          ) : (
            <p className="text-neutral-400 text-sm text-center py-4">No templates available.</p>
          )}
        </div>
      )}

      {/* Browse All Templates Link */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <a
          href="/templates"
          className="flex items-center justify-center w-full py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Browse All Templates
        </a>
      </div>
    </div>
  );
}
