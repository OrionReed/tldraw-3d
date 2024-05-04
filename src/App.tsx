import ReactDOM from "react-dom/client";
import { Tldraw } from "tldraw";
import { Controls } from "./Controls";
import { Underlay } from "./Underlay";

import "tldraw/tldraw.css";
import "./style.css";

const root = document.getElementById("root");
if (root) {
	ReactDOM.createRoot(root).render(
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw-3d"
				onMount={(editor) => {
					new Underlay(editor);
				}}
			>
				<Controls />
			</Tldraw>
		</div>,
	);
}
