// treeUtils.js - Tree building and manipulation utilities with optimized structure
import { Chess } from 'chess.js';

// Build the variation tree from games with optimized data structure
export function buildVariationTree(games, maxDepth = 10, minGames = 2) {
  if (!games || !games.length) return null;
  
  // Create the root node (starting position)
  const root = {
    fen: new Chess().fen(),
    move: 'Initial Position',
    children: {},
    games: [],
    frequency: 0,
    id: 'root'  // Add an ID to make node identification easier
  };
  
  // Create game lookup by ID to avoid duplicates
  const gameMap = new Map();
  
  // Process each game to build the tree
  games.forEach(game => {
    if (!game.pgn) return;
    
    try {
      // Skip if we've already processed this game ID
      if (gameMap.has(game.id)) return;
      gameMap.set(game.id, true);
      
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      const moves = chess.history({ verbose: true });
      
      // Reset for each game
      const currentChess = new Chess();
      let currentNode = root;
      
      // Add the current game to the root's games
      root.games.push({
        id: game.id,
        white: game.white,
        black: game.black,
        result: game.result,
        date: game.date,
        url: game.url,
        whiteElo: game.whiteElo,
        blackElo: game.blackElo
      });
      
      // Increment root frequency
      root.frequency++;
      
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
          const nodeId = `${currentNode.id}_${moveKey}`;
          currentNode.children[moveKey] = {
            fen: fen,
            move: move.san,
            moveObj: {
              from: move.from,
              to: move.to,
              promotion: move.promotion,
              san: move.san,
              color: move.color
            },
            children: {},
            games: [],
            frequency: 0,
            id: nodeId
          };
        }
        
        // Move to the next node
        currentNode = currentNode.children[moveKey];
        
        // Increment frequency and add the game to this node
        currentNode.frequency++;
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
  
  // Prune the tree to remove variations with too few games
  pruneTreeNodes(root, minGames);
  
  return root;
}

// Remove branches that have fewer games than minGames
export function pruneTreeNodes(node, minGames) {
  if (!node) return;
  
  Object.keys(node.children).forEach(key => {
    const child = node.children[key];
    
    if (child.frequency < minGames) {
      delete node.children[key];
    } else {
      pruneTreeNodes(child, minGames);
    }
  });
}

// Enhanced function to serialize tree with metadata
export function serializeTree(tree, metadata = {}) {
  const dataToSerialize = {
    tree,
    metadata: {
      ...metadata,
      timestamp: Date.now(),
      version: '1.0'
    }
  };
  return JSON.stringify(dataToSerialize);
}

// Enhanced function to deserialize tree with metadata
export function deserializeTree(serializedData) {
  if (!serializedData) return null;
  
  try {
    const parsed = JSON.parse(serializedData);
    
    // Check if this is the new format with metadata
    if (parsed.tree && parsed.metadata) {
      return {
        tree: parsed.tree,
        metadata: parsed.metadata
      };
    }
    
    // Handle legacy format (direct tree)
    return { 
      tree: parsed, 
      metadata: { 
        timestamp: Date.now(), 
        version: '0.9',
        isLegacyFormat: true 
      } 
    };
  } catch (error) {
    console.error('Error deserializing tree:', error);
    return null;
  }
}

// Function to merge two trees (for incremental updates)
export function mergeTrees(baseTree, newTree) {
  if (!baseTree) return newTree;
  if (!newTree) return baseTree;
  
  const result = JSON.parse(JSON.stringify(baseTree));
  
  // Merge game arrays at root
  if (newTree.games && newTree.games.length > 0) {
    const existingGameIds = new Set(result.games.map(g => g.id));
    newTree.games.forEach(game => {
      if (!existingGameIds.has(game.id)) {
        result.games.push(game);
        result.frequency++;
      }
    });
  }
  
  // Recursively merge children
  Object.keys(newTree.children).forEach(key => {
    if (!result.children[key]) {
      // New branch - copy it entirely
      result.children[key] = JSON.parse(JSON.stringify(newTree.children[key]));
    } else {
      // Merge existing branch
      result.children[key] = mergeTrees(result.children[key], newTree.children[key]);
    }
  });
  
  return result;
}

// New function to check if tree should be rebuilt based on metadata
export function shouldRebuildTree(metadata, currentGames, currentMaxDepth, currentMinGames) {
  if (!metadata) return true;
  
  // Tree should be rebuilt if:
  // 1. Game count has changed significantly
  // 2. Parameters have changed
  // 3. It's an old version with incomplete metadata
  
  const gameCountDiff = Math.abs((metadata.gameCount || 0) - currentGames.length);
  const gameCountChanged = gameCountDiff > 0; // Any change in game count triggers rebuild
  

  //should handle pruning if params Changed worstly
  const paramsChanged = 
    metadata.maxDepth < currentMaxDepth || 
    metadata.minGames > currentMinGames;
  
  const isIncompleteMetadata = 
    !metadata.hasOwnProperty('gameCount') || 
    !metadata.hasOwnProperty('maxDepth') || 
    !metadata.hasOwnProperty('minGames');
    
  return gameCountChanged || paramsChanged || isIncompleteMetadata;
}