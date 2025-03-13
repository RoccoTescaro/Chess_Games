import React, { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';

// Calculate border color based on frequency
const getColorFromFrequency = (frequency) => {
  // Assuming frequency is a number between 0 and 1
  if (frequency > 0.8) return 'bg-danger';
  if (frequency > 0.6) return 'bg-warning';
  return ''
};

// Node component
const ChessNode = ({ node, expanded, onToggle, boardSize, level = 0 }) => {
  const { fen, move, frequency, id } = node;
  
  return (
    <div className="flex flex-col items-center">
      <div className="mb-4">
        <div 
          className='p-2 rounded cursor-pointer border'
          onClick={() => onToggle(id)}
        >
          <div>
            <div className={`rounded ${getColorFromFrequency(frequency)}`} style={{padding: '3px'}}>
                <Chessboard position={fen} />
            </div>
            {
                boardSize > 140 && (
                <div>
                    <div className="text-center text-sm mt-2 font-medium truncate max-w-full">
                    {move}
                    </div>
                    <div className="text-center text-xs text-gray-500">
                    Freq: {(frequency * 100).toFixed(1)}%
                    </div>
                </div>)
            }
          </div>
        </div>
      </div>
      
      {expanded[id] && node.children && node.children.length > 0 && (
        <div className="border-l-2 border-gray-300 pt-4">
          <div className="flex flex-row space-x-6 justify-center">
            {node.children.map((child) => (
              <ChessNode
                key={child.id}
                node={child}
                expanded={expanded}
                onToggle={onToggle}
                boardSize={boardSize}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main component for the chess variation flowchart
const Flowchart = () => {
  // Sample data structure with a few nodes
  const [root, setRoot] = useState({
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    move: "Initial position",
    children: [
      {
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
        move: "e4",
        frequency: 0.85,
        id: "e4",
        children: [
          {
            fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
            move: "e5",
            frequency: 0.6,
            id: "e4-e5",
            children: []
          },
          {
            fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
            move: "c6",
            frequency: 0.3,
            id: "e4-c6",
            children: []
          }
        ]
      },
      {
        fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
        move: "d4",
        frequency: 0.75,
        id: "d4",
        children: [
          {
            fen: "rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq e6 0 2",
            move: "e5",
            frequency: 0.2,
            id: "d4-e5",
            children: []
          },
          {
            fen: "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2",
            move: "d5",
            frequency: 0.5,
            id: "d4-d5",
            children: []
          }
        ]
      }
    ],
    frequency: 1,
    id: "initial",
    games: []
  });
  
  // State to track expanded nodes
  const [expanded, setExpanded] = useState({ initial: true });
  
  // State for zoom level
  const [boardSize, setBoardSize] = useState(120);
  
  // State for panning
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef(null);
  
  // Toggle node expansion
  const toggleNode = (id) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Handle mouse wheel for zooming
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    setBoardSize(prev => {
      const newSize = delta > 0 
        ? Math.max(prev - 10, 60)  // Zoom out (minimum size: 60)
        : Math.min(prev + 10, 200); // Zoom in (maximum size: 200)
      return newSize;
    });
  };
  
  // Handle mouse down for starting drag
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };
  
  // Handle mouse move for dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      // Cleanup
      return () => {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden relative inner-shadow rounded"
      style={{ cursor: isDragging ? 'grabbing' : 'grab',
        maxHeight: '75vh',
        minHeight: '75vh'
      }}
    >
      <div 
        className="absolute"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
          transformOrigin: 'center center',
          maxWidth: boardSize + 'px' 
        }}
      >
        <div className="pt-8">
          <ChessNode
            node={root}
            expanded={expanded}
            onToggle={toggleNode}
            boardSize={boardSize}
          />
        </div>
      </div>
    </div>
  );
};

export default Flowchart;