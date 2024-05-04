import "tldraw/tldraw.css";
import "./style.css";
import ReactDOM from "react-dom/client";
import { Tldraw } from "tldraw";
import { UnderlayRenderer } from "@/underlay";
import {
	EdgeUnderlay,
	GeoUnderlay,
	HistoryUnderlay,
} from "@/underlay/examples";

const underlays = [GeoUnderlay, HistoryUnderlay, EdgeUnderlay];

const root = document.getElementById("root");
if (root) {
	ReactDOM.createRoot(root).render(
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw-3d"
				onMount={(editor) => {
					new UnderlayRenderer(editor, underlays);
				}}
			/>
		</div>,
	);
}
