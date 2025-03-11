// ChessVariationTree.js - Main component with background tree building
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { getGames } from '../../services/db/gameStorage';
import TreeControls from './TreeControls';
import ChessboardDisplay from './ChessboardDisplay';
import MovesPanel from './MovesPanel';
import RelatedGames from './RelatedGames';

const ChessVariationTree = () => {
  const [games, setGames] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [workingTreeData, setWorkingTreeData] = useState(null); // Tree being built in background
  const [loading, setLoading] = useState(true);
  const [buildingInProgress, setBuildingInProgress] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(new Chess().fen());
  const [relatedGames, setRelatedGames] = useState([]);
  const [path, setPath] = useState([]);
  const [maxDepth, setMaxDepth] = useState(10);
  const [minGames, setMinGames] = useState(2);
  const [processedGames, setProcessedGames] = useState(0);
  const workerRef = useRef(null);

  // Load games on component mount
  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true);
        // Get games from the database
        const loadedGames = await getGames();
        setGames(loadedGames);
        
        // Initial tree build
        if (loadedGames.length > 0) {
          buildInitialTree(loadedGames);
        }
      } catch (error) {
        console.error('Error loading games:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadGames();
    
    // Clean up worker on unmount
    const currentWorker = workerRef.current;
    return () => {
      if (currentWorker) {
        currentWorker.terminate();
      }
    };
    // eslint-disable-next-line 
  }, []);
  
  // Function to build the initial tree
  const buildInitialTree = (loadedGames) => {
    // Create a placeholder tree with the root node
    const initialTree = {
      fen: new Chess().fen(),
      move: 'Initial Position',
      children: {},
      games: [],
      frequency: loadedGames.length
    };
    
    setTreeData(initialTree);
    setSelectedNode(initialTree);
    setCurrentPosition(initialTree.fen);
    setPath([{ name: 'Initial Position', node: initialTree }]);
    
    // Start building the tree in background
    startTreeBuilding(loadedGames, initialTree, maxDepth, minGames);
  };
  
  /*// Handle node selection in the tree
  function handleNodeSelect(node, nodePath) {
    setSelectedNode(node);
    setCurrentPosition(node.fen);
    setRelatedGames(node.games || []);
    setPath(nodePath);
  }*/
  
  // Handle tree control parameter changes
  function handleControlsChange(newMaxDepth, newMinGames) {
    // Do nothing here - we'll apply changes when the Apply button is clicked
  }
  
  // Apply new parameters
  function handleApplyParameters(newMaxDepth, newMinGames) {
    setMaxDepth(newMaxDepth);
    setMinGames(newMinGames);
    
    // Only rebuild if we have games
    if (games.length > 0) {
      // If the tree is already built, we can prune it directly for min games change
      if (treeData && newMaxDepth <= maxDepth && newMinGames !== minGames) {
        const prunedTree = pruneTree(JSON.parse(JSON.stringify(treeData)), newMinGames);
        setTreeData(prunedTree);
        
        // If current selection would be pruned, go back to root
        if (!isNodeInTree(selectedNode, prunedTree)) {
          setSelectedNode(prunedTree);
          setCurrentPosition(prunedTree.fen);
          setRelatedGames(prunedTree.games || []);
          setPath([{ name: 'Initial Position', node: prunedTree }]);
        }
      }
      // If max depth changed or complete rebuild needed
      else {
        handleRebuild();
      }
    }
  }
  
  // Check if a node exists in the tree
  function isNodeInTree(node, tree) {
    if (!node || !tree) return false;
    if (node === tree) return true;
    
    // Check all children
    for (const key in tree.children) {
      if (isNodeInTree(node, tree.children[key])) {
        return true;
      }
    }
    
    return false;
  }
  
  // Start building the tree in the background with chunked processing
 // Optimize the startTreeBuilding function to reduce deep copies
  function startTreeBuilding(gamesToProcess, initialTree, depth, minGameCount) {
    setBuildingInProgress(true);
    setProcessedGames(0);
    
    // Only make a deep copy here at the beginning, not for every update
    setWorkingTreeData({...initialTree});
    
    // Process games in chunks to allow UI updates
    const chunkSize = 10;
    let processedTreeCopy = {...initialTree};
    let processed = 0;
    
    const processChunk = (startIdx) => {
      const endIdx = Math.min(startIdx + chunkSize, gamesToProcess.length);
      const gamesChunk = gamesToProcess.slice(startIdx, endIdx);
      
      // Process this chunk
      processedTreeCopy = incrementalBuildTree(processedTreeCopy, gamesChunk, depth);
      processed += gamesChunk.length;
      setProcessedGames(processed);
      
      // Update the working tree data periodically to show progress
      if (processed % 50 === 0 || endIdx >= gamesToProcess.length) {
        // Use a shallow copy for the top level and only copy modified nodes
        setWorkingTreeData({...processedTreeCopy});
        
        // Update current selection if we're viewing the tree being built
        if (selectedNode) {
          // Try to find the corresponding node in the updated tree
          const currentPath = findPathInTree(processedTreeCopy, selectedNode.fen);
          if (currentPath.length > 0) {
            const updatedNode = currentPath[currentPath.length - 1].node;
            setSelectedNode(updatedNode);
            setRelatedGames(updatedNode.games || []);
          }
        }
      }
      
      // If there are more games to process, schedule next chunk
      if (endIdx < gamesToProcess.length) {
        setTimeout(() => processChunk(endIdx), 5);
      } else {
        // Finalize tree
        const prunedTree = pruneTree({...processedTreeCopy}, minGameCount);
        setTreeData(prunedTree);
        setWorkingTreeData(null);
        
        // Find and select the equivalent node in the pruned tree
        if (selectedNode) {
          const finalPath = findPathInTree(prunedTree, selectedNode.fen);
          if (finalPath.length > 0) {
            const finalNode = finalPath[finalPath.length - 1].node;
            setSelectedNode(finalNode);
            setCurrentPosition(finalNode.fen);
            setRelatedGames(finalNode.games || []);
            setPath(finalPath);
          } else {
            // Fallback to root if node was pruned
            setSelectedNode(prunedTree);
            setCurrentPosition(prunedTree.fen);
            setRelatedGames(prunedTree.games || []);
            setPath([{ name: 'Initial Position', node: prunedTree }]);
          }
        } else {
          // Select the root node if nothing is selected
          setSelectedNode(prunedTree);
          setCurrentPosition(prunedTree.fen);
          setRelatedGames(prunedTree.games || []);
          setPath([{ name: 'Initial Position', node: prunedTree }]);
        }
        
        setBuildingInProgress(false);
      }
    };
    
    // Start processing
    processChunk(0);
  }
  
  // Find a node's path in the tree by FEN position
  function findPathInTree(tree, targetFen, currentPath = []) {
    if (!tree) return [];
    
    // Start with current node
    const path = [...currentPath, { name: tree.move, node: tree }];
    
    // Check if this is the node we're looking for
    if (tree.fen === targetFen) {
      return path;
    }
    
    // Check all children
    for (const key in tree.children) {
      const childPath = findPathInTree(tree.children[key], targetFen, path);
      if (childPath.length > 0) {
        return childPath;
      }
    }
    
    return [];
  }
  
  // Handle rebuild button click
  function handleRebuild() {
    if (games.length > 0) {
      // Create a placeholder tree with the root node
      const initialTree = {
        fen: new Chess().fen(),
        move: 'Initial Position',
        children: {},
        games: [],
        frequency: games.length
      };
      
      // Start building in background
      startTreeBuilding(games, initialTree, maxDepth, minGames);
    }
  }
  
  // Handle move selection
  function handleMoveSelect(moveKey) {
    //const currentTree = treeData || workingTreeData;
    if (selectedNode && selectedNode.children[moveKey]) {
      const newNode = selectedNode.children[moveKey];
      const newPath = [...path, { name: newNode.move, node: newNode }];
      setSelectedNode(newNode);
      setCurrentPosition(newNode.fen);
      setRelatedGames(newNode.games || []);
      setPath(newPath);
    }
  }
  
  // Navigate to a node in the path
  function navigateToPathNode(index) {
    if (path[index]) {
      const node = path[index].node;
      const newPath = path.slice(0, index + 1);
      setSelectedNode(node);
      setCurrentPosition(node.fen);
      setRelatedGames(node.games || []);
      setPath(newPath);
    }
  }
  
  // Undo the last move
  function handleUndo() {
    if (path.length > 1) {
      const newPath = path.slice(0, -1);
      const lastNode = newPath[newPath.length - 1].node;
      setSelectedNode(lastNode);
      setCurrentPosition(lastNode.fen);
      setRelatedGames(lastNode.games || []);
      setPath(newPath);
    }
  }
  
  const displayTree = useMemo(() => {
    return treeData || workingTreeData;
  }, [treeData, workingTreeData]);
  
  return (
    <div className="chess-variation-tree">
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Chess Variation Tree Explorer</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : displayTree ? (
            <>
              <TreeControls 
                maxDepth={maxDepth}
                minGames={minGames}
                onChange={handleControlsChange}
                onApply={handleApplyParameters}
                onRebuild={handleRebuild}
                buildingInProgress={buildingInProgress}
                processedGames={processedGames}
                totalGames={games.length}
              />
              <div className="row">
                <div className="col-md-6">
                  <ChessboardDisplay
                    position={currentPosition}
                    path={path}
                    onPathNodeClick={navigateToPathNode}
                    gamesCount={selectedNode ? selectedNode.frequency : 0}
                    onUndo={handleUndo}
                  />
                  <MovesPanel
                    selectedNode={selectedNode}
                    onMoveSelect={handleMoveSelect}
                    buildingInProgress={buildingInProgress}
                  />
                </div>
                <div className="col-md-6">
                  <RelatedGames 
                    games={relatedGames} 
                    buildingInProgress={buildingInProgress}
                    processedGames={processedGames}
                    totalGames={games.length}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="alert alert-warning">
              No games found in database. Please fetch games first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function incrementalBuildTree(existingTree, gamesChunk, maxDepth) {
  // Create a shallow copy of the tree to avoid mutating the original
  const tree = {...existingTree};
  
  // Process each game to build the tree
  gamesChunk.forEach(game => {
    if (!game.pgn) return;
    
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      const moves = chess.history({ verbose: true });
      
      // Reset for each game
      const currentChess = new Chess();
      let currentNode = tree;
      
      // Add the current game to the root's games if not already present
      if (!tree.games) {
        tree.games = [];
      }
      
      if (!tree.games.some(g => g.id === game.id)) {
        tree.games.push({
          id: game.id,
          white: game.white,
          black: game.black,
          result: game.result,
          date: game.date,
          url: game.url,
          whiteElo: game.whiteElo,
          blackElo: game.blackElo
        });
      }
      
      // Process each move up to maxDepth
      for (let i = 0; i < moves.length && i < maxDepth; i++) {
        const move = moves[i];
        // Create a unique move key
        const moveKey = `${move.from}${move.to}${move.promotion || ''}`;
        
        // Make the move
        currentChess.move({ from: move.from, to: move.to, promotion: move.promotion });
        const fen = currentChess.fen();
        
        // If this move hasn't been seen yet at this position, create a new node
        if (!currentNode.children) {
          currentNode.children = {};
        }
        
        if (!currentNode.children[moveKey]) {
          currentNode.children[moveKey] = {
            fen: fen,
            move: move.san,
            moveObj: move,
            children: {},
            games: [],
            frequency: 0
          };
        }
        
        // Move to the next node
        currentNode = currentNode.children[moveKey];
        
        // Increment frequency and add the game to this node if not already present
        currentNode.frequency = (currentNode.frequency || 0) + 1;
        if (!currentNode.games) {
          currentNode.games = [];
        }
        
        if (!currentNode.games.some(g => g.id === game.id)) {
          currentNode.games.push({
            id: game.id,
            white: game.white,
            black: game.black,
            result: game.result,
            date: game.date,
            url: game.url,
            whiteElo: game.whiteElo,
            blackElo: game.blackElo
          });
        }
      }
    } catch (error) {
      console.error('Error processing game PGN:', error, game.id);
    }
  });
  
  return tree;
}

// Function to prune the tree based on minimum games criterion - optimize for better performance
function pruneTree(node, minGames) {
  if (!node) return node;
  
  // Create a shallow copy of the node
  const prunedNode = {...node};
  
  if (prunedNode.children) {
    // Create a shallow copy of the children object
    prunedNode.children = {...prunedNode.children};
    
    Object.keys(prunedNode.children).forEach(key => {
      const child = prunedNode.children[key];
      
      if (child.frequency < minGames) {
        delete prunedNode.children[key];
      } else {
        prunedNode.children[key] = pruneTree(child, minGames);
      }
    });
  }
  
  return prunedNode;
}

export default ChessVariationTree;