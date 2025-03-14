// gameStorage.js - Game-specific database operations
import { initDB, DB_CONSTANTS } from './dbService';

const { GAMES_STORE } = DB_CONSTANTS;

export async function saveGames(games, progressCallback) {
  try {
    if (!games || games.length === 0) {
      console.warn("No games to save");
      return false;
    }
    
    const db = await initDB();
    console.log(`Starting to save ${games.length} games to database`);
    
    // Process and save games in batches to avoid UI blocking
    const BATCH_SIZE = 20; // Smaller batch size to prevent freezing
    
    let successCount = 0;
    
    for (let i = 0; i < games.length; i += BATCH_SIZE) {
      try {
        // Create a new transaction for each batch
        const tx = db.transaction(GAMES_STORE, 'readwrite');
        const store = tx.store;
        
        const batch = games.slice(i, i + BATCH_SIZE);
        
        // Use Promise.all to wait for all put operations to complete
        await Promise.all(batch.map(game => store.put(game)));
        
        // Wait for this transaction to complete
        await tx.done;
        
        successCount += batch.length;
        
        // Calculate and report progress
        const progress = Math.min(100, Math.round((i + BATCH_SIZE) / games.length * 100));
        if (progressCallback) {
          progressCallback(progress);
        }
        
        // Logging to help diagnose any issues
        if (i % 100 === 0 || i + BATCH_SIZE >= games.length) {
          console.log(`Saved ${successCount}/${games.length} games to database`);
        }
      } catch (batchError) {
        console.error(`Error saving batch starting at index ${i}:`, batchError);
        
        // Continue with the next batch despite errors
        if (progressCallback) {
          const progress = Math.min(100, Math.round((i + BATCH_SIZE) / games.length * 100));
          progressCallback(progress);
        }
      }
      
      // Small delay to let UI render and prevent freezing
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Successfully saved ${successCount}/${games.length} games to database`);
    return successCount > 0;
  } catch (error) {
    console.error("Error in saveGames function:", error);
    throw new Error(`Failed to save games: ${error.message}`);
  }
}

export async function getGames(filters = {}) {
  try {
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
    console.log(`Retrieved ${allGames.length} games from database`);
    
    if (Object.keys(filters).length === 0) {
      return allGames;
    }
    
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
  } catch (error) {
    console.error("Error getting games from database:", error);
    return []; // Return empty array instead of failing
  }
}

export async function clearGames() {
  try {
    const db = await initDB();
    await db.clear(GAMES_STORE);
    console.log("Database cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing database:", error);
    throw new Error(`Failed to clear database: ${error.message}`);
  }
}

export async function getGameStats(upToMove = null) {
  try {
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
  } catch (error) {
    console.error("Error getting game stats:", error);
    return {
      totalGames: 0,
      resultDistribution: { wins: 0, losses: 0, draws: 0 },
      openingFrequency: {},
      timeControlDistribution: {}
    };
  }
}