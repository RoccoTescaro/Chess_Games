import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import * as d3 from 'd3';

const Flowchart = () => {
  const containerRef = useRef(null);
  const [boardSize, setBoardSize] = useState(120);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['initial']));
  const [nodesData, setNodesData] = useState([]);
  const [linksData, setLinksData] = useState([]);

  // Sample data structure
  const treeData = {
    id: "initial",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    move: "Initial position",
    frequency: 1,
    children: [
      {
        id: "e4",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
        move: "e4",
        frequency: 0.85,
        children: [
          {
            id: "e4-e5",
            fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
            move: "e5",
            frequency: 0.6,
            children: []
          },
          {
            id: "e4-c6",
            fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
            move: "c6",
            frequency: 0.3,
            children: []
          }
        ]
      },
      {
        id: "d4",
        fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
        move: "d4",
        frequency: 0.75,
        children: [
          {
            id: "d4-e5",
            fen: "rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq e6 0 2",
            move: "e5",
            frequency: 0.2,
            children: []
          },
          {
            id: "d4-d5",
            fen: "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2",
            move: "d5",
            frequency: 0.5,
            children: []
          }
        ]
      }
    ]
  };

  // Process the tree data for d3
  const processTreeData = useCallback((root, expandedSet) => {
    const result = { ...root };
    
    if (root.children && expandedSet.has(root.id)) {
      result.children = root.children.map(child => processTreeData(child, expandedSet));
    } else {
      result.children = [];
    }
    
    return result;
  }, []);

  // Toggle node expansion
  const toggleNode = (id) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Calculate background color based on frequency
  const getBgColor = (frequency) => {
    if (frequency > 0.8) return "#dc3545"; // bg-danger
    if (frequency > 0.6) return "#ffc107"; // bg-warning
    return "transparent";
  };

  // Update tree layout
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Process tree data based on expanded nodes
    const processedData = processTreeData(treeData, expandedNodes);
    
    // Create d3 tree layout
    const treeLayout = d3.tree()
      .nodeSize([boardSize * 1.25, boardSize * 1.5])
      .separation((a, b) => a.parent === b.parent ? 1.2 : 1.5);
    
    // Create hierarchy and apply layout
    const root = d3.hierarchy(processedData);
    treeLayout(root);
    
    // Extract nodes and links data
    const nodes = root.descendants().map(d => ({
      id: d.data.id,
      x: d.x,
      y: d.y,
      fen: d.data.fen,
      move: d.data.move,
      frequency: d.data.frequency
    }));
    
    const links = root.links().map(d => ({
      source: { x: d.source.x, y: d.source.y },
      target: { x: d.target.x, y: d.target.y }
    }));
    
    setNodesData(nodes);
    setLinksData(links);
  }, [boardSize, expandedNodes, processTreeData]);

  // Handle zoom controls
  const handleZoomIn = () => {
    setBoardSize(prev => Math.min(prev + 20, 200));
  };

  const handleZoomOut = () => {
    setBoardSize(prev => Math.max(prev - 20, 60));
  };

  // D3 zoom behavior setup
  useEffect(() => {
    if (!containerRef.current) return;
    
    const svg = d3.select(containerRef.current).select("svg");
    const g = svg.select("g.zoom-container");
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Center the tree initially
    const containerWidth = containerRef.current.clientWidth;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(containerWidth / 2, 100)
      .scale(1));
      
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <svg 
        width="100%" 
        height="100%" 
        className="border rounded inner-shadow" 
        style={{ 
            cursor: 'grab',
            maxHeight: '75vh', 
            minHeight: '75vh'
         }}
      >
        <g className="zoom-container">
          {/* Links */}
          {linksData.map((link, i) => (
            <path
              key={`link-${i}`}
              d={`M${link.source.x},${link.source.y} C${link.source.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${link.target.y}`}
              fill="none"
              stroke="#ccc"
              strokeWidth="2"
            />
          ))}
          
          {/* Nodes */}
          {nodesData.map(node => (
            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
              {/* Background/border */}
              <rect
                x={-boardSize / 2}
                y={-boardSize / 2}
                width={boardSize}
                height={boardSize}
                rx="4"
                fill={getBgColor(node.frequency)}
                stroke="#ccc"
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleNode(node.id)}
              />
              
              {/* Position for chessboard */}
              <foreignObject
                x={-boardSize / 2 + 3}
                y={-boardSize / 2 + 3}
                width={boardSize - 6}
                height={boardSize - 6}
              >
                <div style={{ width: '100%', height: '100%' }}>
                  <Chessboard
                    position={node.fen}
                    boardWidth={boardSize - 6}
                  />
                </div>
              </foreignObject>
              
              {/* Move text */}
              {boardSize > 140 && (
                <>
                  <text
                    y={boardSize / 2 + 15}
                    textAnchor="middle"
                    fontSize="12px"
                    fontWeight="bold"
                  >
                    {node.move}
                  </text>
                  <text
                    y={boardSize / 2 + 30}
                    textAnchor="middle"
                    fontSize="10px"
                    fill="#6c757d"
                  >
                    Freq: {(node.frequency * 100).toFixed(1)}%
                  </text>
                </>
              )}
            </g>
          ))}
        </g>
      </svg>
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button 
          className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow"
          onClick={handleZoomOut}
        >
          -
        </button>
        <button 
          className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow"
          onClick={handleZoomIn}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Flowchart;