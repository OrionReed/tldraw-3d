import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { Underlay } from "./Underlay";
import { Controls } from "./Controls";

export default function Canvas() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="fuzzy-canvas"
				onMount={(editor) => {
					new Underlay(editor);
				}}
			>
				<Controls />
			</Tldraw>
		</div>
	);
}