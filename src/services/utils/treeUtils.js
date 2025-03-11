// treeUtils.js - Tree building and manipulation utilities with Elo support
import { Chess } from 'chess.js';

// Build the variation tree from games
export function buildVariationTree(games, maxDepth = 10, minGames = 2) {
  if (!games || !games.length) return null;
  
  // Create the root node (starting position)
  const root = {
    fen: new Chess().fen(),
    move: 'Initial Position',
    children: {},
    games: [],
    frequency: games.length
  };
  
  // Process each game to build the tree
  games.forEach(game => {
    if (!game.pgn) return;
    
    try {
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
  
  // Prune the tree to remove variations with too few games
  pruneTree(root, minGames);
  
  return root;
}

// Remove branches that have fewer games than minGames
function pruneTree(node, minGames) {
  if (!node) return;
  
  Object.keys(node.children).forEach(key => {
    const child = node.children[key];
    
    if (child.frequency < minGames) {
      delete node.children[key];
    } else {
      pruneTree(child, minGames);
    }
  });
}