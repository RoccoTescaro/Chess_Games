// src/services/api/chessComApi.js
export async function fetchChessComGames(username, gamesPerAccount, progressCallback) 
{
    try {
        // Chess.com API requires getting archives first, then fetching games from each archive
        const archivesResponse = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
        if (!archivesResponse.ok) {
        throw new Error(`Chess.com API error for ${username}: ${archivesResponse.status}`);
        }
        
        const archivesData = await archivesResponse.json();
        const archives = archivesData.archives;
        
        let allGames = [];
        let processedArchives = 0;
        
        for (const archiveUrl of archives.reverse()) {
        const gamesResponse = await fetch(archiveUrl);
        if (!gamesResponse.ok) {
            throw new Error(`Failed to fetch archive: ${gamesResponse.status}`);
        }
        const gamesData = await gamesResponse.json();
        
        const formattedGames = gamesData.games.map(game => {
            const formattedGame = {
            id: `${game.url}-${username}`, // Add username to ensure unique IDs
            white: game.white.username,
            black: game.black.username,
            result: determineResult(game.white.result, username),
            date: new Date(game.end_time * 1000).toLocaleDateString(),
            url: game.url,
            pgn: game.pgn,
            source: 'chess.com',
            account: username,
            timeControl: formatChessComTimeControl(game.time_control),
            whiteElo: game.white.rating,
            blackElo: game.black.rating
            };
            
            return formattedGame;
        });
        
        allGames = [...allGames, ...formattedGames];
        
        // Update progress
        processedArchives++;
        const archiveProgress = (processedArchives / archives.length) * 100;
        if (progressCallback) {
            progressCallback(prev => Math.max(prev, archiveProgress));
        }
        
        if (gamesPerAccount !== -1 && allGames.length >= gamesPerAccount) {
            allGames = allGames.slice(0, gamesPerAccount);
            break;
        }
        }
        
        return allGames;
    } catch (error) {
        console.error(`Error fetching Chess.com games for ${username}:`, error);
        throw error;
    }
}
  
function formatChessComTimeControl(timeControl) 
{
    const [initial, increment] = timeControl.split('+').map(Number);
    return increment ? `${Math.floor(initial / 60)}+${increment}` : `${Math.floor(initial / 60)}`;
}

function determineResult(result, username) 
{
    if (result === 'win') return 'Win';
    if (result === 'lose') return 'Loss';
    return 'Draw';
}