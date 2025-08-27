"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import NavHelper from '@/app/components/NavHelper';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import { authenticatedFetch } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  StarIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { TEMPLATE_CATEGORIES, MOCK_TEMPLATES, Template, TemplateStructure } from '@/lib/templatesData';

// Define a type for the form data, using the imported TemplateStructure
interface TemplateFormData {
  id?: string; // Present when editing
  name: string;
  description: string;
  category: string;
  tags: string; // Comma-separated for the input field
  structure: TemplateStructure; // Uses imported TemplateStructure
  visibility_scope: 'global' | 'organization' | 'team' | 'private';
  team_id?: string;
  additionalFieldsStr?: string; // String representation for the form input
}

const initialTemplateFormData: TemplateFormData = {
  name: '',
  description: '',
  category: TEMPLATE_CATEGORIES[1] || 'General', 
  tags: '',
  structure: {
    titleFormat: '{Issue Type}: {Short Description}',
    descriptionFormat: 'As a {User Role},\\nI want {Goal/Action}\\nSo that {Benefit/Value}\\n\\n**Details:**\\n{Provide more context}\\n\\n**Acceptance Criteria Placeholder:**\\n{AC_PLACEHOLDER}',
    acceptanceCriteriaFormat: '- {Criterion 1}\\n- {Criterion 2}\\n- {Criterion 3}',
    additionalFields: [], 
  },
  visibility_scope: 'organization',
  additionalFieldsStr: '[]', // Initialize as empty array string
};

