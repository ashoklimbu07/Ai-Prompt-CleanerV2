import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Animated spinner with multiple rings */}
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizes[size]} border-4 border-transparent border-t-blue-400 border-r-indigo-400 rounded-full animate-spin-fast`}></div>
        {/* Middle ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${sizes[size === 'md' ? 'sm' : 'md']} border-4 border-transparent border-t-purple-400 border-l-pink-400 rounded-full animate-spin-reverse`}></div>
        </div>
        {/* Center pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse-slow"></div>
        </div>
      </div>
      
      {text && (
        <span className="text-white font-bold text-base">
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
