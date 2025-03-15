import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { deserializeTree } from '../../services/utils/treeUtils';
import _ from 'lodash';

const Flowchart = () => {
  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const pieceImages = useRef({});
  const latestStateRef = useRef(null);
  
  // Constants
  const boardSize = 200;
  
  // State
  const [expandedNodes, setExpandedNodes] = useState(new Set([]));

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  //const [nodeCount, setNodeCount] = useState(0);
  //const [visibleNodeCount, setVisibleNodeCount] = useState(0);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load tree data from localStorage
  const treeData = useMemo(() => {
    const data = deserializeTree(localStorage.getItem('chessVariationTree')).tree;
    // Count total nodes in the tree
    //let count = 0;
    const countNodes = (node) => {
      //count++;
      if (node.children) {
        Object.values(node.children).forEach(countNodes);
      }
    };
    countNodes(data);
    //setNodeCount(count);
    return data;
  }, []);

  // Get background color based on frequency - memoize this simple function
  const getBgColor = useCallback((frequency) => {
    if (frequency > 0.8) return "#dc3545";
    if (frequency > 0.6) return "#ffc107";
    return "transparent";
  }, []);

  const isDarkMode = useCallback(() => {
    // Check for dark mode - different sites may use different methods to indicate dark mode
    return document.documentElement.classList.contains('dark') || 
           document.body.classList.contains('dark') ||
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Process tree data for rendering
  const { processedNodes, processedLinks } = useMemo(() => {
    const nodes = [];
    const links = [];
    
    // Helper function to calculate width needed for a subtree
    const calculateSubtreeWidth = (node) => {
      if (!node.children || !expandedNodes.has(node.id) || Object.keys(node.children).length === 0) {
        return boardSize * 1.5; // Minimum width for a leaf node
      }
      
      // Sum up the width of all children
      let totalWidth = 0;
      Object.values(node.children).forEach(child => {
        totalWidth += calculateSubtreeWidth(child);
      });
      
      // Ensure minimum width even for nodes with children
      return Math.max(boardSize * 1.5, totalWidth);
    };

    // Node lookup for efficient parent reference
    const nodeById = {};
    
    // Recursive function to position nodes
    const processNode = (node, x, y, level = 0, parentFen = null) => {
      // Create node data
      const nodeData = {
        id: node.fen,
        x,
        y,
        fen: node.fen,
        move: node.move,
        frequency: node.frequency || 0,
        expanded: expandedNodes.has(node.fen),
        hasChildren: node.children && Object.keys(node.children).length > 0
      };
      
      // Add to nodes array and lookup map
      nodes.push(nodeData);
      nodeById[node.fen] = nodeData;
      
      // Create link to parent if not root
      // Potential fix in the processNode function:
      if (parentFen) {
        const parentNode = nodeById[parentFen];
        if (parentNode) {
          links.push({
            sourceId: parentFen,
            targetId: node.fen,
            sourceX: parentNode.x,
            sourceY: parentNode.y + boardSize/2, // Add offset to bottom of parent
            targetX: x,
            targetY: y - boardSize/2  // Add offset to top of child
          });
        }
      }
      
      // Process children if expanded
      if (node.children && expandedNodes.has(node.fen)) {
        const childKeys = Object.keys(node.children);
        if (childKeys.length > 0) {
          // Calculate total width needed for all children
          let totalChildrenWidth = 0;
          const childWidths = {};
          
          childKeys.forEach(childId => {
            const childWidth = calculateSubtreeWidth(node.children[childId]);
            childWidths[childId] = childWidth;
            totalChildrenWidth += childWidth;
          });
          
          // Position children starting from left
          let startX = x - totalChildrenWidth / 2;
          
          childKeys.forEach(childId => {
            const childWidth = childWidths[childId];
            const childX = startX + childWidth / 2;
            const childY = y + boardSize * 1.3;
            
            processNode(node.children[childId], childX, childY, level + 1, node.fen);
            
            // Move right for next child
            startX += childWidth;
          });
        }
      }
    };
    
    // Start processing from root at center
    processNode(treeData, 0, 0);

    return { processedNodes: nodes, processedLinks: links };
  }, [treeData, expandedNodes, boardSize]);

  // Update latestStateRef whenever relevant state changes
  useEffect(() => {
    latestStateRef.current = {
      transform,
      processedNodes,
      processedLinks,
      hoveredNode,
      boardSize,
      canvasDimensions,
      getBgColor
    };
  }, [transform, processedNodes, processedLinks, hoveredNode, boardSize, canvasDimensions, getBgColor]);

  // Load chess piece images - only runs once
  useEffect(() => {
    const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
    let loadedCount = 0;
    
    pieces.forEach(piece => {
      const img = new Image();
      img.src = `/chess-pieces/${piece}.png`;
      
      img.onload = () => {
        loadedCount++;
        pieceImages.current[piece] = img;
        if (loadedCount === pieces.length) {
          setImagesLoaded(true);
        }
      };

      img.onerror = (err) => {
        console.error(`Failed to load image: ${piece}`, err);
        loadedCount++; // Count error as loaded to prevent hanging
        if (loadedCount === pieces.length) {
          setImagesLoaded(true);
        }
      };
    });
  }, []);

  // Update visible node count
  //useEffect(() => {
  //  setVisibleNodeCount(visibleCount);
  //}, [visibleCount]);

  // Toggle node expansion
  const toggleNode = useCallback((fen) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      
      // Check if the node is currently expanded
      const isExpanded = prev.has(fen);
      
      if (isExpanded) {
        // If expanded, collapse it
        newSet.delete(fen);
      } else {
        // If collapsed, expand it
        newSet.add(fen);
      }
      
      return newSet;
    });
  }, []);

  // Draw chessboard on canvas - only depends on the loaded images state
  const drawChessboard = useCallback((ctx, fen, x, y, size) => {
    const squareSize = size / 8;
    
    // Draw squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
        ctx.fillRect(
          x + col * squareSize,
          y + row * squareSize,
          squareSize,
          squareSize
        );
      }
    }
    
    // Draw pieces if images are loaded
    if (imagesLoaded && fen) {
      try {
        const chess = new Chess(fen);
        const board = chess.board();
        
        board.forEach((row, rowIndex) => {
          row.forEach((piece, colIndex) => {
            if (piece) {
              const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
              const pieceImg = pieceImages.current[pieceKey];
              if (pieceImg) {
                ctx.drawImage(
                  pieceImg,
                  x + colIndex * squareSize,
                  y + rowIndex * squareSize,
                  squareSize,
                  squareSize
                );
              }
            }
          });
        });
      } catch (err) {
        console.error("Error drawing pieces:", err);
      }
    }
  }, [imagesLoaded]);

  // Optimized drawFlowchart function with object culling for large trees
  const drawFlowchart = useCallback(() => {
    if (!canvasRef.current || !offscreenCanvasRef.current || !imagesLoaded || !latestStateRef.current) return;
  
    const { transform, processedNodes, processedLinks, hoveredNode, boardSize, canvasDimensions, getBgColor } = latestStateRef.current;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Use offscreen canvas for better performance
    const offscreenCanvas = offscreenCanvasRef.current;
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offCtx = offscreenCanvas.getContext('2d');
    offCtx.clearRect(0, 0, width, height);
    
    // Apply transformation
    offCtx.save();
    offCtx.translate(width / 2 + transform.x, height / 2 + transform.y);
    offCtx.scale(transform.scale, transform.scale);
    
    // Calculate visible area for culling
    const margin = boardSize * 2; // Add some margin for partially visible nodes
    const visibleLeft = (-width / 2 - transform.x) / transform.scale - margin;
    const visibleRight = (width / 2 - transform.x) / transform.scale + margin;
    const visibleTop = (-height / 2 - transform.y) / transform.scale - margin;
    const visibleBottom = (height / 2 - transform.y) / transform.scale + margin;

    // Only render links where at least one end is visible
    const visibleLinks = processedLinks.filter(link => {
      const sourceVisible = link.sourceX >= visibleLeft && link.sourceX <= visibleRight && 
                           link.sourceY >= visibleTop && link.sourceY <= visibleBottom;
      const targetVisible = link.targetX >= visibleLeft && link.targetX <= visibleRight && 
                           link.targetY >= visibleTop && link.targetY <= visibleBottom;
      return sourceVisible || targetVisible;
    });
    

    // Inside the visibleLinks.forEach loop:
    visibleLinks.forEach(link => {   
      offCtx.beginPath();
  
      // Start from bottom of parent node
      offCtx.moveTo(link.sourceX, link.sourceY);
      
      // Create two distinct control points for a nice, subtle curve
      // First control point - not too far down from the source
      const controlPoint1X = link.sourceX ;
      const controlPoint1Y = link.targetY;// + (link.targetY - link.sourceY) * 0.5;
      
      // Second control point - not too far up from the target
      const controlPoint2X = link.targetX;
      const controlPoint2Y = link.sourceY;// - (link.targetY - link.sourceY) * 0.5;
      
      offCtx.strokeStyle = isDarkMode() ? '#fff' : '#000';
      offCtx.lineWidth = 6;

      // Draw the curve with the two control points
      offCtx.bezierCurveTo(
        controlPoint1X, controlPoint1Y, // First control point
        controlPoint2X, controlPoint2Y, // Second control point  
        link.targetX, link.targetY      // End point
      );
      
      offCtx.stroke();
    });
    
    // Find visible nodes with culling
    const visibleNodes = processedNodes.filter(node => {
      const nodeLeft = node.x - boardSize / 2;
      const nodeRight = node.x + boardSize / 2;
      const nodeTop = node.y - boardSize / 2;
      const nodeBottom = node.y + boardSize / 2;
      
      return !(nodeRight < visibleLeft || nodeLeft > visibleRight ||
               nodeBottom < visibleTop || nodeTop > visibleBottom);
    });
    
    // Draw visible nodes
    visibleNodes.forEach(node => {
      // Node background/border
      const bgColor = getBgColor(node.frequency);
      if (bgColor !== "transparent") {
        offCtx.fillStyle = bgColor;
        offCtx.fillRect(
          node.x - boardSize / 2,
          node.y - boardSize / 2,
          boardSize,
          boardSize
        );
      }
      
      // Border
      offCtx.strokeStyle = node.id === hoveredNode?.id 
      ? '#007bff'  // Keep highlight color the same for both themes
      : isDarkMode() ? '#6e6e6e' : '#ccc';

      offCtx.lineWidth = node.id === hoveredNode?.id ? 3 : 1;
      offCtx.strokeRect(
        node.x - boardSize / 2,
        node.y - boardSize / 2,
        boardSize,
        boardSize
      );
      
      // Draw chessboard
      drawChessboard(
        offCtx,
        node.fen,
        node.x - boardSize / 2 + 2,
        node.y - boardSize / 2 + 2,
        boardSize - 4
      );
      
      // Draw move text

      offCtx.fillStyle = '#fff';
      offCtx.strokeStyle = '#000';
      offCtx.lineWidth = 1;
      offCtx.fillRect(
        node.x - boardSize / 4,
        node.y + boardSize / 2 + 2,
        boardSize / 2,
        boardSize / 6
      );
      offCtx.strokeRect(
        node.x - boardSize / 4,
        node.y + boardSize / 2 + 2,
        boardSize / 2,
        boardSize / 6
      );

      offCtx.fillStyle = "#000"
      offCtx.font = 'bold 12px Arial';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'top';
      offCtx.fillText(
        node.move || '',
        node.x,
        node.y + boardSize / 2 + 5
      );
      offCtx.font = '10px Arial';
      offCtx.fillText(
        `Freq: ${(node.frequency * 100).toFixed(1)}%`,
        node.x,
        node.y + boardSize / 2 + 20
      );    
    });
    
    // Copy to main canvas
    offCtx.restore();
    ctx.drawImage(offscreenCanvas, 0, 0);
  }, [imagesLoaded, drawChessboard]);
  
  // Mouse interaction handlers with optimized hit detection
  const handleMouseDown = useCallback((e) => {
    if (!canvasRef.current || !latestStateRef.current) return;
  
    e.preventDefault(); // Prevent default selection behavior
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
    
    // Check if clicked on a node
    const { transform, processedNodes, boardSize, canvasDimensions } = latestStateRef.current;
    const worldX = ((x - canvasDimensions.width / 2) - transform.x) / transform.scale;
    const worldY = ((y - canvasDimensions.height / 2) - transform.y) / transform.scale;
    
    // Find node under cursor
    const clickedNode = processedNodes.find(node => {
      const halfSize = boardSize / 2;
      return Math.abs(node.x - worldX) <= halfSize && 
             Math.abs(node.y - worldY) <= halfSize;
    });
    
    if (clickedNode && clickedNode.hasChildren) {
      // Stop dragging as we're interacting with a node
      setIsDragging(false);
      
      // Make sure we use the actual node ID
      toggleNode(clickedNode.fen);
      
      // Highlight the node
      setHoveredNode(clickedNode);
      
      // Important: prevent event propagation
      e.stopPropagation();
      return;
    }
    // Clear selection if clicked on empty space
    setHoveredNode(null);
  }, [toggleNode]);

  // Throttled mouse move handler to improve performance with large trees
  const handleMouseMove = useCallback(_.throttle((e) => {
    if (!canvasRef.current || !latestStateRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { transform, processedNodes, boardSize, canvasDimensions } = latestStateRef.current;

    if (isDragging) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setDragStart({ x, y });
      
      // Skip hover detection during drag for better performance
      return;
    }

    // Convert to world coordinates
    const worldX = ((x - canvasDimensions.width / 2) - transform.x) / transform.scale;
    const worldY = ((y - canvasDimensions.height / 2) - transform.y) / transform.scale;
    
    // Quick spatial filtering before detailed hit test
    const potentialHits = processedNodes.filter(node => {
      const halfSize = boardSize / 2;
      return Math.abs(node.x - worldX) <= halfSize && 
             Math.abs(node.y - worldY) <= halfSize;
    });
    
    // Find if mouse is over any node
    let newHovered = null;
    for (const node of potentialHits) {
      const dx = Math.abs(worldX - node.x);
      const dy = Math.abs(worldY - node.y);
      
      if (dx <= boardSize / 2 && dy <= boardSize / 2) {
        newHovered = node;
        break;
      }
    }
    
    // Only update if changed
    if (newHovered?.id !== latestStateRef.current.hoveredNode?.id) {
      setHoveredNode(newHovered);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = newHovered ? 'pointer' : 'grab';
      }
    }
  }, 16), [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredNode(null);
  }, []);

  // Optimized wheel handler with boundary limits
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (!canvasRef.current || !latestStateRef.current) return;
    
    const { transform, canvasDimensions } = latestStateRef.current;
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate world position before zoom
    const worldX = ((mouseX - canvasDimensions.width / 2) - transform.x) / transform.scale;
    const worldY = ((mouseY - canvasDimensions.height / 2) - transform.y) / transform.scale;
    
    // Calculate new scale with improved sensitivity and clamping
    const delta = -e.deltaY * 0.005;
    const zoomFactor = Math.pow(1.1, delta);
    const newScale = Math.max(0.1, Math.min(3.0, transform.scale * zoomFactor));
    
    // Calculate new transform to zoom at mouse position
    const newTransform = {
      scale: newScale,
      x: mouseX - (worldX * newScale + canvasDimensions.width / 2),
      y: mouseY - (worldY * newScale + canvasDimensions.height / 2)
    };
    
    setTransform(newTransform);
  }, []);

  // Setup canvas, offscreen canvas, and event listeners
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const canvas = canvasRef.current;
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvasRef.current = offscreenCanvas;
    
    let rafId = null;
    let pendingDimensions = null;
    
    // Batch dimension updates with rAF to avoid thrashing
    const updateDimensions = () => {
      if (pendingDimensions && canvas) {
        const { width, height } = pendingDimensions;
        canvas.width = width;
        canvas.height = height;
        setCanvasDimensions({ width, height });
        pendingDimensions = null;
      }
      rafId = null;
    };
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          // Store dimensions but don't apply immediately
          pendingDimensions = entry.contentRect;
          
          // Only schedule a new rAF if one isn't already pending
          if (rafId === null) {
            rafId = requestAnimationFrame(updateDimensions);
          }
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    // Add event listeners
    canvas.addEventListener('pointerdown', handleMouseDown, { passive: false });
    window.addEventListener('pointermove', handleMouseMove, { passive: false });
    window.addEventListener('pointerup', handleMouseUp, { passive: false });
    canvas.addEventListener('pointerleave', handleMouseLeave, { passive: false });
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handleMouseDown);
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
      canvas.removeEventListener('pointerleave', handleMouseLeave);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel]);

  // Draw flowchart whenever relevant state changes
  useEffect(() => {
    if (imagesLoaded && canvasRef.current && offscreenCanvasRef.current) {
      requestAnimationFrame(drawFlowchart);
    }
  }, [imagesLoaded, drawFlowchart, processedNodes, processedLinks, 
      transform, hoveredNode, canvasDimensions]);

  // Render debug info
  /*const renderDebugInfo = useCallback(() => {
    return (
      <div className="absolute bottom-4 left-4 text-xs bg-white bg-opacity-70 p-2 rounded shadow">
        <div>Total nodes: {nodeCount}</div>
        <div>Visible nodes: {visibleNodeCount}</div>
        <div>Expanded nodes: {expandedNodes.size}</div>
        <div>Scale: {transform.scale.toFixed(2)}x</div>
      </div>
    );
  }, [nodeCount, visibleNodeCount, expandedNodes.size, transform.scale]);
*/

  // Component render
  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <canvas 
        ref={canvasRef}
        className="w-100 h-100 border rounded"
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          maxHeight: '85vh', 
          minHeight: '75vh',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      />
      
      {/* Debug info */}
      {/*renderDebugInfo()*/}
    </div>
  );
};

export default Flowchart;