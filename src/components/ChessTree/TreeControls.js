// TreeControls.js - Controls for tree parameters
import React from 'react';

const TreeControls = ({ maxDepth, minGames, onChange, onRebuild }) => {
  const handleMaxDepthChange = (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    onChange(value, minGames);
  };
  
  const handleMinGamesChange = (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    onChange(maxDepth, value);
  };
  
  return (
    <div className="d-flex justify-content-end mb-3">
      <div className="input-group input-group-sm">
        <span className="input-group-text">Max Depth</span>
        <input 
          type="number" 
          className="form-control" 
          value={maxDepth} 
          onChange={handleMaxDepthChange}
          min="1"
          max="30"
          style={{ width: "70px" }}
        />
        <span className="input-group-text">Min Games</span>
        <input 
          type="number" 
          className="form-control" 
          value={minGames} 
          onChange={handleMinGamesChange}
          min="1"
          style={{ width: "70px" }}
        />
        <button 
          className="btn btn-outline-secondary" 
          onClick={onRebuild}
        >
          Rebuild
        </button>
      </div>
    </div>
  );
};

export default TreeControls;