import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { Chess } from 'chess.js';
import { 
  serializeTree, 
  deserializeTree, 
  shouldRebuildTree 
} from '../../services/utils/treeUtils';
import { getGames } from '../../services/db/gameStorage';

const TREE_STORAGE_KEY = 'chessVariationTree';

const ChessTreeContext = createContext();

export const useChessTree = () => useContext(ChessTreeContext);

export const ChessTreeProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [workingTreeData, setWorkingTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildingInProgress, setBuildingInProgress] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(new Chess().fen());
  const [relatedGames, setRelatedGames] = useState([]);
  const [path, setPath] = useState([]);
  const [maxDepth, setMaxDepth] = useState(20);
  const [minGames, setMinGames] = useState(15);
  const [processedGames, setProcessedGames] = useState(0);
  const [treeMetadata, setTreeMetadata] = useState(null);

  // Load games and tree on context mount
  useEffect(() => {
    loadGamesAndTree();
  }, []);

  const loadGamesAndTree = async () => {
    try {
      setLoading(true);
      // Get games from the database
      const loadedGames = await getGames();
      setGames(loadedGames);
      
      // Try to load serialized tree from storage
      const savedData = localStorage.getItem(TREE_STORAGE_KEY);
      
      if (savedData) {
        try {
          console.log('Found saved tree, attempting to load it');
          const result = deserializeTree(savedData);
          
          if (result && result.tree) {
            // Check if we need to rebuild based on game count or parameters
            const rebuild = shouldRebuildTree(
              result.metadata, 
              loadedGames, 
              maxDepth, 
              minGames
            );
            
            if (rebuild) {
              console.log('Saved tree needs rebuilding due to changes in games or parameters');
              if (loadedGames.length > 0) {
                buildInitialTree(loadedGames);
              }
            } else {
              // Tree is still valid, use it
              console.log('Using saved tree from storage');
              setTreeData(result.tree);
              setTreeMetadata(result.metadata);
              setSelectedNode(result.tree);
              setCurrentPosition(result.tree.fen);
              setPath([{ name: 'Initial Position', node: result.tree }]);
            }
          } else {
            // Invalid tree data
            console.warn('Invalid tree data in storage');
            if (loadedGames.length > 0) {
              buildInitialTree(loadedGames);
            }
          }
        } catch (error) {
          console.error('Error loading saved tree:', error);
          // Fallback to building a new tree if loading fails
          if (loadedGames.length > 0) {
            buildInitialTree(loadedGames);
          }
        }
      } else if (loadedGames.length > 0) {
        // No saved tree, build a new one
        console.log('No saved tree found, building new tree');
        buildInitialTree(loadedGames);
      }
    } catch (error) {
      console.error('Error loading games or tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearTreeStorage = useCallback(() => {
    localStorage.removeItem(TREE_STORAGE_KEY);
    console.log('Tree storage cleared');
  }, []);

  const buildInitialTree = useCallback((loadedGames) => {
    setLoading(true);
    
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
  }, [maxDepth, minGames]);

  const saveTreeToStorage = useCallback((tree, metadata = {}) => {
    const completeMetadata = {
      ...metadata,
      gameCount: games.length,
      maxDepth: maxDepth,
      minGames: minGames,
      timestamp: Date.now()
    };
    
    try {
      const serializedData = serializeTree(tree, completeMetadata);
      localStorage.setItem(TREE_STORAGE_KEY, serializedData);
      console.log('Tree saved to storage with metadata:', completeMetadata);
      return true;
    } catch (error) {
      console.error('Error saving tree to storage:', error);
      return false;
    }
  }, [games.length, maxDepth, minGames]);

  const isNodeInTree = useCallback((node, tree) => {
    if (!node || !tree) return false;
    if (node === tree) return true;
    
    // Check all children
    for (const key in tree.children) {
      if (isNodeInTree(node, tree.children[key])) {
        return true;
      }
    }
    
    return false;
  }, []);

  const findPathInTree = useCallback((tree, targetFen, currentPath = []) => {
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
  }, []);

  // Incremental build tree function
  const incrementalBuildTree = useCallback((existingTree, gamesChunk, maxDepth) => {
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
  }, []);

  // Prune tree based on minimum games criterion
  const pruneTree = useCallback((node, minGames) => {
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
  }, []);

  const startTreeBuilding = useCallback((gamesToProcess, initialTree, depth, minGameCount) => {
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
        
        // Create metadata and save tree
        const newMetadata = {
          gameCount: gamesToProcess.length,
          maxDepth: depth,
          minGames: minGameCount,
          timestamp: Date.now()
        };
        setTreeMetadata(newMetadata);
        saveTreeToStorage(prunedTree, newMetadata);
        
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
  }, [incrementalBuildTree, findPathInTree, pruneTree, saveTreeToStorage, selectedNode]);

  const handleApplyParameters = useCallback((newMaxDepth, newMinGames) => {
    setMaxDepth(newMaxDepth);
    setMinGames(newMinGames);
    
    // Only rebuild if we have games
    if (games.length > 0) {
      // If the tree is already built, we can prune it directly for min games change
      if (treeData && newMaxDepth <= maxDepth && newMinGames !== minGames) {
        const prunedTree = pruneTree(JSON.parse(JSON.stringify(treeData)), newMinGames);
        setTreeData(prunedTree);
        
        // Update metadata
        const updatedMetadata = {
          ...treeMetadata,
          minGames: newMinGames,
          timestamp: Date.now()
        };
        setTreeMetadata(updatedMetadata);
        
        // Save the updated tree
        saveTreeToStorage(prunedTree, updatedMetadata);
        
        // If current selection would be pruned, go back to root
        if (!isNodeInTree(selectedNode, prunedTree)) {
          setSelectedNode(prunedTree);
          setCurrentPosition(prunedTree.fen);
          setRelatedGames(prunedTree.games || []);
          setPath([{ name: 'Initial Position', node: prunedTree }]);
        }
      } else {
        // For max depth changes or when a complete rebuild is needed
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
        
        // Start building the tree in background
        startTreeBuilding(games, initialTree, newMaxDepth, newMinGames);
      }
    }
  }, [games, treeData, maxDepth, minGames, treeMetadata, selectedNode, isNodeInTree, pruneTree, saveTreeToStorage, startTreeBuilding]);

}

