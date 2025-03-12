// ChessboardDisplay.js - Chess board with path navigation and undo button
import React from 'react';
import { Chessboard } from 'react-chessboard';

const ChessboardDisplay = ({ position, path, onPathNodeClick, gamesCount, onUndo }) => {
  const renderPath = () => {
    return (
      <nav aria-label="breadcrumb">
        <ol className="d-flex breadcrumb align-items-center mb-0">
          {path.map((item, index) => (
            <li 
              key={index} 
              className={`breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`} 
              style={{ cursor: 'pointer' }}
              onClick={() => onPathNodeClick(index)}
            >
              {item.name}
            </li>
          ))}
        </ol>
      </nav>
    );
  };
  
  const canUndo = path.length > 1;
  
  return (
    <div>
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <Chessboard position={position} />
      </div>
      <div className="mt-2 d-flex justify-content-between align-items-center">
        <div className="d-flex flex-grow-1 align-items-center">
            {renderPath()}
        </div>
        <div>
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={onUndo} 
            disabled={!canUndo}
            >
          <i className="bi bi-arrow-left"></i> Undo
          </button>
        </div>
      </div>
      {gamesCount > 0 && (
        <span className="badge bg-success">
          {gamesCount} games with this position
        </span>
      )}
    </div>
  );
};

export default ChessboardDisplay;