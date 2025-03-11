// RelatedGames.js - Display of games for current position with Elo ratings
import React, { useState, useEffect } from 'react';

const RelatedGames = ({ games, buildingInProgress, processedGames, totalGames }) => {
  const [sortedGames, setSortedGames] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  useEffect(() => {
    if (!games || games.length === 0) {
      setSortedGames([]);
      return;
    }
    
    // Create a copy to sort
    const gamesCopy = [...games];
    
    // Sort games based on current criteria
    gamesCopy.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'date':
          valueA = new Date(a.date || '1900-01-01');
          valueB = new Date(b.date || '1900-01-01');
          break;
        case 'whiteElo':
          valueA = parseInt(a.whiteElo) || 0;
          valueB = parseInt(b.whiteElo) || 0;
          break;
        case 'blackElo':
          valueA = parseInt(a.blackElo) || 0;
          valueB = parseInt(b.blackElo) || 0;
          break;
        case 'avgElo':
          valueA = (parseInt(a.whiteElo) || 0 + parseInt(a.blackElo) || 0) / 2;
          valueB = (parseInt(b.whiteElo) || 0 + parseInt(b.blackElo) || 0) / 2;
          break;
        default:
          valueA = a[sortBy];
          valueB = b[sortBy];
      }
      
      if (sortDirection === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
    
    setSortedGames(gamesCopy);
  }, [games, sortBy, sortDirection]);
  
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortDirection('desc');
    }
  };
  
  const renderProgressInfo = () => {
    if (!buildingInProgress) return null;
    
    const percentComplete = Math.round((processedGames / totalGames) * 100);
    
    return (
      <div className="alert alert-info d-flex align-items-center mb-2">
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>
          Building tree: {processedGames} of {totalGames} games processed ({percentComplete}%).
          Showing games from processed positions.
        </span>
      </div>
    );
  };
  
  if (!games || games.length === 0) {
    return (
      <div className="card">
        <div className="card-header bg-light">
          <h6 className="mb-0">Games with this Position</h6>
        </div>
        <div className="card-body">
          {renderProgressInfo()}
          <div className="alert alert-info">
            {buildingInProgress 
              ? "No games found for this position yet. Games will appear as they're processed."
              : "No games found for this position."}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <div className="card-header bg-light">
        <h6 className="mb-0">Games with this Position</h6>
      </div>
      <div className="card-body p-0">
        {renderProgressInfo()}
        <div className="table-responsive">
          <table className="table table-striped table-hover table-sm">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                  Date {sortBy === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>White</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('whiteElo')}>
                  ELO {sortBy === 'whiteElo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Black</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('blackElo')}>
                  ELO {sortBy === 'blackElo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Result</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('avgElo')}>
                  Avg ELO {sortBy === 'avgElo' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {sortedGames.slice(0, 10).map((game, index) => {
                const whiteElo = game.whiteElo || '?';
                const blackElo = game.blackElo || '?';
                const avgElo = (whiteElo !== '?' && blackElo !== '?') 
                  ? Math.round((parseInt(whiteElo) + parseInt(blackElo)) / 2)
                  : '?';
                
                return (
                  <tr key={index}>
                    <td>{game.date || 'Unknown'}</td>
                    <td>{game.white}</td>
                    <td>{whiteElo}</td>
                    <td>{game.black}</td>
                    <td>{blackElo}</td>
                    <td>{game.result}</td>
                    <td>{avgElo}</td>
                    <td>
                      <a 
                        href={game.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-sm btn-outline-primary"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedGames.length > 10 && (
            <div className="text-muted small p-2">
              Showing 10 of {sortedGames.length} games for this position.
              {buildingInProgress && " More games may be found as processing continues."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatedGames;