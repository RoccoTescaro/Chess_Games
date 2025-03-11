// ChessVariationTree.js - Main component
import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getGames } from '../../services/db/gameStorage';
import TreeControls from './TreeControls';
import ChessboardDisplay from './ChessboardDisplay';
import MovesPanel from './MovesPanel';
import RelatedGames from './RelatedGames';
import { buildVariationTree } from '../../services/utils/treeUtils';

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

  // Handle node selection in the tree
  function handleNodeSelect(node, nodePath) {
    setSelectedNode(node);
    setCurrentPosition(node.fen);
    setRelatedGames(node.games || []);
    setPath(nodePath);
  }
  
  // Handle tree control changes
  function handleControlsChange(newMaxDepth, newMinGames) {
    setMaxDepth(newMaxDepth);
    setMinGames(newMinGames);
  }
  
  // Handle rebuild button click
  function handleRebuild() {
    const tree = buildVariationTree(games, maxDepth, minGames);
    setTreeData(tree);
    if (tree) {
      setSelectedNode(tree);
      setCurrentPosition(tree.fen);
      setRelatedGames(tree.games || []);
      setPath([{ name: 'Initial Position', node: tree }]);
    }
  }
  
  // Handle move selection
  function handleMoveSelect(moveKey) {
    if (selectedNode && selectedNode.children[moveKey]) {
      const newNode = selectedNode.children[moveKey];
      const newPath = [...path, { name: newNode.move, node: newNode }];
      setSelectedNode(newNode);
      setCurrentPosition(newNode.fen);
      setRelatedGames(newNode.games || []);
      setPath(newPath);
    }
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
  
  return (
    <div className="chess-variation-tree">
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Chess Variation Tree Explorer</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : treeData ? (
            <>
              <TreeControls 
                maxDepth={maxDepth}
                minGames={minGames}
                onChange={handleControlsChange}
                onRebuild={handleRebuild}
              />
              <div className="row">
                <div className="col-md-6">
                  <ChessboardDisplay
                    position={currentPosition}
                    path={path}
                    onPathNodeClick={navigateToPathNode}
                    gamesCount={selectedNode ? selectedNode.frequency : 0}
                  />
                  <MovesPanel
                    selectedNode={selectedNode}
                    onMoveSelect={handleMoveSelect}
                  />
                </div>
                <div className="col-md-6">
                  <RelatedGames games={relatedGames} />
                </div>
              </div>
            </>
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