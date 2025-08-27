"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import { authenticatedFetch } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { 
  UserGroupIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  BookOpenIcon,
  TagIcon,
  InformationCircleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ProjectContextLocal {
  id: string;
  name: string;
  description: string;
  abbreviations: Record<string, string>;
  terminology: Record<string, string>;
  project_info: string;
  standards: string;
  visibility_scope: 'global' | 'organization' | 'team' | 'private';
  team_id?: string;
  organization_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const ProjectContextPage = () => {
  const { user, loading: authLoading, teamMemberships, organization, userRole } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectContextLocal[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<ProjectContextLocal>>({});
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch project contexts from Supabase
  useEffect(() => {
    const fetchProjectContexts = async () => {
      if (!user) return;
      
      try {
        const response = await authenticatedFetch('/api/project-contexts');
        if (!response.ok) {
          throw new Error('Failed to fetch project contexts');
        }
        
        const { projectContexts } = await response.json();
        
        // Map Supabase data to local interface format
        const mappedProjects: ProjectContextLocal[] = projectContexts.map((pc: any) => ({
          id: pc.id,
          name: pc.name,
          description: pc.description || '',
          abbreviations: pc.abbreviations || {},
          terminology: pc.terminology || {},
          project_info: pc.project_info || '',
          standards: pc.standards || '',
          visibility_scope: pc.visibility_scope || 'organization',
          team_id: pc.team_id,
          organization_id: pc.organization_id,
          created_by: pc.created_by,
          created_at: pc.created_at,
          updated_at: pc.updated_at
        }));
        
        setProjects(mappedProjects);
        if (mappedProjects.length > 0) {
          setSelectedProject(mappedProjects[0].id);
        }
      } catch (error) {
        console.error('Error fetching project contexts:', error);
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    };

    fetchProjectContexts();
  }, [user]);

  // Helper function to check if current user can edit a project context
  const canEditProjectContext = (projectContext: ProjectContextLocal): boolean => {
    if (!user || !organization) return false;

    // Creator can always edit their own project contexts
    if (projectContext.created_by === user.id) {
      return true;
    }

    // Check based on visibility scope
    switch (projectContext.visibility_scope) {
      case 'private':
        // Only creator can edit private project contexts
        return false;
      
      case 'team':
        // Team members can edit team project contexts
        if (!projectContext.team_id) return false;
        return teamMemberships?.some(membership => membership.team_id === projectContext.team_id) || false;
      
      case 'organization':
        // Organization members can edit org project contexts
        return organization.id === projectContext.organization_id;
      
      case 'global':
        // Only org admins can edit global project contexts (to prevent vandalism)
        return userRole === 'org_admin';
      
      default:
        return false;
    }
  };

  const handleCreateProject = () => {
    setEditingProject({
      name: '',
      description: '',
      abbreviations: {},
      terminology: {},
      project_info: '',
      standards: '',
      visibility_scope: 'organization',
      team_id: teamMemberships.length > 0 ? teamMemberships[0].team_id : undefined
    });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditProject = (project: ProjectContextLocal) => {
    setEditingProject(project);
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleSaveProject = async () => {
    if (!editingProject.name) return;
    
    try {
      if (isCreating) {
        // Create new project context
        const response = await authenticatedFetch('/api/project-contexts', {
          method: 'POST',
          body: JSON.stringify({
            name: editingProject.name,
            description: editingProject.description,
            abbreviations: editingProject.abbreviations,
            terminology: editingProject.terminology,
            project_info: editingProject.project_info,
            standards: editingProject.standards,
            visibility_scope: editingProject.visibility_scope,
            team_id: editingProject.visibility_scope === 'team' ? editingProject.team_id : null
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create project context');
        }
        
        const { projectContext } = await response.json();
        const newProject: ProjectContextLocal = {
          id: projectContext.id,
          name: projectContext.name,
          description: projectContext.description || '',
          abbreviations: projectContext.abbreviations || {},
          terminology: projectContext.terminology || {},
          project_info: projectContext.project_info || '',
          standards: projectContext.standards || '',
          visibility_scope: projectContext.visibility_scope || 'organization',
          team_id: projectContext.team_id,
          created_at: projectContext.created_at,
          updated_at: projectContext.updated_at
        };
        
        setProjects([...projects, newProject]);
        setSelectedProject(newProject.id);
      } else {
        // Update existing project context
        const response = await authenticatedFetch(`/api/project-contexts/${editingProject.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: editingProject.name,
            description: editingProject.description,
            abbreviations: editingProject.abbreviations,
            terminology: editingProject.terminology,
            project_info: editingProject.project_info,
            standards: editingProject.standards,
            visibility_scope: editingProject.visibility_scope,
            team_id: editingProject.visibility_scope === 'team' ? editingProject.team_id : null
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update project context');
        }
        
        const { projectContext } = await response.json();
        const updatedProject: ProjectContextLocal = {
          id: projectContext.id,
          name: projectContext.name,
          description: projectContext.description || '',
          abbreviations: projectContext.abbreviations || {},
          terminology: projectContext.terminology || {},
          project_info: projectContext.project_info || '',
          standards: projectContext.standards || '',
          visibility_scope: projectContext.visibility_scope || 'organization',
          team_id: projectContext.team_id,
          created_at: projectContext.created_at,
          updated_at: projectContext.updated_at
        };
        
        setProjects(projects.map(project => 
          project.id === editingProject.id ? updatedProject : project
        ));
      }
      
      setIsEditing(false);
      setIsCreating(false);
      setEditingProject({});
    } catch (error) {
      console.error('Error saving project context:', error);
      alert('Failed to save project context. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditingProject({});
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project context?')) {
      return;
    }
    
    try {
      const response = await authenticatedFetch(`/api/project-contexts/${projectId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project context');
      }
      
      setProjects(projects.filter(project => project.id !== projectId));
      if (selectedProject === projectId) {
        setSelectedProject(projects.length > 1 ? projects.find(p => p.id !== projectId)?.id || null : null);
      }
    } catch (error) {
      console.error('Error deleting project context:', error);
      alert('Failed to delete project context. Please try again.');
    }
  };

  const addAbbreviation = () => {
    setEditingProject({
      ...editingProject,
      abbreviations: { ...editingProject.abbreviations, '': '' }
    });
  };

  const updateAbbreviation = (oldKey: string, newKey: string, value: string) => {
    const newAbbreviations = { ...editingProject.abbreviations };
    if (oldKey !== newKey) {
      delete newAbbreviations[oldKey];
    }
    newAbbreviations[newKey] = value;
    setEditingProject({
      ...editingProject,
      abbreviations: newAbbreviations
    });
  };

  const removeAbbreviation = (key: string) => {
    const newAbbreviations = { ...editingProject.abbreviations };
    delete newAbbreviations[key];
    setEditingProject({
      ...editingProject,
      abbreviations: newAbbreviations
    });
  };

  const addTerminology = () => {
    setEditingProject({
      ...editingProject,
      terminology: { ...editingProject.terminology, '': '' }
    });
  };

  const updateTerminology = (oldKey: string, newKey: string, value: string) => {
    const newTerminology = { ...editingProject.terminology };
    if (oldKey !== newKey) {
      delete newTerminology[oldKey];
    }
    newTerminology[newKey] = value;
    setEditingProject({
      ...editingProject,
      terminology: newTerminology
    });
  };

  const removeTerminology = (key: string) => {
    const newTerminology = { ...editingProject.terminology };
    delete newTerminology[key];
    setEditingProject({
      ...editingProject,
      terminology: newTerminology
    });
  };

  const selectedProjectData = projects.find(project => project.id === selectedProject);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      <CollapsibleSidebar />
      
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
      
      <main className="flex-1 p-6 relative z-10">
        <div className="w-full max-w-none">
          {/* Top gradient bar for visual effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          {/* Header */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <motion.h1 
                  className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <motion.div
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: 5,
                      transition: { duration: 0.2 } 
                    }}
                  >
                    <UserGroupIcon className="h-8 w-8 mr-3" style={{ color: '#a855f7' }} />
                  </motion.div>
                  Project Context
                </motion.h1>
                <motion.p 
                  className="text-neutral-400 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  Manage project-specific context to help AI understand your project terminology and standards.
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Info Banner */}
          <motion.div 
            className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 backdrop-blur-md border border-indigo-800/50 text-indigo-300 px-4 py-2.5 rounded-xl mb-5 text-sm relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-start relative z-10">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <InformationCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              </motion.div>
              <div>
                <p className="font-medium mb-1">How Project Context Works</p>
                <p className="text-indigo-400/80 text-xs">
                  Project context helps the AI understand your specific abbreviations, terminology, and project standards. 
                  This context is automatically included with refinement requests to provide more accurate and relevant suggestions.
                </p>
              </div>
            </div>
            {/* Subtle animated border */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>

          {/* Team Selection */}
          <motion.div 
            className="bg-gradient-to-br from-neutral-900/60 to-neutral-800/40 backdrop-blur-md rounded-xl border border-neutral-800/50 p-5 mb-5 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <motion.h2 
                className="text-lg font-semibold flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserGroupIcon className="h-5 w-5 mr-2 text-purple-400" />
                </motion.div>
                Your Projects ({projects.length})
              </motion.h2>
              <motion.button
                onClick={handleCreateProject}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center transition-all duration-300 text-sm shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                </motion.div>
                Add Project
                {/* Magical shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </motion.button>
            </div>
            
            {projects.length === 0 ? (
              <motion.div 
                className="text-center py-6 relative z-10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <UserGroupIcon className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                </motion.div>
                <p className="text-neutral-400 mb-3 text-sm">No projects yet</p>
                <motion.button
                  onClick={handleCreateProject}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Create Your First Project
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </motion.button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 relative z-10">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      selectedProject === project.id
                        ? 'bg-gradient-to-br from-purple-600/20 to-indigo-600/10 border-purple-500/50 ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/20'
                        : 'bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 border-neutral-700/50 hover:bg-gradient-to-br hover:from-neutral-800/60 hover:to-neutral-900/60 backdrop-blur-sm'
                    }`}
                    onClick={() => setSelectedProject(project.id)}
                    whileHover={{ 
                      scale: 1.02, 
                      y: -4,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate text-sm">{project.name}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                          project.visibility_scope === 'global' ? 'bg-blue-500/20 text-blue-300' :
                          project.visibility_scope === 'organization' ? 'bg-green-500/20 text-green-300' :
                          project.visibility_scope === 'team' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {project.visibility_scope === 'global' ? 'Global' :
                           project.visibility_scope === 'organization' ? 'Org' :
                           project.visibility_scope === 'team' ? 'Team' :
                           'Private'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {canEditProjectContext(project) && (
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProject(project);
                            }}
                            className="p-1 rounded-lg hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all duration-200"
                            title="Edit project"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </motion.button>
                        )}
                        {canEditProjectContext(project) && (
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
                            title="Delete project"
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2 relative z-10">{project.description}</p>
                    {selectedProject === project.id && (
                      <motion.div 
                        className="mt-2 text-xs text-purple-400 font-medium flex items-center relative z-10"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ●
                        </motion.span>
                        <span className="ml-1">Selected</span>
                      </motion.div>
                    )}

                    {/* Magical corner accents */}
                    <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 bg-gradient-to-tr from-indigo-500/20 to-transparent rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* Magical backdrop effect for team selection */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>

          {/* Team Details/Editor - Full Width */}
          <div className="w-full">
            {isEditing ? (
              /* Edit Mode - Full Width */
              <motion.div 
                className="bg-gradient-to-br from-neutral-900/60 to-neutral-800/40 backdrop-blur-md rounded-xl border border-neutral-800/50 p-6 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <motion.h2 
                    className="text-xl font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {isCreating ? '✨ Create New Project' : '📝 Edit Project'}
                  </motion.h2>
                  <div className="flex items-center space-x-3">
                    <motion.button
                      onClick={handleSaveProject}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-4 py-2 rounded-lg flex items-center text-sm shadow-lg hover:shadow-green-500/25 relative overflow-hidden group"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                      </motion.div>
                      Save
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </motion.button>
                    <motion.button
                      onClick={handleCancelEdit}
                      className="bg-gradient-to-r from-neutral-700 to-neutral-600 hover:from-neutral-600 hover:to-neutral-500 text-white px-4 py-2 rounded-lg flex items-center text-sm shadow-lg hover:shadow-neutral-500/25 relative overflow-hidden group"
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
                        <XMarkIcon className="h-4 w-4 mr-2" />
                      </motion.div>
                      Cancel
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white border-b border-neutral-700 pb-2 mb-4">Basic Information</h3>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={editingProject.name || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="e.g., Mobile App Component"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editingProject.description || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Brief description of the project's focus"
                      />
                    </div>

                    {/* Visibility Scope */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Visibility
                      </label>
                      <select
                        value={editingProject.visibility_scope || 'organization'}
                        onChange={(e) => {
                          const newVisibility = e.target.value as any;
                          const updates: any = { visibility_scope: newVisibility };
                          
                          // Auto-select first team when switching to team visibility
                          if (newVisibility === 'team' && teamMemberships.length > 0 && !editingProject.team_id) {
                            updates.team_id = teamMemberships[0].team_id;
                          }
                          // Clear team_id when switching away from team visibility
                          if (newVisibility !== 'team') {
                            updates.team_id = undefined;
                          }
                          
                          setEditingProject({ ...editingProject, ...updates });
                        }}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="private">Private (Only you)</option>
                        <option value="organization">Organization (All org members)</option>
                        <option value="team">Team (Team members only)</option>
                        <option value="global">Global (Everyone)</option>
                      </select>
                      <p className="text-xs text-neutral-500 mt-1">
                        {editingProject.visibility_scope === 'private' && 'Only you can see and use this context'}
                        {editingProject.visibility_scope === 'organization' && 'All members of your organization can see and use this context'}
                        {editingProject.visibility_scope === 'team' && 'Only members of the selected team can see and use this context'}
                        {editingProject.visibility_scope === 'global' && 'Anyone can see and use this context (requires admin permissions)'}
                      </p>
                    </div>

                    {/* Team Selection - Only show for team visibility */}
                    {editingProject.visibility_scope === 'team' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Team
                        </label>
                        <select
                          value={editingProject.team_id || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, team_id: e.target.value })}
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
                            You are not a member of any teams. Team contexts require team membership.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Project Info */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Project Information
                      </label>
                      <textarea
                        value={editingProject.project_info || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, project_info: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Describe the project, goals, and context that would help AI understand the work better..."
                      />
                    </div>

                    {/* Standards */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Project Standards & Guidelines
                      </label>
                      <textarea
                        value={editingProject.standards || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, standards: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Coding standards, processes, quality requirements, or other guidelines..."
                      />
                    </div>
                  </div>

                  {/* Center Column - Abbreviations */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white border-b border-neutral-700 pb-2">Abbreviations & Acronyms</h3>
                      <button
                        onClick={addAbbreviation}
                        className="text-purple-400 hover:text-purple-300 text-sm flex items-center"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add
                      </button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto bg-neutral-800/30 rounded-lg p-4">
                      {Object.entries(editingProject.abbreviations || {}).map(([key, value], index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => updateAbbreviation(key, e.target.value, value)}
                            className="w-20 px-2 py-2 bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder="Abbrev"
                          />
                          <span className="text-neutral-400">→</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateAbbreviation(key, key, e.target.value)}
                            className="flex-1 px-2 py-2 bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder="Full meaning"
                          />
                          <button
                            onClick={() => removeAbbreviation(key)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {Object.keys(editingProject.abbreviations || {}).length === 0 && (
                        <p className="text-neutral-500 text-sm text-center py-4">No abbreviations added yet</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Terminology */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white border-b border-neutral-700 pb-2">Project Terminology</h3>
                      <button
                        onClick={addTerminology}
                        className="text-purple-400 hover:text-purple-300 text-sm flex items-center"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add
                      </button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto bg-neutral-800/30 rounded-lg p-4">
                      {Object.entries(editingProject.terminology || {}).map(([key, value], index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <input
                              type="text"
                              value={key}
                              onChange={(e) => updateTerminology(key, e.target.value, value)}
                              className="flex-1 px-2 py-2 bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                              placeholder="Term"
                            />
                            <button
                              onClick={() => removeTerminology(key)}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <textarea
                            value={value}
                            onChange={(e) => updateTerminology(key, key, e.target.value)}
                            rows={2}
                            className="w-full px-2 py-2 bg-neutral-700 border border-neutral-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder="Definition or explanation"
                          />
                        </div>
                      ))}
                      {Object.keys(editingProject.terminology || {}).length === 0 && (
                        <p className="text-neutral-500 text-sm text-center py-4">No terminology added yet</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Magical backdrop effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl -z-10" />
              </motion.div>
            ) : selectedProjectData ? (
              /* View Mode - Full Width */
              <motion.div 
                className="bg-gradient-to-br from-neutral-900/60 to-neutral-800/40 backdrop-blur-md rounded-xl border border-neutral-800/50 p-6 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <motion.h2 
                      className="text-2xl font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      {selectedProjectData.name}
                    </motion.h2>
                    <motion.p 
                      className="text-neutral-300"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      {selectedProjectData.description}
                    </motion.p>
                  </div>
                  {canEditProjectContext(selectedProjectData) && (
                    <motion.button
                      onClick={() => handleEditProject(selectedProjectData)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg flex items-center text-sm shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                      </motion.div>
                      Edit Project
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </motion.button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                  {/* Project Info */}
                  {selectedProjectData.project_info && (
                    <motion.div 
                      className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/30 backdrop-blur-sm rounded-xl p-4 border border-neutral-700/30 hover:border-indigo-500/30 transition-all duration-300 group relative overflow-hidden"
                      whileHover={{ scale: 1.02, y: -2 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                    >
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <InformationCircleIcon className="h-5 w-5 mr-2 text-indigo-400" />
                        </motion.div>
                        Project Information
                      </h3>
                      <p className="text-neutral-300 leading-relaxed text-sm">{selectedProjectData.project_info}</p>
                      {/* Magical corner accent */}
                      <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.div>
                  )}

                  {/* Standards */}
                  {selectedProjectData.standards && (
                    <motion.div 
                      className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/30 backdrop-blur-sm rounded-xl p-4 border border-neutral-700/30 hover:border-orange-500/30 transition-all duration-300 group relative overflow-hidden"
                      whileHover={{ scale: 1.02, y: -2 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.0 }}
                    >
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <BookOpenIcon className="h-5 w-5 mr-2 text-orange-400" />
                        </motion.div>
                        Standards & Guidelines
                      </h3>
                      <p className="text-neutral-300 leading-relaxed text-sm">{selectedProjectData.standards}</p>
                      {/* Magical corner accent */}
                      <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.div>
                  )}

                  {/* Abbreviations */}
                  <motion.div 
                    className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/30 backdrop-blur-sm rounded-xl p-4 border border-neutral-700/30 hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden"
                    whileHover={{ scale: 1.02, y: -2 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                  >
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TagIcon className="h-5 w-5 mr-2 text-blue-400" />
                      </motion.div>
                      Abbreviations ({Object.keys(selectedProjectData.abbreviations).length})
                    </h3>
                    {Object.keys(selectedProjectData.abbreviations).length === 0 ? (
                      <p className="text-neutral-500 text-sm">No abbreviations defined</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(selectedProjectData.abbreviations).map(([key, value]) => (
                          <div key={key} className="flex items-center bg-neutral-700/30 rounded p-2">
                            <span className="font-medium text-blue-300 min-w-0 flex-shrink-0 text-sm">{key}</span>
                            <span className="text-neutral-400 mx-2">→</span>
                            <span className="text-neutral-200 min-w-0 text-sm">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                      {/* Magical corner accent */}
                      <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>

                  {/* Terminology */}
                  <motion.div 
                    className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/30 backdrop-blur-sm rounded-xl p-4 border border-neutral-700/30 hover:border-green-500/30 transition-all duration-300 group relative overflow-hidden"
                    whileHover={{ scale: 1.02, y: -2 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                  >
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <BookOpenIcon className="h-5 w-5 mr-2 text-green-400" />
                      </motion.div>
                      Terminology ({Object.keys(selectedProjectData.terminology).length})
                    </h3>
                    {Object.keys(selectedProjectData.terminology).length === 0 ? (
                      <p className="text-neutral-500 text-sm">No terminology defined</p>
                    ) : (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {Object.entries(selectedProjectData.terminology).map(([key, value]) => (
                          <div key={key} className="bg-neutral-700/30 rounded p-3">
                            <span className="font-medium text-green-300 text-sm block mb-1">{key}</span>
                            <p className="text-neutral-300 leading-relaxed text-xs">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                      {/* Magical corner accent */}
                      <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-green-500/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>
                </div>

                {/* Metadata */}
                <motion.div 
                  className="mt-6 pt-4 border-t border-neutral-700/50 text-sm text-neutral-500 relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.6 }}
                >
                  <p>Created: {new Date(selectedProjectData.created_at).toLocaleDateString()} • Last updated: {new Date(selectedProjectData.updated_at).toLocaleDateString()}</p>
                </motion.div>
                
                {/* Magical backdrop effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl -z-10" />
              </motion.div>
            ) : (
              /* No Team Selected */
              <motion.div 
                className="bg-gradient-to-br from-neutral-900/60 to-neutral-800/40 backdrop-blur-md rounded-xl border border-neutral-800/50 p-8 flex items-center justify-center relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <div className="text-center relative z-10">
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    <UserGroupIcon className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
                  </motion.div>
                  <motion.h3 
                    className="text-xl font-medium text-neutral-300 mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    Select a project to get started
                  </motion.h3>
                  <motion.p 
                    className="text-neutral-500"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    Choose a project from above to view and edit its context information
                  </motion.p>
                </div>
                
                {/* Magical backdrop effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 rounded-xl -z-10" />
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectContextPage;
