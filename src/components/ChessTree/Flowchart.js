import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import * as d3 from 'd3';
import { deserializeTree } from '../../services/utils/treeUtils';

const Flowchart = () => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [boardSize, setBoardSize] = useState(120);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['initial']));
  const [viewportRect, setViewportRect] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // Load tree data from localStorage (only once)
  const treeData = useMemo(() => {
    return deserializeTree(localStorage.getItem('chessVariationTree')).tree;
  }, []);

  // Process the tree data for d3
  const processTreeData = useCallback((root, expandedSet) => {
    const result = { ...root };
    
    if (root.children && expandedSet.has(root.id)) {
      result.children = Object.values(root.children).map(child => processTreeData(child, expandedSet));
    } else {
      result.children = [];
    }
    
    return result;
  }, []);

  // Calculate background color based on frequency
  const getBgColor = useCallback((frequency) => {
    if (frequency > 0.8) return "#dc3545"; // bg-danger
    if (frequency > 0.6) return "#ffc107"; // bg-warning
    return "transparent";
  }, []);

  // Toggle node expansion
  const toggleNode = useCallback((id) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Compute tree layout and visible nodes
  const { visibleNodes, visibleLinks } = useMemo(() => {
    if (!containerRef.current) return { visibleNodes: [], visibleLinks: [] };
    
    // Process tree data based on expanded nodes
    const processedData = processTreeData(treeData, expandedNodes);
    
    // Create d3 tree layout
    const treeLayout = d3.tree()
      .nodeSize([boardSize * 1.25, boardSize * 1.5])
      .separation((a, b) => a.parent === b.parent ? 1.2 : 1.5);
    
    // Create hierarchy and apply layout
    const root = d3.hierarchy(processedData);
    treeLayout(root);
    
    // Extract all nodes and links
    const allNodes = root.descendants().map(d => ({
      id: d.data.id,
      x: d.x,
      y: d.y,
      fen: d.data.fen,
      move: d.data.move,
      frequency: d.data.frequency,
      hasChildren: d.data.children && Object.keys(d.data.children).length > 0
    }));
    
    const allLinks = root.links().map(d => ({
      source: { x: d.source.x, y: d.source.y, id: d.source.data.id },
      target: { x: d.target.x, y: d.target.y, id: d.target.data.id }
    }));
    
    // Filter nodes and links based on viewport
    const margin = boardSize * 2; // Extra margin to preload nodes just outside viewport
    const visibleArea = {
      left: (viewportRect.x - transform.x) / transform.k - margin,
      right: (viewportRect.x + viewportRect.width - transform.x) / transform.k + margin,
      top: (viewportRect.y - transform.y) / transform.k - margin,
      bottom: (viewportRect.y + viewportRect.height - transform.y) / transform.k + margin
    };
    
    // Filter nodes within visible area
    const visibleNodes = allNodes.filter(node => 
      node.x + boardSize/2 >= visibleArea.left &&
      node.x - boardSize/2 <= visibleArea.right &&
      node.y + boardSize/2 >= visibleArea.top &&
      node.y - boardSize/2 <= visibleArea.bottom
    );
    
    // Get visible node IDs for quick lookup
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
    
    // Filter links that connect visible nodes
    const visibleLinks = allLinks.filter(link => 
      visibleNodeIds.has(link.source.id) && visibleNodeIds.has(link.target.id)
    );
    
    return { visibleNodes, visibleLinks };
  }, [boardSize, expandedNodes, processTreeData, treeData, viewportRect, transform]);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    setBoardSize(prev => Math.min(prev + 20, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setBoardSize(prev => Math.max(prev - 20, 60));
  }, []);

  // Update viewport rect when svg size changes
  useEffect(() => {
    const updateViewportSize = () => {
      if (svgRef.current) {
        const bbox = svgRef.current.getBoundingClientRect();
        setViewportRect({
          x: 0,
          y: 0,
          width: bbox.width,
          height: bbox.height
        });
      }
    };
    
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    
    return () => {
      window.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  // D3 zoom behavior setup
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select("g.zoom-container");
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setTransform({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        });
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

  // Memoized Node component to prevent unnecessary re-renders
  const Node = useCallback(({ node }) => {
    return (
      <g transform={`translate(${node.x},${node.y})`}>
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
              arePiecesDraggable={false}
            />
          </div>
        </foreignObject>
        
        {/* Show expansion indicator */}
        {node.hasChildren && (
          <circle
            cx={boardSize / 2 - 10}
            cy={-boardSize / 2 + 10}
            r={5}
            fill={expandedNodes.has(node.id) ? "#28a745" : "#dc3545"}
          />
        )}
        
        {/* Move text - only show for boards large enough */}
        {boardSize > 100 && (
          <>
            <text
              y={boardSize / 2 + 15}
              textAnchor="middle"
              fontSize="12px"
              fontWeight="bold"
            >
              {node.move}
            </text>
            {boardSize > 140 && (
              <text
                y={boardSize / 2 + 30}
                textAnchor="middle"
                fontSize="10px"
                fill="#6c757d"
              >
                Freq: {(node.frequency * 100).toFixed(1)}%
              </text>
            )}
          </>
        )}
      </g>
    );
  }, [boardSize, expandedNodes, getBgColor, toggleNode]);

  // Render minimap for navigation
  const Minimap = useMemo(() => {
    // Create a simplified representation of the tree
    const minimapScale = 0.05;
    const minimapWidth = 150;
    const minimapHeight = 100;
    
    return (
      <div className="absolute top-4 right-4 bg-white border rounded shadow-sm overflow-hidden">
        <svg width={minimapWidth} height={minimapHeight} className="bg-gray-100">
          {/* Show all nodes as small dots */}
          <g transform={`scale(${minimapScale})`}>
            {visibleLinks.map((link, i) => (
              <path
                key={`minimap-link-${i}`}
                d={`M${link.source.x},${link.source.y} L${link.target.x},${link.target.y}`}
                stroke="#aaa"
                strokeWidth="15"
              />
            ))}
            {visibleNodes.map(node => (
              <circle
                key={`minimap-node-${node.id}`}
                cx={node.x}
                cy={node.y}
                r={50}
                fill={getBgColor(node.frequency) || "#333"}
              />
            ))}
          </g>
          
          {/* Viewport indicator */}
          <rect
            x={0}
            y={0}
            width={minimapWidth}
            height={minimapHeight}
            fill="rgba(66, 153, 225, 0.2)"
            stroke="rgba(66, 153, 225, 0.6)"
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  }, [visibleNodes, visibleLinks, getBgColor]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <svg 
        ref={svgRef}
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
          {visibleLinks.map((link, i) => (
            <path
              key={`link-${i}`}
              d={`M${link.source.x},${link.source.y} C${link.source.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${link.target.y}`}
              fill="none"
              stroke="#ccc"
              strokeWidth="2"
            />
          ))}
          
          {/* Nodes */}
          {visibleNodes.map(node => (
            <Node key={node.id} node={node} />
          ))}
        </g>
      </svg>
      
      {/* Minimap */}
      {Minimap}
      
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
      
      {/* Display node count info for debugging */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500">
        Rendering {visibleNodes.length} nodes of total tree
      </div>
    </div>
  );
};

export default Flowchart;