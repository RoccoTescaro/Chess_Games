// src/services/utils/pgn.js
export function extractGameInfo(game) 
{
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
  
export function downloadPGN(games) 
{
    if (games.length === 0) return;
    
    const pgnContent = games.map(game => game.pgn).join('\n\n');
    const blob = new Blob([pgnContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_chess_games.pgn';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
  
export function analyzeGameToMove(pgn, moveNumber) 
{
    // This is a placeholder for future implementation
    // Will analyze the game up to the specified move
    return {
      moveNumber,
      position: "Placeholder for FEN position at move " + moveNumber,
      evaluation: 0, // Placeholder
    };
}