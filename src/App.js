// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import './styles/bootstrap/bootstrap.min.css';

// Components
import AccountManager from './components/AccountManager/AccountManager';
import GameList from './components/GameList/GameList';
import AccountList from './components/GameList/AccountList';
import ProgressBar from './components/GeneralUI/ProgressBar';
import ThemeSwitcher from './components/GeneralUI/ThemeSwitcher';
import ChessVariationTree from './components/ChessTree/ChessVariationTree';

// Services
import { fetchChessComGames } from './services/api/chessComApi';
import { fetchLichessGames } from './services/api/lichessApi';
import { extractGameInfo } from './services/utils/pgn';
import { initDB } from './services/db/dbService';
import { saveGames, getGames, clearGames } from './services/db/gameStorage'

function App() {
  const [chessAccounts, setChessAccounts] = useState(['']);
  const [lichessAccounts, setLichessAccounts] = useState(['']);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [gamesPerAccount, setGamesPerAccount] = useState(250);
  const [storedGameCount, setStoredGameCount] = useState(0);
  const [analysisDepth, setAnalysisDepth] = useState(20);
  //const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);

  // Initialize database on component mount
  useEffect(() => {
    async function setupDB() {
      try {
        await initDB();
        const storedGames = await getGames();
        if (storedGames.length !== storedGameCount) {
          setStoredGameCount(storedGames.length);
        }
        //setIsDbInitialized(true);
        setGames(storedGames);
      } catch (error) {
        setError("Failed to initialize database.");
      }
    }
    setupDB();
  }, [storedGameCount]); // Avoid unnecessary re-renders
  

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
          const chessGames = await fetchChessComGames(username, gamesPerAccount, setProgress);
          const enhancedGames = chessGames.map(game => extractGameInfo(game));
          allGames = [...allGames, ...enhancedGames];
        } catch (error) {
          errors.push(`Chess.com (${username}): ${error.message}`);
        }
      }
      
      // Fetch Lichess games
      for (const username of validLichessAccounts) {
        try {
          const lichessGames = await fetchLichessGames(username, gamesPerAccount);
          const enhancedGames = lichessGames.map(game => extractGameInfo(game));
          allGames = [...allGames, ...enhancedGames];
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
        const errorMessage = errors.slice(0, 2).join('; ') + (errors.length > 2 ? '...' : '');
        setError(`Some accounts failed: ${errorMessage}`);
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
        <div className="d-flex justify-content-between"> <h1 className="fw-bold">Chess Game Analyzer </h1> <ThemeSwitcher /> </div>
        {/* Add navigation */}
        <nav className="mt-2">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <NavLink className="nav-link" to="/">Game Manager</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/tree">Variation Tree</NavLink>
            </li>
          </ul>
        </nav>
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={
            <> 
              <div className="d-flex">
                <div className='card flex-grow-1 me-2 mb-4'>
                  <h5 className="card-header">Current Accounts</h5>
                  {
                    storedGameCount <= 0 ?
                    (
                      <div className="card-body text-muted small">
                        Database initialized but no games stored yet.                        
                      </div>
                    )
                    :
                    (
                      <AccountList games={games} />
                    )
                  }
                </div>
                <div className="flex-grow-0">
                  <AccountManager 
                    chessAccounts={chessAccounts}
                    lichessAccounts={lichessAccounts}
                    updateChessAccount={updateChessAccount}
                    updateLichessAccount={updateLichessAccount}
                    removeChessAccount={removeChessAccount}
                    removeLichessAccount={removeLichessAccount}
                    addChessAccount={addChessAccount}
                    addLichessAccount={addLichessAccount}
                    gamesPerAccount={gamesPerAccount}
                    setGamesPerAccount={setGamesPerAccount}
                    analysisDepth={analysisDepth}
                    setAnalysisDepth={setAnalysisDepth}
                    handleFetchGames={handleFetchGames}
                    handleClearDatabase={handleClearDatabase}
                    loading={loading}
                    storedGameCount={storedGameCount}
                    />
                  
                  {/* Error message */}
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  
                  <ProgressBar 
                    progress={progress}
                    loading={loading}
                    showLoadingBar={showLoadingBar}
                    />
                  </div>
              </div>
              
              <GameList games={games} />
            </>
          } />
          
          <Route path="/tree" element={<ChessVariationTree />} />
        </Routes> 
      </main>
    </div>
  );
}

export default App;