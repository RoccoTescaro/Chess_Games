the final goal is to create a consistent database of chess games, analize them. 
first tool that i would like is to identify weakspots in chess openings, so we look at first n moves (like 15) of every game, we classify the sequence counting how many times was encountered and we weights it with the elo of the players.
We see if the moves we played was good or bad, meaning inside a certain threshold t of accuracy.
We also get those games where our opponent did not played the best move and we have not faced it before (those are possible weakspots since we did not know how to react to them).
We create a training session where we play against the computer and we have to play one of the best (meaning inside the threashold t of accuracy) moves in that positions (till we reach n). 
Each time we submit a move the engine should tell us the tops moves.

Other tools that i would like to have are statistical analysis of what instead we play the best, and general statistics of the games (not only the openings).

add undo button
hash fen positions
optimize variation tree construction, with different data structure and parallelization
add game analysis and statistics
show a tree like structure of the game variations, to explore more lines at the same time
add filters to games (data, elo, account)
add a training mode where the user has to play against his weakspots (how to handle them, how to memorize if the player passed the threshold of accuracy)
add notes to tree like structure

should inspect game fetching algorithm, it seems to be slow (same for tree creation)
still variation tree serialization does not seems to work

BUGs
loading bar mostra 100% ma ha ancora del lavoro in background da svolgere
risolvere il caso in cui l'account lichess e chess.com hanno lo stesso username