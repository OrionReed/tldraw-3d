import { useState } from "react";

class UnderlayOpts {
	public depth: boolean;
	public edges: boolean;
	public history: boolean;
	constructor() {
		this.depth = true;
		this.edges = false;
		this.history = false;
	}
}

export const opts = new UnderlayOpts();

export const Controls = () => {
	const [showDepth, setShowDepth] = useState(opts.depth);
	const [showEdges, setShowEdges] = useState(opts.edges);
	const [showHistory, setShowHistory] = useState(opts.history);

	const toggleDepth = () => {
		opts.depth = !showDepth;
		setShowDepth(!showDepth);
	};

	const toggleEdges = () => {
		opts.edges = !showEdges;
		setShowEdges(!showEdges);
	};

	const toggleHistory = () => {
		opts.history = !showHistory;
		setShowHistory(!showHistory);
	};

	return (
		<div className="controls">
			<button type="button" onClick={toggleDepth}>
				{showDepth ? "Hide Depth" : "Show Depth"}
			</button>
			<button type="button" onClick={toggleEdges}>
				{showEdges ? "Hide Edges" : "Show Edges"}
			</button>
			<button type="button" onClick={toggleHistory}>
				{showHistory ? "Hide History" : "Show History"}
			</button>
		</div>
	);
};
