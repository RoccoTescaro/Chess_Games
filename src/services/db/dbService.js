// dbService.js - Core database operations
import { openDB } from 'idb';

const DB_NAME = 'chess-games-db';
const DB_VERSION = 1;
const GAMES_STORE = 'games';

export async function initDB() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Check if the store already exists to avoid errors on version change
        if (!db.objectStoreNames.contains(GAMES_STORE)) {
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
          
          console.log("Database schema created successfully");
        }
      }
    });

    // Test database connection with a simple read operation
    await db.count(GAMES_STORE);
    console.log("Database connection verified");
    
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

export async function clearStore(storeName = GAMES_STORE) {
  try {
    const db = await initDB();
    await db.clear(storeName);
    console.log(`Store ${storeName} cleared successfully`);
    return true;
  } catch (error) {
    console.error(`Error clearing store ${storeName}:`, error);
    throw new Error(`Failed to clear store: ${error.message}`);
  }
}

// Export constants for use in other files
export const DB_CONSTANTS = {
  DB_NAME,
  DB_VERSION,
  GAMES_STORE
};