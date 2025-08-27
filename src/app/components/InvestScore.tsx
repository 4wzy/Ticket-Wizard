"use client";
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SparklesIcon, InformationCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface InvestCriteria {
  independent: number;
  negotiable: number;
  valuable: number;
  estimable: number;
  small: number;
  testable: number;
}

interface InvestScoreProps {
  score: number | null;
  investBreakdown?: InvestCriteria | null;
  reasoning?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const InvestScore: React.FC<InvestScoreProps> = ({
  score,
  investBreakdown,
  reasoning,
  className = '',
  size = 'md',
  showLabel = true,
  label = 'INVEST Score'
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownPosition, setBreakdownPosition] = useState({ top: 0, left: 0, placement: 'top' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);

  // INVEST criteria details
  const investCriteriaDetails = {
    independent: { name: 'Independent', maxScore: 2.0, description: 'Self-contained, minimal dependencies' },
    negotiable: { name: 'Negotiable', maxScore: 1.5, description: 'Flexible scope, allows discussion' },
    valuable: { name: 'Valuable', maxScore: 2.0, description: 'Clear business/user value articulated' },
    estimable: { name: 'Estimable', maxScore: 1.5, description: 'Clear enough for effort estimation' },
    small: { name: 'Small', maxScore: 1.5, description: 'Appropriately sized for sprint completion' },
    testable: { name: 'Testable', maxScore: 1.5, description: 'Verifiable acceptance criteria' }
  };

  // Calculate breakdown position
  const calculateBreakdownPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const breakdownWidth = 400;
    const breakdownHeight = 320;
    const margin = 8;

    let top = 0;
    let left = 0;
    let placement = 'top';

    // Check if breakdown fits above
    if (buttonRect.top - breakdownHeight - margin > 0) {
      placement = 'top';
      top = buttonRect.top - breakdownHeight - margin;
      left = buttonRect.left + buttonRect.width / 2 - breakdownWidth / 2;
    }
    // Check if breakdown fits below
    else if (buttonRect.bottom + breakdownHeight + margin < window.innerHeight) {
      placement = 'bottom';
      top = buttonRect.bottom + margin;
      left = buttonRect.left + buttonRect.width / 2 - breakdownWidth / 2;
    }
    // Check if breakdown fits to the right
    else if (buttonRect.right + breakdownWidth + margin < window.innerWidth) {
      placement = 'right';
      top = buttonRect.top + buttonRect.height / 2 - breakdownHeight / 2;
      left = buttonRect.right + margin;
    }
    // Default to left
    else {
      placement = 'left';
      top = buttonRect.top + buttonRect.height / 2 - breakdownHeight / 2;
      left = buttonRect.left - breakdownWidth - margin;
    }

    // Ensure breakdown stays within viewport bounds
    left = Math.max(margin, Math.min(left, window.innerWidth - breakdownWidth - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - breakdownHeight - margin));

    setBreakdownPosition({ top, left, placement });
  };

  // Improved hover management system
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShowBreakdown = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Show immediately or with small delay if not already shown
    if (!showBreakdown) {
      calculateBreakdownPosition();
      setShowBreakdown(true);
    }
  };

