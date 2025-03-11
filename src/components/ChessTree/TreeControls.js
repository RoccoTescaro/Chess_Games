// TreeControls.js - Controls for tree parameters with progress indication
import React from 'react';
import { useState, useEffect } from 'react';

const TreeControls = ({ 
  maxDepth, 
  minGames, 
  onRebuild, 
  onApply,  // Add this new prop
  buildingInProgress, 
  processedGames, 
  totalGames 
}) => {
  const [tempMaxDepth, setTempMaxDepth] = useState(maxDepth);
  const [tempMinGames, setTempMinGames] = useState(minGames);
  
  const handleMaxDepthChange = (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    setTempMaxDepth(value);
  };
  
  const handleMinGamesChange = (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    setTempMinGames(value);
  };
  
  const handleApply = () => {
    onApply(tempMaxDepth, tempMinGames);
  };
  
  // Reset temp values when props change
  useEffect(() => {
    setTempMaxDepth(maxDepth);
    setTempMinGames(minGames);
  }, [maxDepth, minGames]);
  
  const progressPercentage = totalGames ? Math.round((processedGames / totalGames) * 100) : 0;
  
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center">
        <div className={buildingInProgress ? "text-muted" : "d-none"}>
          Building tree: {processedGames} of {totalGames} games ({progressPercentage}%)
        </div>
        <div className="input-group input-group-sm" style={{ maxWidth: "500px" }}>
          <span className="input-group-text">Max Depth</span>
          <input 
            type="number" 
            className="form-control" 
            value={tempMaxDepth} 
            onChange={handleMaxDepthChange}
            min="1"
            max="30"
            style={{ width: "70px" }}
            disabled={buildingInProgress}
          />
          <span className="input-group-text">Min Games</span>
          <input 
            type="number" 
            className="form-control" 
            value={tempMinGames} 
            onChange={handleMinGamesChange}
            min="1"
            style={{ width: "70px" }}
            disabled={buildingInProgress}
          />
          <button 
            className="btn btn-outline-primary" 
            onClick={handleApply}
            disabled={buildingInProgress}
          >
            Apply
          </button>
          <button 
            className="btn btn-outline-secondary" 
            onClick={onRebuild}
            disabled={buildingInProgress}
          >
            {buildingInProgress ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Building...
              </>
            ) : "Rebuild"}
          </button>
        </div>
      </div>
      
      {buildingInProgress && (
        <div className="progress mt-2">
          <div 
            className="progress-bar" 
            role="progressbar" 
            style={{ width: `${progressPercentage}%` }} 
            aria-valuenow={progressPercentage} 
            aria-valuemin="0" 
            aria-valuemax="100"
          >
            {progressPercentage}%
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeControls;