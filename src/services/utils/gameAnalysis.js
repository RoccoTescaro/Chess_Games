// gameAnalysis.js - Game analysis utilities

export function extractGameInfo(game) {
    try {
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
        try {
          enhancedGame.dateObject = new Date(game.date);
          enhancedGame.date = enhancedGame.dateObject.toISOString().split('T')[0];
        } catch (dateError) {
          console.warn("Error formatting date:", dateError);
          // Keep the original date if parsing fails
        }
      }
      
      return enhancedGame;
    } catch (error) {
      console.error("Error in extractGameInfo:", error);
      return game; // Return the original game data if processing fails
    }
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
  
  export function identifyWeakSpots(games, moveLimit = 15, accuracyThreshold = 0.8) {
    // Implementation for identifying weak spots in openings
    // This would analyze the first 'moveLimit' moves of each game
    // and identify positions where the player's move was below the accuracy threshold
    
    const weakSpots = [];
    
    // Process each game
    games.forEach(game => {
      // Analysis logic would go here
      // This is a placeholder for the actual implementation
    });
    
    return weakSpots;
  }
  
  export function createTrainingSession(weakSpots) {
    // Implementation for creating a training session based on identified weak spots
    
    return {
      positions: weakSpots.map(spot => ({
        fen: spot.fen,
        correctMoves: spot.bestMoves,
        // Other training data
      })),
      currentIndex: 0,
      completed: false
    };
  }