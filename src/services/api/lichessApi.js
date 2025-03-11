// src/services/api/lichessApi.js
export async function fetchLichessGames(username, gamesPerAccount) 
{
    try {
      const maxGames = gamesPerAccount === -1 ? 10000 : gamesPerAccount; // Set a high limit if fetching all games
      const response = await fetch(`https://lichess.org/api/games/user/${username}?max=${maxGames}&pgnInJson=true`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Lichess API error for ${username}: ${response.status}`);
      }
      
      const text = await response.text();
      // Lichess returns ndjson (one JSON object per line)
      const games = text.trim().split('\n').map(line => JSON.parse(line));
      
      return games.map(game => {
        const formattedGame = {
          id: `${game.id}-${username}`, // Add username to ensure unique IDs
          white: game.players.white.user?.name || 'Anonymous',
          black: game.players.black.user?.name || 'Anonymous',
          result: determineLichessResult(game, username),
          date: new Date(game.createdAt).toLocaleDateString(),
          url: `https://lichess.org/${game.id}`,
          pgn: game.pgn,
          source: 'lichess',
          account: username,
          timeControl: `${Math.floor(game.clock?.initial / 60 || 0)}+${game.clock?.increment || 0}`,
          whiteElo: game.players.white.rating,
          blackElo: game.players.black.rating
        };
        
        return formattedGame;
      });
    } catch (error) {
      console.error(`Error fetching Lichess games for ${username}:`, error);
      throw error;
    }
}
  
function determineLichessResult(game, username) 
{
    const playerColor = game.players.white.user?.name === username ? 'white' : 'black';
    const winner = game.winner;

    if (!winner) return 'Draw';
    if (winner === playerColor) return 'Win';
    return 'Loss';
}