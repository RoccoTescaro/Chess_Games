// db.js - Database management
import { openDB } from 'idb';

const DB_NAME = 'chess-games-db';
const DB_VERSION = 1;
const GAMES_STORE = 'games';

export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const gamesStore = db.createObjectStore(GAMES_STORE, { keyPath: 'id' });
      
      // Create indexes for efficient querying
      gamesStore.createIndex('date', 'date');
      gamesStore.createIndex('source', 'source');
      gamesStore.createIndex('account', 'account');
      gamesStore.createIndex('timeControl', 'timeControl');
      gamesStore.createIndex('opening', 'opening');
      gamesStore.createIndex('whiteElo', 'whiteElo');
      gamesStore.createIndex('blackElo', 'blackElo');
      gamesStore.createIndex('result', 'result');
    }
  });

  return db;
}

export async function saveGames(games, progressCallback) {
    const db = await initDB();
    
    // Process and save games in batches to avoid UI blocking
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < games.length; i += BATCH_SIZE) {
      // Create a new transaction for each batch
      const tx = db.transaction(GAMES_STORE, 'readwrite');
      const store = tx.store;
      
      const batch = games.slice(i, i + BATCH_SIZE);
      for (const game of batch) {
        store.put(game);
      }
      
      // Wait for this transaction to complete before starting the next one
      await tx.done;
      
      // Calculate and report progress
      const progress = Math.min(100, Math.round((i + BATCH_SIZE) / games.length * 100));
      if (progressCallback) {
        progressCallback(progress);
      }
      
      // Small delay to let UI breathe
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return true;
}

export async function getGames(filters = {}) {
  const db = await initDB();
  
  // If we have specific filters that match our indexes, use them
  if (filters.date) {
    return db.getAllFromIndex(GAMES_STORE, 'date', filters.date);
  } else if (filters.account) {
    return db.getAllFromIndex(GAMES_STORE, 'account', filters.account);
  } else if (filters.timeControl) {
    return db.getAllFromIndex(GAMES_STORE, 'timeControl', filters.timeControl);
  }
  
  // For more complex filters, get all and filter in memory
  const allGames = await db.getAll(GAMES_STORE);
  
  return allGames.filter(game => {
    let match = true;
    
    // Apply all provided filters
    Object.keys(filters).forEach(key => {
      if (game[key] !== filters[key]) {
        match = false;
      }
    });
    
    return match;
  });
}

export async function clearGames() {
  const db = await initDB();
  return db.clear(GAMES_STORE);
}

export async function getGameStats(upToMove = null) {
  const db = await initDB();
  const games = await db.getAll(GAMES_STORE);
  
  // Basic stats
  const stats = {
    totalGames: games.length,
    resultDistribution: {
      wins: games.filter(g => g.result === 'Win').length,
      losses: games.filter(g => g.result === 'Loss').length,
      draws: games.filter(g => g.result === 'Draw').length
    },
    openingFrequency: {},
    timeControlDistribution: {},
  };
  
  // Calculate more complex stats
  games.forEach(game => {
    // Count openings
    if (game.opening) {
      stats.openingFrequency[game.opening] = (stats.openingFrequency[game.opening] || 0) + 1;
    }
    
    // Count time controls
    if (game.timeControl) {
      stats.timeControlDistribution[game.timeControl] = 
        (stats.timeControlDistribution[game.timeControl] || 0) + 1;
    }
  });
  
  return stats;
}

// Game processing functions

export function extractGameInfo(game) {
  // Extract opening information and Elo from PGN
  const enhancedGame = { ...game };
  
  if (game.pgn) {
    // Extract openings from PGN headers
    const openingMatch = game.pgn.match(/\[ECO "[A-Z]\d+"\]/);
    if (openingMatch) {
      enhancedGame.opening = openingMatch[0].split('"')[1];
    }
    
    const openingNameMatch = game.pgn.match(/\[Opening "(.+?)"\]/);
    if (openingNameMatch) {
      enhancedGame.openingName = openingNameMatch[1];
    }
    
    // Extract Elo ratings
    const whiteEloMatch = game.pgn.match(/\[WhiteElo "(\d+)"\]/);
    if (whiteEloMatch) {
      enhancedGame.whiteElo = parseInt(whiteEloMatch[1]);
    }
    
    const blackEloMatch = game.pgn.match(/\[BlackElo "(\d+)"\]/);
    if (blackEloMatch) {
      enhancedGame.blackElo = parseInt(blackEloMatch[1]);
    }
  }
  
  // Ensure date is in a consistent format for indexing
  if (game.date) {
    enhancedGame.dateObject = new Date(game.date);
    enhancedGame.date = enhancedGame.dateObject.toISOString().split('T')[0];
  }
  
  return enhancedGame;
}

export function analyzeGameToMove(pgn, moveNumber) {
  // This is a placeholder for future implementation
  // Will analyze the game up to the specified move
  // For now, just return the move number to set up the structure
  return {
    moveNumber,
    position: "Placeholder for FEN position at move " + moveNumber,
    evaluation: 0, // Placeholder
    // Other analysis data will go here
  };
}