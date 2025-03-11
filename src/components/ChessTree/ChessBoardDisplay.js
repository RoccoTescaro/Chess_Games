// ChessboardDisplay.js - Chess board with path navigation
import React from 'react';
import { Chessboard } from 'react-chessboard';

const ChessboardDisplay = ({ position, path, onPathNodeClick, gamesCount }) => {
  const renderPath = () => {
    return (
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
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
  
  return (
    <div>
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <Chessboard position={position} />
      </div>
      <div className="mt-3">
        {renderPath()}
        {gamesCount > 0 && (
          <div className="mt-2 text-center">
            <span className="badge bg-success">
              {gamesCount} games with this position
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessboardDisplay;