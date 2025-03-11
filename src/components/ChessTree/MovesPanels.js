// MovesPanel.js - Available moves display
import React from 'react';

const MovesPanel = ({ selectedNode, onMoveSelect }) => {
  if (!selectedNode) return null;
  
  const moves = Object.values(selectedNode.children)
    .sort((a, b) => b.frequency - a.frequency);
  
  if (moves.length === 0) {
    return <div className="alert alert-info mt-3">No further moves in the database for this position.</div>;
  }
  
  return (
    <div className="list-group mt-3">
      {moves.map((move, index) => {
        const moveKey = Object.keys(selectedNode.children).find(key => 
          selectedNode.children[key] === move
        );
        
        return (
          <button 
            key={index} 
            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            onClick={() => onMoveSelect(moveKey)}
          >
            <span>{move.move}</span>
            <span className="badge bg-primary rounded-pill">{move.frequency} games</span>
          </button>
        );
      })}
    </div>
  );
};

export default MovesPanel;