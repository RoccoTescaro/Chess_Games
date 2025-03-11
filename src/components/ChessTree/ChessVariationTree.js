// ChessVariationTree.js - Main component with Undo functionality
import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getGames } from '../../services/db/gameStorage';
import TreeControls from './TreeControls';
import ChessboardDisplay from './ChessboardDisplay';
import MovesPanel from './MovesPanel';
import RelatedGames from './RelatedGames';
import { buildVariationTree } from '../../services/utils/treeUtils';

const ChessVariationTree = () => {
  const [games, setGames] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildingInProgress, setBuildingInProgress] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(new Chess().fen());
  const [relatedGames, setRelatedGames] = useState([]);
  const [path, setPath] = useState([]);
  const [maxDepth, setMaxDepth] = useState(10);
  const [minGames, setMinGames] = useState(2);
  const [processedGames, setProcessedGames] = useState(0);

  // Load games and build tree on component mount
  useEffect(() => {
    async function loadGamesAndBuildTree() {
      try {
        setLoading(true);
        // Get games from the database
        const loadedGames = await getGames();
        setGames(loadedGames);
        
        // Build tree from loaded games
        const tree = buildVariationTree(loadedGames, maxDepth, minGames);
        setTreeData(tree);
        
        // Default selection is the root node
        if (tree) {
          setSelectedNode(tree);
          setCurrentPosition(tree.fen);
          setRelatedGames(tree.games || []);
          setPath([{ name: 'Initial Position', node: tree }]);
        }
      } catch (error) {
        console.error('Error loading games:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadGamesAndBuildTree();
  }, [maxDepth, minGames]);

  // Handle node selection in the tree
  function handleNodeSelect(node, nodePath) {
    setSelectedNode(node);
    setCurrentPosition(node.fen);
    setRelatedGames(node.games || []);
    setPath(nodePath);
  }
  
  // Handle tree control changes
  function handleControlsChange(newMaxDepth, newMinGames) {
    setMaxDepth(newMaxDepth);
    setMinGames(newMinGames);
  }
  
  // Handle rebuild button click with parallel processing
  function handleRebuild() {
    setBuildingInProgress(true);
    setProcessedGames(0);
    
    // Create a placeholder tree with the root node
    const initialTree = {
      fen: new Chess().fen(),
      move: 'Initial Position',
      children: {},
      games: [],
      frequency: games.length
    };
    
    setTreeData(initialTree);
    setSelectedNode(initialTree);
    setCurrentPosition(initialTree.fen);
    setPath([{ name: 'Initial Position', node: initialTree }]);
    
    // Process games in chunks to allow UI updates
    const chunkSize = 10;
    let processedTree = { ...initialTree };
    let processed = 0;
    
    const processChunk = (startIdx) => {
      const endIdx = Math.min(startIdx + chunkSize, games.length);
      const gamesChunk = games.slice(startIdx, endIdx);
      
      // Process this chunk
      processedTree = incrementalBuildTree(processedTree, gamesChunk, maxDepth);
      processed += gamesChunk.length;
      setProcessedGames(processed);
      
      // Update the tree data
      setTreeData({ ...processedTree });
      
      // If there are more games to process, schedule next chunk
      if (endIdx < games.length) {
        setTimeout(() => processChunk(endIdx), 10);
      } else {
        // Finalize tree
        const prunedTree = pruneTree({ ...processedTree }, minGames);
        setTreeData(prunedTree);
        setSelectedNode(prunedTree);
        setCurrentPosition(prunedTree.fen);
        setRelatedGames(prunedTree.games || []);
        setPath([{ name: 'Initial Position', node: prunedTree }]);
        setBuildingInProgress(false);
      }
    };
    
    // Start processing
    processChunk(0);
  }
  
  // Handle move selection
  function handleMoveSelect(moveKey) {
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
  
  return (
    <div className="chess-variation-tree">
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Chess Variation Tree Explorer</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : treeData ? (
            <>
              <TreeControls 
                maxDepth={maxDepth}
                minGames={minGames}
                onChange={handleControlsChange}
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
                  />
                </div>
                <div className="col-md-6">
                  <RelatedGames games={relatedGames} />
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

// Function for incremental tree building - processes a subset of games and integrates into existing tree
function incrementalBuildTree(existingTree, gamesChunk, maxDepth) {
  const tree = { ...existingTree };
  
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
      
      // Add the current game to the root's games
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
      
      // Process each move up to maxDepth
      for (let i = 0; i < moves.length && i < maxDepth; i++) {
        const move = moves[i];
        // Create a unique move key
        const moveKey = `${move.from}${move.to}${move.promotion || ''}`;
        
        // Make the move
        currentChess.move({ from: move.from, to: move.to, promotion: move.promotion });
        const fen = currentChess.fen();
        
        // If this move hasn't been seen yet at this position, create a new node
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
        
        // Increment frequency and add the game to this node
        currentNode.frequency = (currentNode.frequency || 0) + 1;
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
    } catch (error) {
      console.error('Error processing game PGN:', error, game.id);
    }
  });
  
  return tree;
}

// Clone of the pruneTree function for the parallel building process
function pruneTree(node, minGames) {
  if (!node) return node;
  
  const prunedNode = { ...node };
  
  Object.keys(prunedNode.children).forEach(key => {
    const child = prunedNode.children[key];
    
    if (child.frequency < minGames) {
      delete prunedNode.children[key];
    } else {
      prunedNode.children[key] = pruneTree(child, minGames);
    }
  });
  
  return prunedNode;
}

export default ChessVariationTree;