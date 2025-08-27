"use client";

import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export const Notification = ({ type, message, duration = 5000, onClose }: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div 
        className={`p-4 rounded-lg shadow-lg flex items-center ${
          type === 'success' 
            ? 'bg-emerald-900 border border-emerald-700 text-emerald-100' 
            : 'bg-red-900 border border-red-700 text-red-100'
        }`}
      >
        {type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 mr-2" />
        ) : (
          <XCircleIcon className="h-5 w-5 mr-2" />
        )}
        <p className="pr-6">{message}</p>
        <button 
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-black/20"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Notification;
