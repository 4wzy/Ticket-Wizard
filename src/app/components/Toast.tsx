"use client";
import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  duration = 4000 
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimatingOut(false);
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  if (!isVisible && !isAnimatingOut) return null;

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
        isVisible && !isAnimatingOut
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`
        flex items-center space-x-3 p-4 rounded-lg shadow-lg backdrop-blur-sm border max-w-md
        ${type === 'success' 
          ? 'bg-green-900/80 border-green-600/50 text-green-100' 
          : 'bg-red-900/80 border-red-600/50 text-red-100'
        }
      `}>
        {type === 'success' && (
          <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
        )}
        
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close notification"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;