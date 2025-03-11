import React from 'react';
import ChessAccountForm from './ChessAccountForm';
import LichessAccountForm from './LichessAccountForm';

const AccountManager = ({ 
  chessAccounts, 
  lichessAccounts,
  updateChessAccount,
  updateLichessAccount,
  removeChessAccount,
  removeLichessAccount,
  addChessAccount,
  addLichessAccount,
  gamesPerAccount,
  setGamesPerAccount,
  analysisDepth,
  setAnalysisDepth,
  handleFetchGames,
  handleClearDatabase,
  loading,
  storedGameCount
}) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Account Settings</h5>
      </div>
      <div className="card-body">
        <ChessAccountForm 
          accounts={chessAccounts}
          updateAccount={updateChessAccount}
          removeAccount={removeChessAccount}
          addAccount={addChessAccount}
        />
        
        <LichessAccountForm 
          accounts={lichessAccounts}
          updateAccount={updateLichessAccount}
          removeAccount={removeLichessAccount}
          addAccount={addLichessAccount}
        />

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
  );
};

export default AccountManager;