export default function TemplatesPage() {
  const { user, teamMemberships, userRole, organization } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);
  const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>(['1', '3']);
  const [recentTemplates, setRecentTemplates] = useState<string[]>(['1', '2', '4']);

  // State for Create/Edit Modal
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null); // null for create, id for edit
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>(initialTemplateFormData);
  const [tagsInput, setTagsInput] = useState('');

  // Fetch templates from Supabase
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) return;
      
      try {
        const response = await authenticatedFetch('/api/templates');
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        const { templates: fetchedTemplates } = await response.json();
        
        // Map Supabase data to local interface format
        const mappedTemplates: Template[] = fetchedTemplates.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          category: t.category || 'General',
          tags: t.tags || [],
          structure: {
            titleFormat: t.title_format,
            descriptionFormat: t.description_format,
            acceptanceCriteriaFormat: t.acceptance_criteria_format,
            additionalFields: t.additional_fields || []
          },
          visibility_scope: t.visibility_scope || 'organization',
          team_id: t.team_id,
          organization_id: t.organization_id,
          isPublic: t.visibility_scope !== 'private', // Keep for backward compatibility
          createdBy: t.created_by,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        
        // Add mock templates as examples (but only if no templates exist)
        if (mappedTemplates.length === 0) {
          setTemplates(MOCK_TEMPLATES);
        } else {
          setTemplates(mappedTemplates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        // Use mock templates as fallback
        setTemplates(MOCK_TEMPLATES);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [user]);

  // Helper function to check if current user can edit a template
  const canEditTemplate = (template: Template): boolean => {
    if (!user || !organization) return false;

    // Creator can always edit their own templates
    if (template.createdBy === user.id) {
      return true;
    }

    // Check based on visibility scope
    switch (template.visibility_scope) {
      case 'private':
        // Only creator can edit private templates
        return false;
      
      case 'team':
        // Team members can edit team templates
        if (!template.team_id) return false;
        return teamMemberships?.some(membership => membership.team_id === template.team_id) || false;
      
      case 'organization':
        // Organization members can edit org templates
        return organization.id === template.organization_id;
      
      case 'global':
        // Only org admins can edit global templates (to prevent vandalism)
        return userRole === 'org_admin';
      
      default:
        return false;
    }
  };

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
    setFavoriteTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  // Add to recent templates
  const addToRecentTemplates = (templateId: string) => {
    setRecentTemplates(prev => {
      const filtered = prev.filter(id => id !== templateId);
      return [templateId, ...filtered].slice(0, 5);
    });
  };

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    addToRecentTemplates(template.id);
    // Removed: trackTemplateUsage(template.id);
  };

  // Handle using template (redirect to dashboard with template data)
  const handleUseTemplate = (template: Template) => {
    handleTemplateSelect(template);
    
    // Store template data in localStorage for dashboard to pick up
    localStorage.setItem('selectedTemplate', JSON.stringify(template));
    
    // Redirect to manual mode
    window.location.href = '/manual-mode';
  };

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingTemplateId(null);
    setTemplateFormData({
      ...initialTemplateFormData,
      team_id: teamMemberships.length > 0 ? teamMemberships[0].team_id : undefined
    });
    setTagsInput('');
    setShowCreateEditModal(true);
  };

  const handleOpenEditModal = (template: Template) => {
    setEditingTemplateId(template.id);
    setTemplateFormData({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags.join(', '), 
      structure: template.structure, 
      visibility_scope: template.visibility_scope || 'organization',
      team_id: template.team_id,
      additionalFieldsStr: JSON.stringify(template.structure.additionalFields || [], null, 2),
    });
    setTagsInput(template.tags.join(', ')); // Also update tagsInput for consistency
    setShowCreateEditModal(true);
    if (showTemplateDetails) setShowTemplateDetails(false); 
  };

  const handleCloseModal = () => {
    setShowCreateEditModal(false);
    setEditingTemplateId(null);
    setTemplateFormData(initialTemplateFormData); 
    setTagsInput(''); // Reset tagsInput as well
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'tags') {
      setTagsInput(value); // Keep this for the input field
      setTemplateFormData(prev => ({ ...prev, tags: value })); // Store raw comma-separated string
    } else if (name === 'titleFormat' || name === 'descriptionFormat' || name === 'acceptanceCriteriaFormat') {
      setTemplateFormData(prev => ({
        ...prev,
        structure: { ...prev.structure, [name]: value },
      }));
    } else if (name === 'additionalFieldsStr') {
      setTemplateFormData(prev => ({ ...prev, additionalFieldsStr: value })); 
      // Attempt to parse and update structure.additionalFields, but keep string for form
      try {
        const parsedFields = JSON.parse(value);
        setTemplateFormData(prev => ({
          ...prev,
          structure: { ...prev.structure, additionalFields: parsedFields },
        }));
      } catch (error) {
        // Error is handled at save, or could set a form error state here
        console.warn("Invalid JSON for additional fields during input");
      }
    } else {
      setTemplateFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSaveTemplate = async () => {
    // Create a mutable copy for modification
    let finalFormData = { ...templateFormData };

    // Process tags from the string input to an array
    const processedTags = finalFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    // Attempt to parse additionalFieldsStr into structure.additionalFields
    let parsedAdditionalFields = [];
    try {
      if (finalFormData.additionalFieldsStr) {
        parsedAdditionalFields = JSON.parse(finalFormData.additionalFieldsStr);
      }
    } catch (e) {
      alert("Additional Fields contains invalid JSON. Please correct it.");
      return;
    }

    try {
      if (editingTemplateId) { // Edit mode
        const response = await authenticatedFetch(`/api/templates/${editingTemplateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalFormData.name,
            description: finalFormData.description,
            category: finalFormData.category,
            tags: processedTags,
            title_format: finalFormData.structure.titleFormat,
            description_format: finalFormData.structure.descriptionFormat,
            acceptance_criteria_format: finalFormData.structure.acceptanceCriteriaFormat,
            additional_fields: parsedAdditionalFields,
            visibility_scope: finalFormData.visibility_scope,
            team_id: finalFormData.visibility_scope === 'team' ? finalFormData.team_id : null
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update template');
        }
        
        const { template } = await response.json();
        const updatedTemplate: Template = {
          id: template.id,
          name: template.name,
          description: template.description || '',
          category: template.category || 'General',
          tags: template.tags || [],
          structure: {
            titleFormat: template.title_format,
            descriptionFormat: template.description_format,
            acceptanceCriteriaFormat: template.acceptance_criteria_format,
            additionalFields: template.additional_fields || []
          },
          visibility_scope: template.visibility_scope || 'organization',
          team_id: template.team_id,
          isPublic: template.visibility_scope !== 'private',
          createdBy: template.created_by,
          createdAt: template.created_at,
          updatedAt: template.updated_at
        };
        
        setTemplates(prevTemplates => 
          prevTemplates.map(t => t.id === editingTemplateId ? updatedTemplate : t)
        );
      } else { // Create mode
        const response = await authenticatedFetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalFormData.name,
            description: finalFormData.description,
            category: finalFormData.category,
            tags: processedTags,
            title_format: finalFormData.structure.titleFormat,
            description_format: finalFormData.structure.descriptionFormat,
            acceptance_criteria_format: finalFormData.structure.acceptanceCriteriaFormat,
            additional_fields: parsedAdditionalFields,
            visibility_scope: finalFormData.visibility_scope,
            team_id: finalFormData.visibility_scope === 'team' ? finalFormData.team_id : null
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create template');
        }
        
        const { template } = await response.json();
        const newTemplate: Template = {
          id: template.id,
          name: template.name,
          description: template.description || '',
          category: template.category || 'General',
          tags: template.tags || [],
          structure: {
            titleFormat: template.title_format,
            descriptionFormat: template.description_format,
            acceptanceCriteriaFormat: template.acceptance_criteria_format,
            additionalFields: template.additional_fields || []
          },
          visibility_scope: template.visibility_scope || 'organization',
          team_id: template.team_id,
          isPublic: template.visibility_scope !== 'private',
          createdBy: template.created_by,
          createdAt: template.created_at,
          updatedAt: template.updated_at
        };
        
        setTemplates(prevTemplates => [newTemplate, ...prevTemplates]);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }
    
    try {
      const response = await authenticatedFetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setShowTemplateDetails(false);
      }
      if (editingTemplateId === templateId) {
        handleCloseModal();
      }
      // Also remove from favorites and recents if necessary
      setFavoriteTemplates(prev => prev.filter(id => id !== templateId));
      setRecentTemplates(prev => prev.filter(id => id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const availableCategories = TEMPLATE_CATEGORIES.filter((cat: string) => cat !== 'All');


  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <NavHelper />
      
      {/* Magical Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Multi-layered gradient orbs */}
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
          className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/15 to-purple-600/15 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />
        <motion.div 
          className="absolute top-2/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-r from-indigo-600/10 to-cyan-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 80, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8
          }}
        />

        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 3 === 0 
                ? 'w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-pink-400' 
                : i % 3 === 1 
                ? 'w-1 h-1 bg-gradient-to-r from-indigo-400 to-purple-400'
                : 'w-0.5 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-400'
            }`}
            initial={{
              x: Math.random() * 1200,
              y: Math.random() * 800,
              opacity: 0,
            }}
            animate={{
              y: [null, -40, 0],
              opacity: [0, 0.8, 0],
              scale: [0.3, 1.8, 0.3],
            }}
            transition={{
              duration: 5 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 4,
            }}
          />
        ))}

        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:60px_60px]">
          <motion.div
            className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.05)_1px,transparent_1px)] bg-[size:60px_60px]"
            animate={{
              backgroundPosition: ['0px 0px', '60px 60px']
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        {/* Magical spotlight */}
        <motion.div 
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-full blur-3xl"
          animate={{
            x: [-50, 50, -50],
            y: [-30, 30, -30],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      <main className="flex-1 flex relative z-10">
        <CollapsibleSidebar />
        <div className="flex-1 p-6 md:p-12 overflow-hidden">
          {/* Top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="max-w-7xl mx-auto">
            <motion.h1 
              className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 flex items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
                className="mr-3"
              >
                <DocumentTextIcon className="h-8 w-8" style={{ color: '#a855f7' }} />
              </motion.div>
              Ticket Templates
            </motion.h1>

            {/* Header Actions */}
            <motion.div 
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.p 
                className="text-neutral-300 text-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Create consistent, high-quality tickets with pre-built templates
              </motion.p>
              <motion.button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <PlusIcon className="w-5 h-5" />
                </motion.div>
                <span>Create Template</span>
                {/* Magical shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </motion.button>
            </motion.div>

            {/* Search and Filters */}
            <motion.div 
              className="bg-gradient-to-br from-neutral-900/70 to-neutral-800/50 backdrop-blur-md p-6 rounded-xl border border-neutral-800/50 shadow-xl mb-8 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="flex flex-col lg:flex-row gap-4 relative z-10">
                {/* Search Bar */}
                <motion.div 
                  className="flex-1 relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <MagnifyingGlassIcon className="h-5 w-5 text-purple-400" />
                    </motion.div>
                  </div>
                  <input
                    type="text"
                    placeholder="Search templates by title, description, or tags..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gradient-to-r from-black/70 to-neutral-900/70 backdrop-blur-sm text-neutral-200 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </motion.div>

                {/* Category Filter */}
                <motion.div 
                  className="lg:w-64"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                >
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-black/70 to-neutral-900/70 backdrop-blur-sm text-neutral-200 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all"
                  >
                    {TEMPLATE_CATEGORIES.map((category: string) => (
                      <option key={category} value={category} className="bg-neutral-800">
                        {category}
                      </option>
                    ))}
                  </select>
                </motion.div>
              </div>

              {/* Category Tags */}
              <motion.div 
                className="flex flex-wrap gap-2 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
              >
                {TEMPLATE_CATEGORIES.map((category: string, index) => (
                  <motion.button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm transition-all duration-300 relative overflow-hidden ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-gradient-to-r from-neutral-800/80 to-neutral-700/80 text-neutral-300 hover:from-neutral-700/80 hover:to-neutral-600/80 backdrop-blur-sm'
                    }`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 1.4 + index * 0.1 }}
                  >
                    {category}
                    {category !== 'All' && (
                      <span className="ml-1 text-xs opacity-70">
                        ({templates.filter(t => t.category === category).length})
                      </span>
                    )}
                    {/* Magical shine effect for selected */}
                    {selectedCategory === category && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] rounded-full" />
                    )}
                  </motion.button>
                ))}
              </motion.div>
              
              {/* Magical backdrop effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl" />
            </motion.div>

            {/* Quick Access Sections */}
            {searchQuery === '' && selectedCategory === 'All' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Recent Templates */}
                {getRecentTemplates().length > 0 && (
                  <div className="bg-neutral-900/70 backdrop-blur-sm p-6 rounded-xl border border-neutral-800 shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-indigo-400" />
                      Recently Used
                    </h3>
                    <div className="space-y-3">
                      {getRecentTemplates().slice(0, 3).map(template => (
                        <div key={template.id} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-neutral-200 truncate">{template.name}</h4>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleFavorite(template.id)}
                                className="text-neutral-400 hover:text-yellow-400 transition-colors"
                              >
                                <StarIcon className={`h-4 w-4 ${favoriteTemplates.includes(template.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleUseTemplate(template)}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <ArrowRightIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-400 truncate">{template.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                              {template.category}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {template.tags.slice(0, 2).join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Favorite Templates */}
                {getFavoriteTemplates().length > 0 && (
                  <div className="bg-neutral-900/70 backdrop-blur-sm p-6 rounded-xl border border-neutral-800 shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <StarIcon className="h-5 w-5 mr-2 text-yellow-400" />
                      Favorites
                    </h3>
                    <div className="space-y-3">
                      {getFavoriteTemplates().slice(0, 3).map(template => (
                        <div key={template.id} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-neutral-200 truncate">{template.name}</h4>
                            <div className="flex items-center space-x-2">
                              <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <button
                                onClick={() => handleUseTemplate(template)}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <ArrowRightIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-400 truncate">{template.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                              {template.category}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {template.tags.slice(0, 2).join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div key={template.id} className="bg-neutral-900/70 backdrop-blur-sm p-6 rounded-xl border border-neutral-800 shadow-lg hover:border-neutral-700 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <DocumentTextIcon className="h-5 w-5 text-indigo-400" />
                      <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                        {template.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFavorite(template.id)}
                      className="text-neutral-400 hover:text-yellow-400 transition-colors"
                    >
                      <StarIcon className={`h-5 w-5 ${favoriteTemplates.includes(template.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-neutral-200 group-hover:text-white transition-colors flex-1 min-w-0">
                      <span className="truncate">{template.name}</span>
                    </h3>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                      template.visibility_scope === 'global' ? 'bg-blue-500/20 text-blue-300' :
                      template.visibility_scope === 'organization' ? 'bg-green-500/20 text-green-300' :
                      template.visibility_scope === 'team' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {template.visibility_scope === 'global' ? 'Global' :
                       template.visibility_scope === 'organization' ? 'Org' :
                       template.visibility_scope === 'team' ? 'Team' :
                       'Private'}
                    </span>
                  </div>
                  
                  <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-neutral-800 text-neutral-300 rounded">
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-neutral-800 text-neutral-400 rounded">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
                    <span>By {template.createdBy}</span>
                    <span>{template.tags.length} sections</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <CheckIcon className="w-4 h-4" />
                      <span>Use Template</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowTemplateDetails(true);
                      }}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    {canEditTemplate(template) && (
                      <button
                        onClick={() => handleOpenEditModal(template)}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                        title="Edit Template"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // Copy template structure to clipboard
                        navigator.clipboard.writeText(JSON.stringify(template.structure, null, 2));
                      }}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                      title="Copy Template Structure"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-16 w-16 mx-auto text-neutral-600 mb-4" />
                <h3 className="text-xl font-medium text-neutral-300 mb-2">No templates found</h3>
                <p className="text-neutral-500 mb-6">
                  {searchQuery 
                    ? `No templates match your search for "${searchQuery}"`
                    : `No templates available in the "${selectedCategory}" category`
                  }
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Template Details Modal */}
          {showTemplateDetails && selectedTemplate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-neutral-200">Template Details</h2>
                    <button
                      onClick={() => setShowTemplateDetails(false)}
                      className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Template Header */}
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-200 mb-2">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-neutral-400 mb-4">{selectedTemplate.description}</p>
                      
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-1 bg-neutral-800 text-neutral-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Template Structure Preview */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-neutral-200">Template Structure</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-neutral-300">Title Format</label>
                          <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 mt-1">
                            <p className="text-neutral-200 font-mono text-sm">{selectedTemplate.structure.titleFormat}</p>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-neutral-300">Description Structure</label>
                          <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 mt-1 max-h-48 overflow-y-auto">
                            <pre className="text-neutral-200 font-mono text-xs whitespace-pre-wrap">{selectedTemplate.structure.descriptionFormat}</pre>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-neutral-300">Acceptance Criteria Structure</label>
                          <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 mt-1 max-h-48 overflow-y-auto">
                            <pre className="text-neutral-200 font-mono text-xs whitespace-pre-wrap">{selectedTemplate.structure.acceptanceCriteriaFormat}</pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Template Metadata */}
                    <div className="border-t border-neutral-700 pt-4">
                      <h4 className="text-lg font-semibold text-neutral-200 mb-3">Template Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-neutral-400">Category:</span>
                          <span className="text-neutral-200 ml-2">{selectedTemplate.category}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400">Created by:</span>
                          <span className="text-neutral-200 ml-2">{selectedTemplate.createdBy}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400">Created:</span>
                          <span className="text-neutral-200 ml-2">{new Date(selectedTemplate.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400">Public:</span>
                          <span className="text-neutral-200 ml-2">{selectedTemplate.isPublic ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3 pt-4 border-t border-neutral-700">
                      <button
                        onClick={() => {
                          handleUseTemplate(selectedTemplate);
                          setShowTemplateDetails(false);
                        }}
                        className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                      >
                        Use This Template
                      </button>
                       {canEditTemplate(selectedTemplate) && (
                        <button
                          onClick={() => handleOpenEditModal(selectedTemplate)}
                          className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                          title="Edit Template"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedTemplate.structure, null, 2));
                        }}
                        className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                        title="Copy Template Structure"
                      >
                        <DocumentDuplicateIcon className="w-5 h-5" />
                      </button>
                      {canEditTemplate(selectedTemplate) && (
                        <button
                          onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                          className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Delete Template"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create/Edit Template Modal */}
          {showCreateEditModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-3xl w-full max-h-[95vh] shadow-2xl flex flex-col">
                <div className="p-6 border-b border-neutral-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-neutral-100">
                      {editingTemplateId ? 'Edit Template' : 'Create New Template'}
                    </h2>
                    <button
                      onClick={handleCloseModal}
                      className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveTemplate(); }} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-1">Template Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={templateFormData.name}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-neutral-300 mb-1">Category</label>
                      <select
                        name="category"
                        id="category"
                        value={templateFormData.category}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {availableCategories.map((cat: string) => (
                          <option key={cat} value={cat} className="bg-neutral-800 text-neutral-200">{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={templateFormData.description}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-neutral-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      name="tags"
                      id="tags"
                      value={tagsInput}
                      onChange={handleFormChange}
                      placeholder="e.g., feature, bug, frontend"
                      className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  {/* Structure Fields */}
                  <div className="space-y-4 pt-4 border-t border-neutral-700">
                     <h3 className="text-lg font-semibold text-neutral-200">Template Structure</h3>
                    <div>
                      <label htmlFor="titleFormat" className="block text-sm font-medium text-neutral-300 mb-1">Title Format</label>
                      <input
                        type="text"
                        name="titleFormat"
                        id="titleFormat"
                        value={templateFormData.structure.titleFormat}
                        onChange={handleFormChange}
                        placeholder="e.g., {User Story}: {Action} for {Benefit}"
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="descriptionFormat" className="block text-sm font-medium text-neutral-300 mb-1">Description Structure (Markdown supported)</label>
                      <textarea
                        name="descriptionFormat"
                        id="descriptionFormat"
                        rows={5}
                        value={templateFormData.structure.descriptionFormat}
                        onChange={handleFormChange}
                        placeholder="e.g., ## Goal\n{Description of goal}\n\n## User Persona\n{Target user}"
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="acceptanceCriteriaFormat" className="block text-sm font-medium text-neutral-300 mb-1">Acceptance Criteria Structure (Markdown supported)</label>
                      <textarea
                        name="acceptanceCriteriaFormat"
                        id="acceptanceCriteriaFormat"
                        rows={5}
                        value={templateFormData.structure.acceptanceCriteriaFormat}
                        onChange={handleFormChange}
                        placeholder="e.g., - GIVEN {context} WHEN {action} THEN {outcome}"
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                    </div>
                     <div>
                      <label htmlFor="additionalFieldsStr" className="block text-sm font-medium text-neutral-300 mb-1">Additional Fields (JSON format)</label>
                      <textarea
                        name="additionalFieldsStr"
                        id="additionalFieldsStr"
                        rows={3}
                        value={templateFormData.additionalFieldsStr || ''} // Ensure value is not undefined
                        onChange={handleFormChange}
                        placeholder='e.g., { "Story Points": "{Numeric Value}", "Priority": "{High/Medium/Low}" }'
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-700 space-y-4">
                    {/* Visibility Scope */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Visibility
                      </label>
                      <select
                        value={templateFormData.visibility_scope || 'organization'}
                        onChange={(e) => {
                          const newVisibility = e.target.value as any;
                          const updates: any = { visibility_scope: newVisibility };
                          
                          // Auto-select first team when switching to team visibility
                          if (newVisibility === 'team' && teamMemberships.length > 0 && !templateFormData.team_id) {
                            updates.team_id = teamMemberships[0].team_id;
                          }
                          // Clear team_id when switching away from team visibility
                          if (newVisibility !== 'team') {
                            updates.team_id = undefined;
                          }
                          
                          setTemplateFormData({ ...templateFormData, ...updates });
                        }}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="private">Private (Only you)</option>
                        <option value="organization">Organization (All org members)</option>
                        <option value="team">Team (Team members only)</option>
                        <option value="global">Global (Everyone)</option>
                      </select>
                      <p className="text-xs text-neutral-500 mt-1">
                        {templateFormData.visibility_scope === 'private' && 'Only you can see and use this template'}
                        {templateFormData.visibility_scope === 'organization' && 'All members of your organization can see and use this template'}
                        {templateFormData.visibility_scope === 'team' && 'Only members of the selected team can see and use this template'}
                        {templateFormData.visibility_scope === 'global' && 'Anyone can see and use this template (requires admin permissions)'}
                      </p>
                    </div>

                    {/* Team Selection - Only show for team visibility */}
                    {templateFormData.visibility_scope === 'team' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Team
                        </label>
                        <select
                          value={templateFormData.team_id || ''}
                          onChange={(e) => setTemplateFormData({ ...templateFormData, team_id: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                          <option value="">Select a team...</option>
                          {teamMemberships.map((membership) => (
                            <option key={membership.team_id} value={membership.team_id}>
                              {membership.team.name}
                            </option>
                          ))}
                        </select>
                        {teamMemberships.length === 0 && (
                          <p className="text-xs text-yellow-400 mt-1">
                            You are not a member of any teams. Team templates require team membership.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {editingTemplateId && (() => {
                    const templateToEdit = templates.find(t => t.id === editingTemplateId);
                    return templateToEdit && canEditTemplate(templateToEdit) && (
                      <div className="pt-4 border-t border-neutral-700">
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(editingTemplateId)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>Delete This Template</span>
                        </button>
                      </div>
                    );
                  })()}

                </form>
                <div className="p-6 border-t border-neutral-700 bg-neutral-900/50">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2.5 rounded-lg text-neutral-300 hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSaveTemplate} // Changed to direct call, form onSubmit handles prevention
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium"
                    >
                      {editingTemplateId ? 'Save Changes' : 'Create Template'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
