import React from 'react';
import { downloadPGN } from '../../services/utils/pgn';

const GameList = ({ games }) => {
  if (games.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Found {games.length} games</h5>
        <button className="btn btn-sm btn-success" onClick={() => downloadPGN(games)}>
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
  );
};

export default GameList;