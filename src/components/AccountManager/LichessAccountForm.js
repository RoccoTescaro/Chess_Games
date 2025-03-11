import React from 'react';

const LichessAccountForm = ({ accounts, updateAccount, removeAccount, addAccount }) => {
  return (
    <div className="mb-4">
      <h6>Lichess Accounts</h6>
      {accounts.map((account, index) => (
        <div key={`lichess-${index}`} className="input-group mb-2">
          <input
            type="text"
            className="form-control"
            value={account}
            onChange={(e) => updateAccount(index, e.target.value)}
            placeholder="Enter Lichess username"
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
        Add Lichess Account
      </button>
    </div>
  );
};

export default LichessAccountForm;