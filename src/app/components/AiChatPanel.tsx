"use client";
import React, { useRef, useEffect } from 'react';
import { ChatBubbleLeftEllipsisIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon, CpuChipIcon } from '@heroicons/react/24/solid';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  isLoading?: boolean;
  questions?: string[];
}

interface AiChatPanelProps {
  chatHistory: AiChatMessage[];
  userInput: string;
  onUserInput: (input: string) => void;
  onSendMessage: () => void;
  isAiProcessing: boolean;
  isGuidanceActive: boolean;
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({
  chatHistory,
  userInput,
  onUserInput,
  onSendMessage,
  isAiProcessing,
  isGuidanceActive
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50); 
    }
  }, [chatHistory]);

  useEffect(() => {
    if(isGuidanceActive && !isAiProcessing && chatHistory.some(m => m.questions && m.questions.length > 0)){
        inputRef.current?.focus();
    }
  }, [isGuidanceActive, isAiProcessing, chatHistory])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isAiProcessing && isGuidanceActive) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    // MODIFIED: Applied a fixed height to the main panel container
    // This allows the `flex-1` child (message list) to correctly use overflow-y
    <div className="bg-neutral-900/70 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-neutral-800 shadow-lg flex flex-col h-[600px]"> {/* Or e.g., h-[calc(100vh-250px)] or other responsive value */}
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center text-neutral-100">
        <ChatBubbleLeftEllipsisIcon className="h-6 w-6 mr-2 text-purple-400" />
        AI Wizard Assistant
      </h2>

      {/* SCROLLBAR CLASSES: scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800 */}
      {/* This div should now scroll internally due to parent's fixed height and its own flex-1 + overflow-y-auto */}
      <div 
        ref={chatContainerRef} 
        className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800"
      >
        {chatHistory.map((chat) => (
          <div key={chat.id} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl p-3 shadow-md ${
                chat.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : chat.role === 'assistant'
                  ? 'bg-blue-900/70 text-blue-100 rounded-tl-none' // Matched manual-mode
                  : 'bg-transparent text-neutral-400 text-xs italic w-full text-center py-1 px-0'
              }`}
            >
              <div className={`flex items-start space-x-2 ${chat.role === 'system' ? 'justify-center' : ''}`}>
                {chat.role !== 'system' && (
                   chat.role === 'user' ?
                   <UserCircleIcon className="h-5 w-5 text-blue-200 flex-shrink-0 mt-0.5" /> :
                   <CpuChipIcon className="h-5 w-5 text-purple-300 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-grow">
                  {chat.isLoading ? (
                    <div className="flex items-center space-x-1.5 py-1">
                      <div className="dot-flashing"></div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <MarkdownRenderer>{chat.text}</MarkdownRenderer>
                    </div>
                  )}
                  {chat.questions && chat.questions.length > 0 && !chat.isLoading && chat.role === 'assistant' && (
                    <div className="mt-2.5 border-t border-blue-700/50 pt-2"> {/* Adjusted border for new bubble color */}
                        <p className="text-xs text-blue-200/80 mb-1.5 font-medium">The Wizard asks:</p>
                        <ul className="space-y-1">
                            {chat.questions.map((q, qi) => (
                                <li key={qi} className="text-sm text-blue-100 bg-blue-800/40 p-2 rounded-md border border-blue-700/60">✨ {q}</li>
                            ))}
                        </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
         {!isGuidanceActive && chatHistory.length <=1 && (
            <div className="text-center text-neutral-500 py-10">
                <p>Start by filling in your Jira ticket details on the left and click &quot;Start AI Guidance&quot;.</p>
            </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSendMessage(); }}
        className="flex items-center space-x-2 pt-3 border-t border-neutral-700/50"
      >
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => onUserInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!isGuidanceActive || isAiProcessing}
          className="flex-1 p-3 rounded-lg bg-neutral-800/70 text-neutral-100 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-neutral-500 disabled:bg-neutral-800/30"
          placeholder={
            !isGuidanceActive ? "Activate AI guidance first..." :
            isAiProcessing ? "AI is processing..." : 
            "Your answer..."
          }
        />
        <button
          type="submit"
          disabled={!isGuidanceActive || isAiProcessing || !userInput.trim()}
          className="p-3 h-[46px] w-[46px] flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-purple-500 hover:to-pink-600 text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default AiChatPanel;