'use client';

import { HeartPulse, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PointsToastProps {
  points: number;
  description: string;
  onClose: () => void;
}

export default function PointsToast({ points, description, onClose }: PointsToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to allow the DOM to mount before animating
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-close after 4 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
      }`}
    >
      <div className="bg-gradient-to-r from-[#4A7DE8] to-[#6FA8F5] p-1 rounded-2xl shadow-lg relative overflow-hidden">
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-white/20 skew-x-12 animate-[shine_2s_ease-in-out_infinite]" />
        
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-4 relative z-10 min-w-[300px]">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
            <HeartPulse className="w-6 h-6 text-[#7FFFD4]" />
          </div>
          
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">
              <span className="text-[#4A7DE8]">+{points} Pulsos</span>
            </p>
            <p className="text-xs text-gray-600 line-clamp-1">{description}</p>
          </div>
          
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }} 
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
