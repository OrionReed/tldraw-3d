import { useState } from 'react';

class UnderlayOpts {
  public depth = true
  public edges = true
  constructor() {
    this.depth = true
    this.edges = true
  }
}

export const opts = new UnderlayOpts()

export const Controls = () => {
  const [showDepth, setShowDepth] = useState(opts.depth);
  const [showEdges, setShowEdges] = useState(opts.edges);

  const toggleDepth = () => {
    opts.depth = !showDepth
    setShowDepth(!showDepth);
  };

  const toggleEdges = () => {
    opts.edges = !showEdges
    setShowEdges(!showEdges);
  };

  return (
    <div className="controls">
      <button type="button" onClick={toggleDepth}>
        {showDepth ? 'Hide Depth' : 'Show Depth'}
      </button>
      <button type="button" onClick={toggleEdges}>
        {showEdges ? 'Hide Edges' : 'Show Edges'}
      </button>
    </div>
  );
};
