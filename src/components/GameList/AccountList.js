//search for all accounts in the database, display number of games, last game date and most old game date
import React from 'react';

const AccountList = ({ games }) => {
    if (games.length === 0) return null;

    let accounts = new Set();
    let gameCount = {};
    let lastGameDate = {};
    let firstGameDate = {};
    
    for (const game of games) 
    {
        accounts.add(game.account);
        gameCount[game.account] = (gameCount[game.account] || 0) + 1;
        
        if (!lastGameDate[game.account] || new Date(game.date) > new Date(lastGameDate[game.account])) {
            lastGameDate[game.account] = game.date;
        }

        if (!firstGameDate[game.account] || new Date(game.date) < new Date(firstGameDate[game.account])) {
            firstGameDate[game.account] = game.date;
        }
    }

    //TODO fixbug if chess.com and lichess account have the same name

    return (
            <div className="card-body">
                <scan><b> N. accounts: </b> {accounts.size} </scan>
                <div className="border-top mt-2 pt-2">

                {
                    [...accounts].map(account => (
                        <div className="border-bottom rounded p-2" key={account}>
                            <p><b> Username: </b> {account} </p>
                            <p><b> Number of games: </b> {gameCount[account]} </p>
                            <p><b> Last game date: </b> {lastGameDate[account]} </p>
                            <p><b> First game date: </b> {firstGameDate[account]} </p>
                        </div>
                    ))
                }

                </div>
            </div>
    );

};

export default AccountList;