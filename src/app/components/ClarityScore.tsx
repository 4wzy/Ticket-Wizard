"use client";
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ClarityScoreProps {
  score: number | null;
  reasoning?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const ClarityScore: React.FC<ClarityScoreProps> = ({
  score,
  reasoning,
  className = '',
  size = 'md',
  showLabel = true,
  label = 'Clarity Score'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, placement: 'top' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate optimal tooltip position
  const calculateTooltipPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // Fixed width for calculation
    const tooltipHeight = 200; // Estimated height
    const margin = 8;

    let top = 0;
    let left = 0;
    let placement = 'top';

    // Check if tooltip fits above
    if (buttonRect.top - tooltipHeight - margin > 0) {
      placement = 'top';
      top = buttonRect.top - tooltipHeight - margin;
      left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
    }
    // Check if tooltip fits below
    else if (buttonRect.bottom + tooltipHeight + margin < window.innerHeight) {
      placement = 'bottom';
      top = buttonRect.bottom + margin;
      left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
    }
    // Check if tooltip fits to the right
    else if (buttonRect.right + tooltipWidth + margin < window.innerWidth) {
      placement = 'right';
      top = buttonRect.top + buttonRect.height / 2 - tooltipHeight / 2;
      left = buttonRect.right + margin;
    }
    // Default to left
    else {
      placement = 'left';
      top = buttonRect.top + buttonRect.height / 2 - tooltipHeight / 2;
      left = buttonRect.left - tooltipWidth - margin;
    }

    // Ensure tooltip stays within viewport bounds
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));

    setTooltipPosition({ top, left, placement });
  };

  // Show/hide tooltip handlers
  const handleShowTooltip = () => {
    calculateTooltipPosition();
    setShowTooltip(true);
  };

  const handleHideTooltip = () => {
    setShowTooltip(false);
  };

  // Handle outside clicks and window resize
  useEffect(() => {
    if (showTooltip) {
      const handleResize = () => calculateTooltipPosition();
      const handleClickOutside = (event: MouseEvent) => {
        if (
          buttonRef.current && 
          tooltipRef.current && 
          !buttonRef.current.contains(event.target as Node) &&
          !tooltipRef.current.contains(event.target as Node)
        ) {
          setShowTooltip(false);
        }
      };

      window.addEventListener('resize', handleResize);
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTooltip]);

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
        {reasoning && (
          <>
            <button
              ref={buttonRef}
              onMouseEnter={handleShowTooltip}
              onMouseLeave={handleHideTooltip}
              onClick={() => showTooltip ? handleHideTooltip() : handleShowTooltip()}
              className="text-neutral-400 hover:text-neutral-300 transition-colors ml-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded"
              aria-label="Show clarity score reasoning"
            >
              <InformationCircleIcon className="h-4 w-4" />
            </button>
            
            {showTooltip && typeof window !== 'undefined' && createPortal(
              <div
                ref={tooltipRef}
                className="fixed z-[9999] w-80 max-w-[90vw] bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
                style={{
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
                }}
                onMouseEnter={handleShowTooltip}
                onMouseLeave={handleHideTooltip}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-neutral-700">
                  <div className="flex items-center space-x-2">
                    <InformationCircleIcon className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-neutral-100 text-sm">Clarity Score Reasoning</span>
                  </div>
                  <button
                    onClick={handleHideTooltip}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors rounded p-1"
                    aria-label="Close tooltip"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
                  <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {reasoning}
                  </div>
                </div>
                
                {/* Arrow indicator */}
                <div 
                  className={`absolute w-0 h-0 ${
                    tooltipPosition.placement === 'top' 
                      ? 'top-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-transparent border-t-neutral-600'
                      : tooltipPosition.placement === 'bottom'
                      ? 'bottom-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-transparent border-b-neutral-600'
                      : tooltipPosition.placement === 'right'
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

export default ClarityScore;