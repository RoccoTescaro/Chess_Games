// App.js
import React, { useState, useEffect } from 'react';
import './bootstrap/bootstrap.min.css';
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
  const [showLoadingBar, setShowLoadingBar] = useState(false);

  // Initialize database on component mount
  useEffect(() => {
    async function setupDB() {
      try {
        await initDB();
        const storedGames = await getGames();
        setStoredGameCount(storedGames.length);
        setIsDbInitialized(true);
        console.log("Database initialized successfully");
      } catch (error) {
        console.error("Error initializing database:", error);
        setError("Failed to initialize database. Please refresh the page.");
      }
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
    return increment ? `${Math.floor(initial / 60)}+${increment}` : `${Math.floor(initial / 60)}`;
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
    setShowLoadingBar(true);
    setGames([]);
    
    try {
      let allGames = [];
      let errors = [];
      
      // Filter out empty usernames
      const validChessAccounts = chessAccounts.filter(username => username.trim() !== '');
      const validLichessAccounts = lichessAccounts.filter(username => username.trim() !== '');
      
      if (validChessAccounts.length === 0 && validLichessAccounts.length === 0) {
        throw new Error("Please enter at least one Chess.com or Lichess username");
      }
      
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
      if (allGames.length > 0) {
        setProgress(50); // Set to 50% before saving to database
        console.log(`Saving ${allGames.length} games to database...`);
        
        await saveGames(allGames, (progressPct) => {
          // Map the database saving progress from 50% to 100%
          setProgress(50 + (progressPct / 2));
        });
        
        console.log("Games saved successfully");
        
        // Update counts
        setGames(allGames);
        setStoredGameCount(prev => prev + allGames.length);
      } else {
        throw new Error("No games found for the provided accounts");
      }
      
      // If there were errors but we still got some games, show partial error
      if (errors.length > 0) {
        setError(`Some accounts couldn't be fetched: ${errors.join('; ')}`);
      }
    } catch (error) {
      setError(`Failed to fetch games: ${error.message}`);
    } finally {
      setLoading(false);
      setProgress(100);
      // Keep the loading bar visible for a short time to show completion
      setTimeout(() => {
        setShowLoadingBar(false);
      }, 1500);
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

  async function handleClearDatabase() {
    if (window.confirm("Are you sure you want to clear the database? This will delete all stored games.")) {
      try {
        await clearGames();
        setStoredGameCount(0);
        setGames([]);
        alert("Database cleared successfully");
      } catch (error) {
        setError(`Failed to clear database: ${error.message}`);
      }
    }
  }

  return (
    <div className="container py-4">
      <header className="pb-3 mb-4 border-bottom">
        <h1 className="fw-bold">Chess Game Analyzer</h1>
        {isDbInitialized && (
          <div className="text-muted small">
            {storedGameCount > 0 ? 
              `Database contains ${storedGameCount} games` : 
              'Database initialized (no games stored)'}
          </div>
        )}
      </header>
      
      <main>
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">Account Settings</h5>
          </div>
          <div className="card-body">
            {/* Chess.com Accounts */}
            <div className="mb-4">
              <h6>Chess.com Accounts</h6>
              {chessAccounts.map((account, index) => (
                <div key={`chess-${index}`} className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    value={account}
                    onChange={(e) => updateChessAccount(index, e.target.value)}
                    placeholder="Enter Chess.com username"
                  />
                  <button 
                    className="btn btn-outline-danger"
                    onClick={() => removeChessAccount(index)}
                    disabled={chessAccounts.length === 1 && account === ''}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn-sm btn-outline-primary" onClick={addChessAccount}>
                Add Chess.com Account
              </button>
            </div>
            
            {/* Lichess Accounts */}
            <div className="mb-4">
              <h6>Lichess Accounts</h6>
              {lichessAccounts.map((account, index) => (
                <div key={`lichess-${index}`} className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    value={account}
                    onChange={(e) => updateLichessAccount(index, e.target.value)}
                    placeholder="Enter Lichess username"
                  />
                  <button 
                    className="btn btn-outline-danger"
                    onClick={() => removeLichessAccount(index)}
                    disabled={lichessAccounts.length === 1 && account === ''}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn-sm btn-outline-primary" onClick={addLichessAccount}>
                Add Lichess Account
              </button>
            </div>

            {/* Settings */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="gamesPerAccount" className="form-label">Games per Account:</label>
                  <input
                    type="number"
                    id="gamesPerAccount"
                    className="form-control"
                    value={gamesPerAccount}
                    onChange={(e) => setGamesPerAccount(Number(e.target.value))}
                    placeholder="Enter number (-1 for all)"
                    min="-1"
                  />
                  <div className="form-text">Use -1 to fetch all available games</div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="analysisDepth" className="form-label">Analyze up to move:</label>
                  <input
                    type="number"
                    id="analysisDepth"
                    className="form-control"
                    value={analysisDepth}
                    onChange={(e) => setAnalysisDepth(Number(e.target.value))}
                    placeholder="Enter analysis depth"
                    min="1"
                    max="40"
                  />
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="d-flex gap-2">
              <button 
                className="btn btn-primary"
                onClick={handleFetchGames} 
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Fetch & Store Games'}
              </button>
              
              {storedGameCount > 0 && (
                <button 
                  className="btn btn-danger"
                  onClick={handleClearDatabase}
                  disabled={loading}
                >
                  Clear Database
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {/* Loading bar */}
        {showLoadingBar && (
          <div className="mb-4">
            <div className="progress" style={{ height: "20px" }}>
              <div 
                className="progress-bar progress-bar-striped progress-bar-animated" 
                role="progressbar" 
                style={{ width: `${progress}%` }} 
                aria-valuenow={progress} 
                aria-valuemin="0" 
                aria-valuemax="100"
              >
                {Math.round(progress)}%
              </div>
            </div>
            <div className="small text-muted mt-1">
              {loading ? "Fetching and processing games..." : "Operation complete"}
            </div>
          </div>
        )}
        
        {/* Results */}
        {games.length > 0 && (
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Found {games.length} games</h5>
              <button className="btn btn-sm btn-success" onClick={downloadPGN}>
                Download as PGN
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th>White</th>
                      <th>Black</th>
                      <th>Result</th>
                      <th>Time</th>
                      <th>Opening</th>
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
                        <td>
                          <a href={game.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {games.length > 100 && (
                <div className="card-footer text-muted">
                  Showing first 100 games. All {games.length} games are stored in the database.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;