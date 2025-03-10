// App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import { 
  initDB, 
  saveGames, 
  getGames, 
  getGameStats, 
  extractGameInfo, 
  clearGames 
} from './db';

function App() {
  const [chessAccounts, setChessAccounts] = useState(['']);
  const [lichessAccounts, setLichessAccounts] = useState(['']);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [gamesPerAccount, setGamesPerAccount] = useState(250);
  const [storedGameCount, setStoredGameCount] = useState(0);
  const [analysisDepth, setAnalysisDepth] = useState(20); // Up to which move to analyze
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  // Initialize database on component mount
  useEffect(() => {
    async function setupDB() {
      await initDB();
      const storedGames = await getGames();
      setStoredGameCount(storedGames.length);
      setIsDbInitialized(true);
    }
    setupDB();
  }, []);

  // Handle adding a new account input field
  const addChessAccount = () => {
    setChessAccounts([...chessAccounts, '']);
  };

  const addLichessAccount = () => {
    setLichessAccounts([...lichessAccounts, '']);
  };

  // Handle updating account values
  const updateChessAccount = (index, value) => {
    const updatedAccounts = [...chessAccounts];
    updatedAccounts[index] = value;
    setChessAccounts(updatedAccounts);
  };

  const updateLichessAccount = (index, value) => {
    const updatedAccounts = [...lichessAccounts];
    updatedAccounts[index] = value;
    setLichessAccounts(updatedAccounts);
  };

  // Handle removing account input fields
  const removeChessAccount = (index) => {
    const updatedAccounts = [...chessAccounts];
    updatedAccounts.splice(index, 1);
    setChessAccounts(updatedAccounts.length ? updatedAccounts : ['']);
  };

  const removeLichessAccount = (index) => {
    const updatedAccounts = [...lichessAccounts];
    updatedAccounts.splice(index, 1);
    setLichessAccounts(updatedAccounts.length ? updatedAccounts : ['']);
  };

  async function fetchChessComGames(username) {
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
          
          // Extract additional info from PGN
          return extractGameInfo(formattedGame);
        });
        
        allGames = [...allGames, ...formattedGames];
        
        // Update progress
        processedArchives++;
        const archiveProgress = (processedArchives / archives.length) * 100;
        setProgress(prev => Math.max(prev, archiveProgress));
        
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

  function formatChessComTimeControl(timeControl) {
    const [initial, increment] = timeControl.split('+').map(Number);
    return increment?`${Math.floor(initial / 60)}+${increment}`:`${Math.floor(initial / 60)}`;
  }

  async function fetchLichessGames(username) {
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
        
        // Extract additional info from PGN
        return extractGameInfo(formattedGame);
      });
    } catch (error) {
      console.error(`Error fetching Lichess games for ${username}:`, error);
      throw error;
    }
  }

  function determineResult(result, username) {
    if (result === 'win') return 'Win';
    if (result === 'lose') return 'Loss';
    return 'Draw';
  }

  function determineLichessResult(game, username) {
    const playerColor = game.players.white.user?.name === username ? 'white' : 'black';
    const winner = game.winner;
    
    if (!winner) return 'Draw';
    if (winner === playerColor) return 'Win';
    return 'Loss';
  }

  async function handleFetchGames() {
    setError('');
    setLoading(true);
    setProgress(0);
    setGames([]);
    
    try {
      let allGames = [];
      let errors = [];
      
      // Filter out empty usernames
      const validChessAccounts = chessAccounts.filter(username => username.trim() !== '');
      const validLichessAccounts = lichessAccounts.filter(username => username.trim() !== '');
      
      // Fetch Chess.com games
      for (const username of validChessAccounts) {
        try {
          const chessGames = await fetchChessComGames(username);
          allGames = [...allGames, ...chessGames];
        } catch (error) {
          errors.push(`Chess.com (${username}): ${error.message}`);
        }
      }
      
      // Fetch Lichess games
      for (const username of validLichessAccounts) {
        try {
          const lichessGames = await fetchLichessGames(username);
          allGames = [...allGames, ...lichessGames];
        } catch (error) {
          errors.push(`Lichess (${username}): ${error.message}`);
        }
      }
      
      // Sort games by date (newest first)
      allGames.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Store in IndexedDB with progress updates
      await saveGames(allGames, (progressPct) => {
        setProgress(progressPct);
      });
      
      // Update counts
      setGames(allGames);
      setStoredGameCount(prev => prev + allGames.length);
      
      // If there were errors but we still got some games, show partial error
      if (errors.length > 0) {
        setError(`Some accounts couldn't be fetched: ${errors.join('; ')}`);
      }
    } catch (error) {
      setError(`Failed to fetch games: ${error.message}`);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }

  function downloadPGN() {
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess Game Analyzer</h1>
        {isDbInitialized && (
          <div className="db-status">
            {storedGameCount > 0 ? 
              `Database contains ${storedGameCount} games` : 
              'Database initialized (no games stored)'}
          </div>
        )}
      </header>
      
      <main className="App-main">
        <div className="input-container">
          <div className="platform-section">
            <h2>Chess.com Accounts</h2>
            {chessAccounts.map((account, index) => (
              <div key={`chess-${index}`} className="account-input">
                <input
                  type="text"
                  value={account}
                  onChange={(e) => updateChessAccount(index, e.target.value)}
                  placeholder="Enter Chess.com username"
                />
                <button 
                  className="remove-btn"
                  onClick={() => removeChessAccount(index)}
                  disabled={chessAccounts.length === 1 && account === ''}
                >
                  Remove
                </button>
              </div>
            ))}
            <button className="add-btn" onClick={addChessAccount}>
              Add Chess.com Account
            </button>
          </div>
          
          <div className="platform-section">
            <h2>Lichess Accounts</h2>
            {lichessAccounts.map((account, index) => (
              <div key={`lichess-${index}`} className="account-input">
                <input
                  type="text"
                  value={account}
                  onChange={(e) => updateLichessAccount(index, e.target.value)}
                  placeholder="Enter Lichess username"
                />
                <button 
                  className="remove-btn"
                  onClick={() => removeLichessAccount(index)}
                  disabled={lichessAccounts.length === 1 && account === ''}
                >
                  Remove
                </button>
              </div>
            ))}
            <button className="add-btn" onClick={addLichessAccount}>
              Add Lichess Account
            </button>
          </div>

          <div className="settings-row">
            <div className="games-per-account">
              <label htmlFor="gamesPerAccount">Games per Account:</label>
              <input
                type="number"
                id="gamesPerAccount"
                value={gamesPerAccount}
                onChange={(e) => setGamesPerAccount(Number(e.target.value))}
                placeholder="Enter number of games per account (-1 for all)"
                min="-1"
                className="form-control"
              />
            </div>
            
            <div className="analysis-depth">
              <label htmlFor="analysisDepth">Analyze up to move:</label>
              <input
                type="number"
                id="analysisDepth"
                value={analysisDepth}
                onChange={(e) => setAnalysisDepth(Number(e.target.value))}
                placeholder="Enter analysis depth"
                min="1"
                max="40"
                className="form-control"
              />
            </div>
          </div>
          
          <div className="button-row">
            <button 
              className="fetch-btn"
              onClick={handleFetchGames} 
              disabled={loading || (chessAccounts.every(a => a.trim() === '') && lichessAccounts.every(a => a.trim() === ''))}
            >
              {loading ? 'Loading...' : 'Fetch & Store Games'}
            </button>
            
            {/* We'll add more buttons here for analysis later */}
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {loading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">{Math.round(progress)}% complete</div>
          </div>
        )}
        
        {games.length > 0 && (
          <div className="results-container">
            <div className="results-header">
              <h2>Found {games.length} games</h2>
              <div className="action-buttons">
                <button onClick={downloadPGN}>Download as PGN</button>
                {/* Future analysis buttons will go here */}
              </div>
            </div>
            
            <table className="games-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>White (Elo)</th>
                  <th>Black (Elo)</th>
                  <th>Result</th>
                  <th>Time Control</th>
                  <th>Opening</th>
                  <th>Source</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {games.slice(0, 100).map(game => (
                  <tr key={game.id}>
                    <td>{game.date}</td>
                    <td>{game.account}</td>
                    <td>{game.white} ({game.whiteElo || 'N/A'})</td>
                    <td>{game.black} ({game.blackElo || 'N/A'})</td>
                    <td>{game.result}</td>
                    <td>{game.timeControl}</td>
                    <td>{game.openingName || 'Unknown'}</td>
                    <td>{game.source}</td>
                    <td>
                      <a href={game.url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {games.length > 100 && (
              <div className="table-note">Showing first 100 games. All {games.length} games are stored in the database.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;