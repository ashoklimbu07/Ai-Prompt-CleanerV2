import React from 'react';

const LoadingBar = ({ total, current = 0 }) => {
  const displayCount = current > 0 ? current : total;
  
  return (
    <div className="mt-4 animate-fade-in">
      <div className="bg-white rounded p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingBar;
