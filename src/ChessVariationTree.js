// ChessVariationTree.js
import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getGames } from './db';

const ChessVariationTree = () => {
  const [games, setGames] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(new Chess().fen());
  const [relatedGames, setRelatedGames] = useState([]);
  const [path, setPath] = useState([]);
  const [maxDepth, setMaxDepth] = useState(10);
  const [minGames, setMinGames] = useState(2);

  // Load games and build tree on component mount
  useEffect(() => {
    async function loadGamesAndBuildTree() {
      try {
        setLoading(true);
        // Get games from the database
        const loadedGames = await getGames();
        setGames(loadedGames);
        
        // Build tree from loaded games
        const tree = buildVariationTree(loadedGames, maxDepth, minGames);
        setTreeData(tree);
        
        // Default selection is the root node
        if (tree) {
          setSelectedNode(tree);
          setCurrentPosition(tree.fen);
          setRelatedGames(tree.games || []);
          setPath([{ name: 'Initial Position', node: tree }]);
        }
      } catch (error) {
        console.error('Error loading games:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadGamesAndBuildTree();
  }, [maxDepth, minGames]);

  // Build the variation tree from games
  function buildVariationTree(games, maxDepth = 10, minGames = 2) {
    if (!games || !games.length) return null;
    
    // Create the root node (starting position)
    const root = {
      fen: new Chess().fen(),
      move: 'Initial Position',
      children: {},
      games: [],
      frequency: games.length
    };
    
    // Process each game to build the tree
    games.forEach(game => {
      if (!game.pgn) return;
      
      try {
        const chess = new Chess();
        chess.loadPgn(game.pgn);
        const moves = chess.history({ verbose: true });
        
        // Reset for each game
        const currentChess = new Chess();
        let currentNode = root;
        
        // Add the current game to the root's games
        root.games.push({
          id: game.id,
          white: game.white,
          black: game.black,
          result: game.result,
          date: game.date,
          url: game.url
        });
        
        // Process each move up to maxDepth
        for (let i = 0; i < moves.length && i < maxDepth; i++) {
          const move = moves[i];
          // Create a unique move key
          const moveKey = `${move.from}${move.to}${move.promotion || ''}`;
          
          // Make the move
          currentChess.move({ from: move.from, to: move.to, promotion: move.promotion });
          const fen = currentChess.fen();
          
          // If this move hasn't been seen yet at this position, create a new node
          if (!currentNode.children[moveKey]) {
            currentNode.children[moveKey] = {
              fen: fen,
              move: move.san,
              moveObj: move,
              children: {},
              games: [],
              frequency: 0
            };
          }
          
          // Move to the next node
          currentNode = currentNode.children[moveKey];
          
          // Increment frequency and add the game to this node
          currentNode.frequency = (currentNode.frequency || 0) + 1;
          currentNode.games.push({
            id: game.id,
            white: game.white,
            black: game.black,
            result: game.result,
            date: game.date,
            url: game.url
          });
        }
      } catch (error) {
        console.error('Error processing game PGN:', error, game.id);
      }
    });
    
    // Prune the tree to remove variations with too few games
    pruneTree(root, minGames);
    
    return root;
  }
  
  // Remove branches that have fewer games than minGames
  function pruneTree(node, minGames) {
    if (!node) return;
    
    Object.keys(node.children).forEach(key => {
      const child = node.children[key];
      
      if (child.frequency < minGames) {
        delete node.children[key];
      } else {
        pruneTree(child, minGames);
      }
    });
  }
  
  // Handle node selection in the tree
  function handleNodeSelect(node, nodePath) {
    setSelectedNode(node);
    setCurrentPosition(node.fen);
    setRelatedGames(node.games || []);
    setPath(nodePath);
  }
  
  // Navigate to a node in the path
  function navigateToPathNode(index) {
    if (path[index]) {
      const node = path[index].node;
      const newPath = path.slice(0, index + 1);
      setSelectedNode(node);
      setCurrentPosition(node.fen);
      setRelatedGames(node.games || []);
      setPath(newPath);
    }
  }
  
  // Make a move in the tree
  function handleMove(moveKey) {
    if (selectedNode && selectedNode.children[moveKey]) {
      const newNode = selectedNode.children[moveKey];
      const newPath = [...path, { name: newNode.move, node: newNode }];
      setSelectedNode(newNode);
      setCurrentPosition(newNode.fen);
      setRelatedGames(newNode.games || []);
      setPath(newPath);
    }
  }
  
  // Render the available moves from the current position
  function renderAvailableMoves() {
    if (!selectedNode) return null;
    
    const moves = Object.values(selectedNode.children)
      .sort((a, b) => b.frequency - a.frequency);
    
    if (moves.length === 0) {
      return <div className="alert alert-info">No further moves in the database for this position.</div>;
    }
    
    return (
      <div className="list-group mt-3">
        {moves.map((move, index) => {
          const moveKey = Object.keys(selectedNode.children).find(key => 
            selectedNode.children[key] === move
          );
          
          return (
            <button 
              key={index} 
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              onClick={() => handleMove(moveKey)}
            >
              <span>{move.move}</span>
              <span className="badge bg-primary rounded-pill">{move.frequency} games</span>
            </button>
          );
        })}
      </div>
    );
  }
  
  // Render the breadcrumb path
  function renderPath() {
    return (
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          {path.map((item, index) => (
            <li 
              key={index} 
              className={`breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigateToPathNode(index)}
            >
              {item.name}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
  
  // Render related games
  function renderRelatedGames() {
    if (!relatedGames || relatedGames.length === 0) {
      return <div className="alert alert-info">No games found for this position.</div>;
    }
    
    return (
      <div className="table-responsive mt-3">
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
            {relatedGames.slice(0, 10).map((game, index) => (
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
        {relatedGames.length > 10 && (
          <div className="text-muted small">
            Showing 10 of {relatedGames.length} games for this position.
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="chess-variation-tree">
      <div className="card mb-4">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Chess Variation Tree Explorer</h5>
          <div>
            <div className="input-group input-group-sm">
              <span className="input-group-text">Max Depth</span>
              <input 
                type="number" 
                className="form-control" 
                value={maxDepth} 
                onChange={(e) => setMaxDepth(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="30"
                style={{ width: "70px" }}
              />
              <span className="input-group-text">Min Games</span>
              <input 
                type="number" 
                className="form-control" 
                value={minGames} 
                onChange={(e) => setMinGames(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                style={{ width: "70px" }}
              />
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => {
                  const tree = buildVariationTree(games, maxDepth, minGames);
                  setTreeData(tree);
                  if (tree) {
                    setSelectedNode(tree);
                    setCurrentPosition(tree.fen);
                    setRelatedGames(tree.games || []);
                    setPath([{ name: 'Initial Position', node: tree }]);
                  }
                }}
              >
                Rebuild
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : treeData ? (
            <div className="row">
              <div className="col-md-6">
                <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                  <Chessboard position={currentPosition} />
                </div>
                <div className="mt-3">
                  {renderPath()}
                  {selectedNode && (
                    <div className="mt-2 text-center">
                      <span className="badge bg-success">
                        {selectedNode.frequency} games with this position
                      </span>
                    </div>
                  )}
                  {renderAvailableMoves()}
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Games with this Position</h6>
                  </div>
                  <div className="card-body p-0">
                    {renderRelatedGames()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning">
              No games found in database. Please fetch games first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessVariationTree;