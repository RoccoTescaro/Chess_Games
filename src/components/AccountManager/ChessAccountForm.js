import React from 'react';

const ChessAccountForm = ({ accounts, updateAccount, removeAccount, addAccount }) => {
  return (
    <div className="mb-4">
      <h6>Chess.com Accounts</h6>
      {accounts.map((account, index) => (
        <div key={`chess-${index}`} className="input-group mb-2">
          <input
            type="text"
            className="form-control"
            value={account}
            onChange={(e) => updateAccount(index, e.target.value)}
            placeholder="Enter Chess.com username"
          />
          <button 
            className="btn btn-outline-danger"
            onClick={() => removeAccount(index)}
            disabled={accounts.length === 1 && account === ''}
          >
            Remove
          </button>
        </div>
      ))}
      <button className="btn btn-sm btn-outline-primary" onClick={addAccount}>
        Add Chess.com Account
      </button>
    </div>
  );
};

export default ChessAccountForm;
