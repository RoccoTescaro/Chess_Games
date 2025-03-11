// RelatedGames.js - Display of games for current position
import React from 'react';

const RelatedGames = ({ games }) => {
  if (!games || games.length === 0) {
    return (
      <div className="card">
        <div className="card-header bg-light">
          <h6 className="mb-0">Games with this Position</h6>
        </div>
        <div className="card-body">
          <div className="alert alert-info">No games found for this position.</div>
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
        <div className="table-responsive">
          <table className="table table-striped table-hover table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>White</th>
                <th>Black</th>
                <th>Result</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {games.slice(0, 10).map((game, index) => (
                <tr key={index}>
                  <td>{game.date}</td>
                  <td>{game.white}</td>
                  <td>{game.black}</td>
                  <td>{game.result}</td>
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
              ))}
            </tbody>
          </table>
          {games.length > 10 && (
            <div className="text-muted small p-2">
              Showing 10 of {games.length} games for this position.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatedGames;