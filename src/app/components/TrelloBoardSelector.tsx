"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  RectangleStackIcon,
  EyeIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UsersIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { PlatformRegistry } from '@/lib/platformApi';

interface TrelloBoard {
  id: string;
  name: string;
  desc?: string;
  shortLink: string;
  url: string;
  prefs: {
    permissionLevel: 'private' | 'org' | 'public';
    background?: string;
    backgroundColor?: string;
  };
  closed: boolean;
  memberships?: Array<{
    id: string;
    memberType: 'admin' | 'normal' | 'observer';
  }>;
}

interface TrelloBoardSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedBoardIds: string[]) => void;
  initialSelectedBoards?: string[];
}

export default function TrelloBoardSelector({ 
  isOpen, 
  onClose, 
  onSave, 
  initialSelectedBoards = [] 
}: TrelloBoardSelectorProps) {
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>(initialSelectedBoards);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load boards when component opens
  useEffect(() => {
    if (isOpen) {
      loadBoards();
    }
  }, [isOpen]);

  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const trelloService = PlatformRegistry.get('trello');
      if (!trelloService) {
        throw new Error('Trello service not available');
      }
      
      const allBoards = await (trelloService as any).getAllUserBoards();
      setBoards(allBoards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const filteredBoards = boards.filter(board => 
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (board.desc && board.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleBoard = (boardId: string) => {
    setSelectedBoardIds(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const selectAll = () => {
    setSelectedBoardIds(filteredBoards.map(board => board.id));
  };

  const selectNone = () => {
    setSelectedBoardIds([]);
  };

  const handleSave = () => {
    onSave(selectedBoardIds);
    onClose();
  };

  const getPermissionIcon = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'private': return <LockClosedIcon className="h-4 w-4" />;
      case 'org': return <UsersIcon className="h-4 w-4" />;
      case 'public': return <GlobeAltIcon className="h-4 w-4" />;
      default: return <EyeIcon className="h-4 w-4" />;
    }
  };

  const getPermissionColor = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'private': return 'text-red-400';
      case 'org': return 'text-yellow-400';
      case 'public': return 'text-green-400';
      default: return 'text-neutral-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-700 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <RectangleStackIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Select Trello Boards</h2>
                <p className="text-sm text-neutral-400">Choose which boards TicketWizard can access</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[70vh]">
          {/* Controls */}
          <div className="p-6 border-b border-neutral-700 space-y-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={selectNone}
                  className="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                >
                  Select None
                </button>
              </div>
              <div className="text-sm text-neutral-400">
                {selectedBoardIds.length} of {filteredBoards.length} boards selected
              </div>
            </div>
          </div>

          {/* Board List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-neutral-400">Loading boards...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <p className="text-red-400 mb-2">Failed to load boards</p>
                  <p className="text-sm text-neutral-500">{error}</p>
                  <button
                    onClick={loadBoards}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredBoards.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <RectangleStackIcon className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400">No boards found</p>
                  <p className="text-sm text-neutral-500">Try adjusting your search</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredBoards.map((board) => {
                    const isSelected = selectedBoardIds.includes(board.id);
                    return (
                      <motion.div
                        key={board.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`
                          relative p-4 rounded-xl border transition-all duration-200 cursor-pointer group
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                            : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600 hover:bg-neutral-800'
                          }
                        `}
                        onClick={() => toggleBoard(board.id)}
                      >
                        {/* Selection indicator */}
                        <div className={`
                          absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-neutral-500 group-hover:border-neutral-400'
                          }
                        `}>
                          {isSelected && <CheckIconSolid className="h-4 w-4 text-white" />}
                        </div>

                        {/* Board info */}
                        <div className="pr-8">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-white truncate">{board.name}</h3>
                          </div>
                          
                          {board.desc && (
                            <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{board.desc}</p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className={`flex items-center space-x-1 text-xs ${getPermissionColor(board.prefs.permissionLevel)}`}>
                              {getPermissionIcon(board.prefs.permissionLevel)}
                              <span className="capitalize">{board.prefs.permissionLevel}</span>
                            </div>
                            
                            {board.memberships && board.memberships.length > 0 && (
                              <div className="text-xs text-neutral-500">
                                {board.memberships.length} member{board.memberships.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hover effect */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 left-2"
                          >
                            <SparklesIcon className="h-4 w-4 text-blue-400" />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-neutral-700 bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-400">
                <p>Selected boards will be accessible to TicketWizard.</p>
                <p>You can change this selection anytime in Settings.</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={selectedBoardIds.length === 0}
                  className={`
                    px-6 py-2 rounded-lg font-medium transition-all
                    ${selectedBoardIds.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                    }
                  `}
                >
                  Save Selection ({selectedBoardIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}