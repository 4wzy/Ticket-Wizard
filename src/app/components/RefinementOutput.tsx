import { useState, useEffect } from 'react';
import { 
  DocumentMagnifyingGlassIcon, 
  ArrowUpOnSquareIcon, 
  PlusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import type { TicketData } from './TicketForm';

// Define the allowed refinement fields to avoid TypeScript errors
type RefinementField = 'title' | 'description' | 'acceptanceCriteria';
const REFINEMENT_FIELDS: RefinementField[] = ['description', 'acceptanceCriteria'];

interface RefinementOutputProps {
  isNewTicket?: boolean;
  originalData?: TicketData | null;
}

const RefinementOutput = ({ isNewTicket = false, originalData = null }: RefinementOutputProps) => {
  const [hasRefinements, setHasRefinements] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [refinements, setRefinements] = useState<TicketData>({
    title: '',
    description: '',
    acceptanceCriteria: ''
  });
  const [acceptedFields, setAcceptedFields] = useState<Record<string, boolean>>({});
  
  // When originalData changes, generate refinements
  useEffect(() => {
    if (originalData) {
      // Reset refinement states
      setHasRefinements(false);
      setAcceptedFields({});
      
      // Set refinements directly from the API response
      // Our refinement has already been processed by the API
      setRefinements(originalData);
      setHasRefinements(true);
      
      // Mark fields that have changes as needing review
      const fieldsToReview: Record<string, boolean> = {};
      
      // For a real implementation, we would compare fields for actual differences
      // For now, we'll just mark description and acceptance criteria for review by default
      if (originalData.description) {
        fieldsToReview['description'] = true;
      }
      
      if (originalData.acceptanceCriteria) {
        fieldsToReview['acceptanceCriteria'] = true;
      }
      
      // Pre-accept some fields by default
      setAcceptedFields(fieldsToReview);
    }
  }, [originalData]);

  // Handle pushing to Jira
  const handlePush = () => {
    setPushing(true);
    
    // Create the final ticket data with accepted refinements
    const finalTicketData: TicketData = { 
      title: originalData?.title || '', 
      description: originalData?.description || '',
      acceptanceCriteria: originalData?.acceptanceCriteria || ''
    };
    
    // For each field, use the refined version if it was accepted
    (Object.keys(acceptedFields) as RefinementField[]).forEach(field => {
      if (acceptedFields[field] === true) {
        switch(field) {
          case 'title':
            finalTicketData.title = refinements.title;
            break;
          case 'description':
            finalTicketData.description = refinements.description;
            break;
          case 'acceptanceCriteria':
            finalTicketData.acceptanceCriteria = refinements.acceptanceCriteria;
            break;
        }
      }
    });
    
    // Here you would integrate with the Jira API to push the ticket
    console.log('Pushing to Jira:', finalTicketData);
    
    // Create a custom event to notify the dashboard of successful push
    const event = new CustomEvent('jiraTicketPushed', {
      detail: { 
        success: true,
        isNew: isNewTicket,
        ticketData: finalTicketData
      }
    });
    
    setTimeout(() => {
      setPushing(false);
      // Dispatch the event first
      window.dispatchEvent(event);
      // Reset the state after successful push, but don't show the loading state
      setAcceptedFields({});
      // We need to nullify originalData before resetting hasRefinements
      // We'll do this by dispatching a custom event to clear originalData in the parent
      window.dispatchEvent(new CustomEvent('jiraTicketReset'));
    }, 1500);
  };
  
  return (
    <div className="relative rounded-lg p-4">
      {/* Animated gradient background - enhanced visibility */}
      <div 
        className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-pink-900/30 rounded-lg opacity-75"
        style={{
          backgroundSize: '200% 200%',
          animation: 'rotate-gradient 15s ease infinite'
        }}
      ></div>
      {/* Additional subtle patterns */}
      <div 
        className="absolute inset-0 -z-10 opacity-5"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")',
        }}
      ></div>
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <DocumentMagnifyingGlassIcon className="h-5 w-5 mr-2 text-indigo-400" />
          AI Refinement Suggestions
        </h2>
        
        {hasRefinements && (
          <button
            onClick={() => {
              // Play subtle click sound
              const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
              oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.1);
              
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.2);
              
              // Toggle state
              setShowComparison(!showComparison);
            }}
            className="text-sm px-4 py-1.5 rounded-full flex items-center text-purple-200 hover:text-white bg-gradient-to-r from-violet-800/50 to-fuchsia-800/50 hover:from-violet-700/80 hover:to-fuchsia-700/80 transition-all border border-purple-600/50 hover:border-purple-500/80 hover:shadow-md hover:shadow-purple-700/30 transform hover:scale-105 active:scale-95 group"
          >
            <ArrowsRightLeftIcon className={`h-4 w-4 mr-1.5 transition-transform duration-300 ${showComparison ? 'rotate-180' : ''} group-hover:${showComparison ? 'rotate-0' : 'rotate-180'}`} />
            <span className="relative">
              {showComparison ? 'Hide Comparison' : 'Show Comparison'}
              <span className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 bg-gradient-to-r from-fuchsia-500/70 to-purple-400/70 transition-all duration-300"></span>
            </span>
          </button>
        )}
      </div>
        
        <div className="space-y-4">
        {!hasRefinements && !originalData && (
          <div className="bg-neutral-900/70 border border-neutral-700 p-8 rounded-lg">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-4 opacity-75">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M12 18v-6"></path>
                  <path d="M8 15h8"></path>
                </svg>
              </div>
              <p className="text-neutral-300 text-center mb-1">Your refined ticket will appear here after processing.</p>
              <p className="text-neutral-400 text-sm text-center">Fill in the form and click &quot;Refine with AI&quot;</p>
            </div>
          </div>
        )}
        
        {!hasRefinements && originalData && !pushing && (
          <div className="bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-fuchsia-900/30 border border-violet-700/30 p-8 rounded-lg animate-pulse-glow transition-all backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                {/* Main spinning circle with enhanced design */}
                <div className="w-20 h-20 border-t-4 border-l-4 border-r-4 border-b-transparent border-violet-500 rounded-full animate-spin"></div>
                <div className="absolute inset-1 w-18 h-18 border-b-4 border-r-4 border-l-transparent border-t-transparent border-fuchsia-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
                
                {/* Inner pulsing circle with rainbow effect */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 rounded-full opacity-90 blur-sm animate-rainbow-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 rounded-full opacity-80"></div>
                
                {/* Enhanced floating particles */}
                <div className="absolute -top-5 -right-5 w-3 h-3 bg-blue-400 rounded-full animate-float" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                <div className="absolute -bottom-5 -left-3 w-2.5 h-2.5 bg-purple-400 rounded-full animate-float" style={{ animationDelay: '1.2s', animationDuration: '3.2s' }}></div>
                <div className="absolute -top-3 -left-4 w-2 h-2 bg-fuchsia-400 rounded-full animate-float" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }}></div>
                <div className="absolute bottom-0 right-2 w-2 h-2 bg-indigo-400 rounded-full animate-float" style={{ animationDelay: '0.2s', animationDuration: '3s' }}></div>
                <div className="absolute -bottom-3 right-5 w-1.5 h-1.5 bg-violet-300 rounded-full animate-float" style={{ animationDelay: '1s', animationDuration: '3.5s' }}></div>
                
                {/* Magic sparkles */}
                <div className="absolute top-0 left-1/2 w-px h-px">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full animate-float"
                      style={{
                        top: `${Math.random() * 40 - 20}px`,
                        left: `${Math.random() * 40 - 20}px`,
                        opacity: 0.7,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                        transform: `scale(${Math.random() * 0.8 + 0.2})`
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 font-semibold text-lg mb-2 filter drop-shadow-sm animate-pulse" style={{ animationDuration: '2s' }}>
                  Analyzing and refining your ticket...
                </p>
                <p className="text-indigo-200/80 text-sm flex flex-col items-center justify-center">
                  <span className="mb-2">Applying AI magic</span>
                  <span className="flex items-center space-x-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="inline-block w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                    <span className="inline-block w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></span>
                    <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.9s' }}></span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
        
        {hasRefinements && (
          <div className="space-y-4">
            {/* Each field with comparison */}
            {REFINEMENT_FIELDS.map((field) => (
              <div key={field} className="rounded-lg border border-neutral-700 overflow-hidden">
                <div className="bg-neutral-800 px-3 py-2 flex justify-between items-center">
                  <h3 className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</h3>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => {
                        // Accept this refinement
                        setAcceptedFields(prev => ({
                          ...prev,
                          [field]: true
                        }));
                        
                        // Show enhanced visual feedback
                        const btn = document.getElementById(`accept-btn-${field}`);
                        if (btn) {
                          // Play success sound effect using Web Audio API
                          const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
                          const oscillator = audioContext.createOscillator();
                          const gainNode = audioContext.createGain();
                          
                          oscillator.type = 'sine';
                          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                          oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.2);
                          
                          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                          
                          oscillator.connect(gainNode);
                          gainNode.connect(audioContext.destination);
                          
                          oscillator.start();
                          oscillator.stop(audioContext.currentTime + 0.3);
                          
                          // Add confetti effect
                          for (let i = 0; i < 15; i++) {
                            const confetti = document.createElement('div');
                            confetti.className = 'animate-confetti';
                            confetti.style.left = `${Math.random() * 100}%`;
                            confetti.style.width = `${Math.random() * 8 + 6}px`;
                            confetti.style.height = `${Math.random() * 4 + 4}px`;
                            confetti.style.background = `hsl(${Math.random() * 120 + 120}, 100%, 60%)`;
                            confetti.style.borderRadius = '2px';
                            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
                            btn.appendChild(confetti);
                            
                            setTimeout(() => {
                              confetti.remove();
                            }, 4000);
                          }
                          
                          // Add rainbow glow effect
                          btn.classList.add('animate-rainbow-pulse');
                          setTimeout(() => {
                            btn.classList.remove('animate-rainbow-pulse');
                          }, 1500);
                          
                          // Create and animate a ripple effect
                          const ripple = document.createElement('span');
                          ripple.style.position = 'absolute';
                          ripple.style.top = '50%';
                          ripple.style.left = '50%';
                          ripple.style.transform = 'translate(-50%, -50%)';
                          ripple.style.width = '0';
                          ripple.style.height = '0';
                          ripple.style.backgroundColor = 'rgba(74, 222, 128, 0.7)';
                          ripple.style.borderRadius = '50%';
                          ripple.style.zIndex = '-1';
                          
                          btn.style.position = 'relative';
                          btn.style.overflow = 'hidden';
                          btn.appendChild(ripple);
                          
                          // Animate the ripple
                          ripple.animate([
                            { width: '0', height: '0', opacity: 0.8 },
                            { width: '150px', height: '150px', opacity: 0 }
                          ], {
                            duration: 800,
                            easing: 'ease-out'
                          }).onfinish = () => {
                            ripple.remove();
                          };
                        }
                      }}
                      id={`accept-btn-${field}`}
                      className={`p-2 rounded-full transition-all cursor-accept transform hover:scale-125 ${
                        acceptedFields[field] 
                          ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-md shadow-green-900/50 scale-110' 
                          : 'hover:bg-green-700 text-green-400 hover:text-white hover:shadow-md hover:shadow-green-700/30'
                      }`}
                      title="Accept this refinement"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        // Reject this refinement
                        setAcceptedFields(prev => ({
                          ...prev,
                          [field]: false
                        }));
                        
                        // Show enhanced visual feedback
                        const btn = document.getElementById(`reject-btn-${field}`);
                        if (btn) {
                          // Play reject sound effect using Web Audio API
                          const audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
                          const oscillator = audioContext.createOscillator();
                          const gainNode = audioContext.createGain();
                          
                          oscillator.type = 'sawtooth';
                          oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                          oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.2);
                          
                          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                          
                          oscillator.connect(gainNode);
                          gainNode.connect(audioContext.destination);
                          
                          oscillator.start();
                          oscillator.stop(audioContext.currentTime + 0.3);

                          // Add zap effect
                          const zapEffect = document.createElement('div');
                          zapEffect.style.position = 'absolute';
                          zapEffect.style.top = '50%';
                          zapEffect.style.left = '50%';
                          zapEffect.style.width = '150%';
                          zapEffect.style.height = '150%';
                          zapEffect.style.background = 'radial-gradient(circle, rgba(255,0,0,0.5) 0%, rgba(255,0,0,0) 70%)';
                          zapEffect.style.transform = 'translate(-50%, -50%)';
                          zapEffect.style.borderRadius = '50%';
                          zapEffect.style.zIndex = '-1';
                          
                          btn.style.position = 'relative';
                          btn.style.overflow = 'visible';
                          btn.appendChild(zapEffect);
                          
                          zapEffect.animate([
                            { opacity: 0.8, transform: 'translate(-50%, -50%) scale(0.5)' },
                            { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5)' }
                          ], {
                            duration: 500,
                            easing: 'ease-out'
                          }).onfinish = () => {
                            zapEffect.remove();
                          };
                          
                          // Create and animate a ripple effect
                          const ripple = document.createElement('span');
                          ripple.style.position = 'absolute';
                          ripple.style.top = '50%';
                          ripple.style.left = '50%';
                          ripple.style.transform = 'translate(-50%, -50%)';
                          ripple.style.width = '0';
                          ripple.style.height = '0';
                          ripple.style.backgroundColor = 'rgba(239, 68, 68, 0.7)';
                          ripple.style.borderRadius = '50%';
                          ripple.style.zIndex = '-1';
                          
                          btn.appendChild(ripple);
                          
                          // Add shake animation
                          btn.animate([
                            { transform: 'translateX(-3px) rotate(-3deg)' },
                            { transform: 'translateX(3px) rotate(3deg)' },
                            { transform: 'translateX(-3px) rotate(-3deg)' },
                            { transform: 'translateX(0) rotate(0)' }
                          ], {
                            duration: 300,
                            easing: 'ease-in-out'
                          });
                          
                          // Animate the ripple
                          ripple.animate([
                            { width: '0', height: '0', opacity: 0.8 },
                            { width: '150px', height: '150px', opacity: 0 }
                          ], {
                            duration: 800,
                            easing: 'ease-out'
                          }).onfinish = () => {
                            ripple.remove();
                          };
                        }
                      }}
                      id={`reject-btn-${field}`}
                      className={`p-2 rounded-full transition-all cursor-reject transform hover:scale-125 ${
                        acceptedFields[field] === false 
                          ? 'bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-md shadow-red-900/50 scale-110' 
                          : 'hover:bg-red-700 text-red-400 hover:text-white hover:shadow-md hover:shadow-red-700/30'
                      }`}
                      title="Reject this refinement"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-3">
                  {showComparison && originalData && (
                    <>
                      <div className="mb-2">
                        <div className="text-xs text-neutral-400 mb-1">Original:</div>
                        <div className="bg-neutral-900/70 p-3 rounded text-sm text-neutral-300 whitespace-pre-wrap border border-neutral-800/30">
                          {originalData[field as keyof typeof originalData] || 'No content'}
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="text-xs text-neutral-400 mb-1">AI Improved:</div>
                        <div 
                          className={`p-3 rounded text-sm whitespace-pre-wrap animate-scale-in ${
                            acceptedFields[field] === true 
                              ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/10 border border-green-800/30 shadow-sm shadow-green-900/20' 
                              : acceptedFields[field] === false 
                                ? 'bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-800/30 text-neutral-400 shadow-sm shadow-red-900/20'
                                : 'bg-gradient-to-br from-purple-900/30 to-indigo-900/10 border border-purple-800/30 shadow-sm shadow-purple-900/20'
                          }`}
                        >
                          {refinements[field as keyof typeof refinements]}
                        </div>
                        {acceptedFields[field] === true && (
                          <div className="text-xs bg-green-900/20 text-green-400 mt-2 p-2 rounded-md border border-green-800/30 flex items-center animate-scale-in">
                            <div className="relative mr-2 flex-shrink-0">
                              <div className="h-5 w-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                                <div style={{ transform: 'rotate(45deg)' }} className="h-2.5 w-1.5 border-b-2 border-r-2 border-green-500 mt-[-2px] ml-[-1px]"></div>
                              </div>
                            </div>
                            <span>This improvement will be applied to your ticket</span>
                          </div>
                        )}
                        {acceptedFields[field] === false && (
                          <div className="text-xs bg-red-900/20 text-red-400 mt-2 p-2 rounded-md border border-red-800/30 flex items-center animate-scale-in">
                            <div className="relative mr-2 flex-shrink-0">
                              <div className="h-5 w-5 rounded-full border-2 border-red-500 flex items-center justify-center">
                                <div className="h-3 w-3 flex items-center justify-center">
                                  <div className="h-0.5 w-2 bg-red-500 transform rotate-45 absolute"></div>
                                  <div className="h-0.5 w-2 bg-red-500 transform -rotate-45 absolute"></div>
                                </div>
                              </div>
                            </div>
                            <span>Original content will be kept in your ticket</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  {!showComparison && (
                    <div className="relative">
                      <div 
                        className={`p-3 rounded text-sm whitespace-pre-wrap ${
                          acceptedFields[field] === true 
                            ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/10 border border-green-800/30 shadow-sm shadow-green-900/20' 
                            : acceptedFields[field] === false 
                              ? 'bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/30 text-neutral-400 shadow-sm'
                              : 'bg-gradient-to-br from-purple-900/30 to-indigo-900/10 border border-purple-800/30 shadow-sm shadow-purple-900/20'
                        }`}
                      >
                        {acceptedFields[field] === false && originalData 
                          ? originalData[field as keyof typeof originalData]
                          : refinements[field as keyof typeof refinements]}
                      </div>
                      
                      {/* Status badge */}
                      {acceptedFields[field] === true && (
                        <div className="absolute top-3 right-3 bg-green-900/50 text-green-300 text-xs px-2 py-1 rounded-full border border-green-800/50 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Accepted
                        </div>
                      )}
                      
                      {acceptedFields[field] === false && (
                        <div className="absolute top-3 right-3 bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded-full border border-red-800/50 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Original
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {hasRefinements && (
          <button 
            onClick={handlePush}
            disabled={pushing || !hasRefinements}
            className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-600 text-white font-medium py-3.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-blue-700/30 flex items-center justify-center disabled:opacity-50 relative overflow-hidden group btn-shine transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Enhanced interactive effects */}
            <div className="absolute inset-0 w-full h-full">
              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 rounded-lg animate-pulse-glow"></div>
              </div>
              
              {/* Particle effects on hover */}
              <div className="absolute inset-0 overflow-hidden rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute -top-1 left-[10%] w-2 h-2 bg-cyan-300 rounded-full opacity-0 group-hover:animate-float" style={{ animationDelay: '0.1s' }}></div>
                <div className="absolute -top-2 left-[25%] w-1 h-1 bg-blue-300 rounded-full opacity-0 group-hover:animate-float" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute -top-3 left-[75%] w-1.5 h-1.5 bg-indigo-300 rounded-full opacity-0 group-hover:animate-float" style={{ animationDelay: '0.2s' }}></div>
                <div className="absolute -top-2 left-[60%] w-1 h-1 bg-cyan-300 rounded-full opacity-0 group-hover:animate-float" style={{ animationDelay: '0.4s' }}></div>
              </div>
              
              {/* Enhanced shine effect */}
              <div 
                className="absolute top-0 left-0 w-1/3 h-full bg-white opacity-40 blur-md transform -skew-x-45 transition-all duration-300 ease-out"
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
            
            {/* Keyframes for shine effect added via inline style for simplicity */}
            <style jsx>{`
              @keyframes slideRight {
                from { transform: translateX(-100%) skewX(-45deg); }
                to { transform: translateX(200%) skewX(-45deg); }
              }
            `}</style>
            {pushing ? (
              <>
                <div className="flex items-center">
                  <div className="relative mr-3">
                    <svg className="animate-spin h-5 w-5 text-white filter drop-shadow-md" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    
                    {/* Pulsing glow effect */}
                    <div className="absolute inset-0 animate-pulse-glow rounded-full" style={{ animationDuration: '1.5s' }}></div>
                    
                    {/* Animated particles */}
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-1 h-1 bg-blue-300 rounded-full animate-float"
                        style={{
                          top: `${Math.random() * 20 - 10}px`,
                          left: `${Math.random() * 20 - 10}px`,
                          opacity: 0.7,
                          animationDelay: `${i * 0.2}s`,
                          animationDuration: `${1 + Math.random()}s`
                        }}
                      ></div>
                    ))}
                  </div>
                  
                  <span className="relative text-white font-medium">
                    {isNewTicket ? 'Creating...' : 'Updating...'}
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></span>
                  </span>
                </div>
              </>
            ) : isNewTicket ? (
              <>
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Create in Jira
              </>
            ) : (
              <>
                <ArrowUpOnSquareIcon className="h-5 w-5 mr-2" />
                {pushing ? 'Updating...' : 'Update in Jira'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default RefinementOutput;
