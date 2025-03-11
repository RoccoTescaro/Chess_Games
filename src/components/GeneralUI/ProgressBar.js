import React from 'react';

const ProgressBar = ({ progress, loading, showLoadingBar }) => {
  if (!showLoadingBar) return null;

  return (
    <div className="mb-4">
      <div className="progress" style={{ height: "20px" }}>
        <div 
          className="progress-bar progress-bar-striped progress-bar-animated" 
          role="progressbar" 
          style={{ width: `${progress}%` }} 
          aria-valuenow={progress} 
          aria-valuemin="0" 
          aria-valuemax="100"
        >
          {Math.round(progress)}%
        </div>
      </div>
      <div className="small text-muted mt-1">
        {loading ? "Fetching and processing games..." : "Operation complete"}
      </div>
    </div>
  );
};

export default ProgressBar;