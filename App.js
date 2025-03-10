// App.js
import React, { useState } from 'react';
import './App.css';

function App() {
  const [chessAccounts, setChessAccounts] = useState(['']);
  const [lichessAccounts, setLichessAccounts] = useState(['']);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      
      // Get most recent archives (limit to last 3 months to avoid too many requests)
      const recentArchives = archives.slice(-3);
      
      let allGames = [];
      for (const archiveUrl of recentArchives) {
        const gamesResponse = await fetch(archiveUrl);
        if (!gamesResponse.ok) {
          throw new Error(`Failed to fetch archive: ${gamesResponse.status}`);
        }
        const gamesData = await gamesResponse.json();
        
        const formattedGames = gamesData.games.map(game => ({
          id: `${game.url}-${username}`, // Add username to ensure unique IDs
          white: game.white.username,
          black: game.black.username,
          result: determineResult(game.white.result, username),
          date: new Date(game.end_time * 1000).toLocaleDateString(),
          url: game.url,
          pgn: game.pgn,
          source: 'chess.com',
          account: username,
          timeControl: game.time_control
        }));
        
        allGames = [...allGames, ...formattedGames];
      }
      
      return allGames;
    } catch (error) {
      console.error(`Error fetching Chess.com games for ${username}:`, error);
      throw error;
    }
  }

  async function fetchLichessGames(username) {
    try {
      // Lichess API directly provides games for a user
      const response = await fetch(`https://lichess.org/api/games/user/${username}?max=50&pgnInJson=true`, {
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
      
      return games.map(game => ({
        id: `${game.id}-${username}`, // Add username to ensure unique IDs
        white: game.players.white.user?.name || 'Anonymous',
        black: game.players.black.user?.name || 'Anonymous',
        result: determineLichessResult(game, username),
        date: new Date(game.createdAt).toLocaleDateString(),
        url: `https://lichess.org/${game.id}`,
        pgn: game.pgn,
        source: 'lichess',
        account: username,
        timeControl: `${Math.floor(game.clock?.initial / 60 || 0)}+${game.clock?.increment || 0}`
      }));
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
      
      setGames(allGames);
      
      // If there were errors but we still got some games, show partial error
      if (errors.length > 0) {
        setError(`Some accounts couldn't be fetched: ${errors.join('; ')}`);
      }
    } catch (error) {
      setError(`Failed to fetch games: ${error.message}`);
    } finally {
      setLoading(false);
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
        <h1>Multi-Account Chess Games Fetcher</h1>
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
          
          <button 
            className="fetch-btn"
            onClick={handleFetchGames} 
            disabled={loading || (chessAccounts.every(a => a.trim() === '') && lichessAccounts.every(a => a.trim() === ''))}
          >
            {loading ? 'Loading...' : 'Fetch All Games'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {games.length > 0 && (
          <div className="results-container">
            <div className="results-header">
              <h2>Found {games.length} games</h2>
              <button onClick={downloadPGN}>Download as PGN</button>
            </div>
            
            <table className="games-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>White</th>
                  <th>Black</th>
                  <th>Result</th>
                  <th>Time Control</th>
                  <th>Source</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id}>
                    <td>{game.date}</td>
                    <td>{game.account}</td>
                    <td>{game.white}</td>
                    <td>{game.black}</td>
                    <td>{game.result}</td>
                    <td>{game.timeControl}</td>
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
          </div>
        )}
      </main>
    </div>
  );
}

export default App;