  const handleHideBreakdown = () => {
    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    
    // Hide with delay to allow mouse to move to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setShowBreakdown(false);
      hideTimeoutRef.current = null;
    }, 150); // 150ms delay allows smooth transition
  };

  const handleTooltipMouseEnter = () => {
    // Cancel any pending hide when mouse enters tooltip
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    // Hide when leaving tooltip
    handleHideBreakdown();
  };

  // Handle outside clicks and window resize
  useEffect(() => {
    if (showBreakdown) {
      const handleResize = () => calculateBreakdownPosition();
      const handleClickOutside = (event: MouseEvent) => {
        if (
          buttonRef.current && 
          breakdownRef.current && 
          !buttonRef.current.contains(event.target as Node) &&
          !breakdownRef.current.contains(event.target as Node)
        ) {
          setShowBreakdown(false);
        }
      };

      window.addEventListener('resize', handleResize);
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleClickOutside);
        
        // Clear timeouts on cleanup
        if (showTimeoutRef.current) {
          clearTimeout(showTimeoutRef.current);
          showTimeoutRef.current = null;
        }
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      };
    }
  }, [showBreakdown]);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-neutral-400';
    if (score < 4) return 'text-red-400 animate-pulse';
    if (score < 7) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getScoreIcon = (score: number | null) => {
    if (score === null) return null;
    if (score >= 8) return <SparklesIcon className={`${sizeClasses.icon} text-green-400 animate-pulse`} />;
    return null;
  };

  const getCriteriaColor = (score: number, maxScore: number) => {
    const percentage = score / maxScore;
    if (percentage < 0.5) return 'text-red-400';
    if (percentage < 0.75) return 'text-yellow-400';
    return 'text-green-400';
  };

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          text: 'text-sm',
          score: 'text-lg',
          icon: 'h-4 w-4'
        };
      case 'lg':
        return {
          text: 'text-base',
          score: 'text-2xl',
          icon: 'h-6 w-6'
        };
      default: // md
        return {
          text: 'text-sm',
          score: 'text-xl',
          icon: 'h-5 w-5'
        };
    }
  }, [size]);

  if (score === null) {
    return showLabel ? (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className={`${sizeClasses.text} text-neutral-400`}>{label}:</span>
        <span className={`${sizeClasses.score} text-neutral-500`}>--</span>
      </div>
    ) : null;
  }

  return (
    <div className={`flex items-center space-x-2 transition-all duration-500 ${className}`}>
      {showLabel && (
        <span className={`${sizeClasses.text} text-neutral-300`}>{label}:</span>
      )}
      <div className="flex items-center space-x-1 relative">
        <span className={`${sizeClasses.score} font-bold ${getScoreColor(score)}`}>
          {score.toFixed(1)}/10.0
        </span>
        {getScoreIcon(score)}
        {(investBreakdown || reasoning) && (
          <>
            <button
              ref={buttonRef}
              onMouseEnter={handleShowBreakdown}
              onMouseLeave={handleHideBreakdown}
              onClick={() => showBreakdown ? handleHideBreakdown() : handleShowBreakdown()}
              className="text-neutral-400 hover:text-neutral-300 transition-colors ml-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded"
              aria-label="Show INVEST score breakdown"
            >
              <ChartBarIcon className="h-4 w-4" />
            </button>
            
            {showBreakdown && typeof window !== 'undefined' && createPortal(
              <div
                ref={breakdownRef}
                className="fixed z-[9999] w-96 max-w-[95vw] bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 invest-tooltip"
                style={{
                  top: breakdownPosition.top,
                  left: breakdownPosition.left,
                }}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-700">
                  <div className="flex items-center space-x-2">
                    <ChartBarIcon className="h-5 w-5 text-blue-400" />
                    <span className="font-medium text-neutral-100">INVEST Score Breakdown</span>
                  </div>
                  <button
                    onClick={handleHideBreakdown}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors rounded p-1"
                    aria-label="Close breakdown"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* INVEST Breakdown */}
                {investBreakdown && (
                  <div className="p-4 space-y-3">
                    {Object.entries(investCriteriaDetails).map(([key, details]) => {
                      const criteriaScore = investBreakdown[key as keyof InvestCriteria];
                      // Handle undefined/null criteriaScore
                      const safeScore = typeof criteriaScore === 'number' ? criteriaScore : 0;
                      const percentage = (safeScore / details.maxScore) * 100;
                      
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-200">{details.name}</span>
                            <span className={`text-sm font-bold ${getCriteriaColor(safeScore, details.maxScore)}`}>
                              {safeScore.toFixed(1)}/{details.maxScore}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                percentage < 50 ? 'bg-red-500' : percentage < 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-neutral-400">{details.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Reasoning section */}
                {reasoning && (
                  <div className="border-t border-neutral-700">
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <InformationCircleIcon className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-neutral-100">AI Reasoning</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
                        <div className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                          {reasoning}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Arrow indicator */}
                <div 
                  className={`absolute w-0 h-0 ${
                    breakdownPosition.placement === 'top' 
                      ? 'top-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-transparent border-t-neutral-600'
                      : breakdownPosition.placement === 'bottom'
                      ? 'bottom-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-transparent border-b-neutral-600'
                      : breakdownPosition.placement === 'right'
                      ? 'right-full top-1/2 transform -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-transparent border-r-neutral-600'
                      : 'left-full top-1/2 transform -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-transparent border-l-neutral-600'
                  }`}
                />
              </div>,
              document.body
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvestScore;