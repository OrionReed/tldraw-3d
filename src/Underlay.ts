import p5 from "p5";
import type { Editor, TLRecord, TLShape, TLShapeId, VecLike } from "tldraw";
import { CircularBufferDict } from "./CircularBufferDict";
import { opts } from "./Controls";
import fogFragmentShader from "./glsl/fog.frag?raw";
import fogVertexShader from "./glsl/fog.vert?raw";

type UnderlayFunc = (sketch: p5, shapes: TLShape[]) => void;
type Snapshot = {
	x: number;
	y: number;
	rotation: number;
	vertices: VecLike[];
};

/** An "Underlay" is a 3D scene that is drawn under the canvas with aligned coordinates (tldraw is at z=0). */
export class Underlay {
	editor: Editor;
	p5: p5;
	width: number;
	height: number;
	histories: CircularBufferDict<TLShapeId, Snapshot>;

	constructor(editor: Editor) {
		this.editor = editor;
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.histories = new CircularBufferDict<TLShapeId, Snapshot>(120);

		/** Setup the p5.js sketch */
		this.p5 = new p5((sketch: p5) => {
			let layer: p5.Framebuffer;
			let fogShader: p5.Shader;

			sketch.preload = () => {
				fogShader = sketch.createShader(fogVertexShader, fogFragmentShader);
			};
			sketch.setup = () => {
				sketch.createCanvas(this.width, this.height, sketch.WEBGL);
				layer = sketch.createFramebuffer({
					width: sketch.width,
					height: sketch.height,
				}) as unknown as p5.Framebuffer; // eww

				this.editor.store.onAfterChange = (
					_: TLRecord,
					next: TLRecord,
					__: "remote" | "user",
				) => {
					if (next.typeName !== "shape" || !opts.history) {
						return;
					}
					const vertices = this.editor.getShapeGeometry(next).vertices;
					this.histories.push(next.id, {
						x: next.x,
						y: next.y,
						rotation: next.rotation,
						vertices: vertices,
					});
				};
			};

			/** Draw the underlay with a fog shader */
			sketch.draw = () => {
				sketch.colorMode(sketch.HSL);
				const isDarkMode = this.editor.user.getIsDarkMode();
				const bgColor: p5.Color = isDarkMode
					? sketch.color(220, 10, 10)
					: sketch.color("white");
				const shapes = this.editor.getCurrentPageShapes();
				layer.begin();
				sketch.clear();
				sketch.lights();
				sketch.scale(1, -1, 1); // flip y for framebuffer

				const cam = this.editor.getCamera();
				sketch.scale(cam.z);
				sketch.translate(
					cam.x - sketch.width / 2 / cam.z,
					cam.y - sketch.height / 2 / cam.z,
				);

				if (opts.depth) {
					this.underlayGeo(sketch, shapes);
				}
				if (opts.edges) {
					this.underlayEdge(sketch, shapes);
				}
				if (opts.history) {
					this.underlayHistory(sketch, shapes);
				}

				layer.end();

				// Apply fog to the scene
				sketch.shader(fogShader);
				fogShader.setUniform("fog", [
					sketch.red(bgColor),
					sketch.green(bgColor),
					sketch.blue(bgColor),
				]);
				fogShader.setUniform("img", layer.color);
				fogShader.setUniform("depth", layer.depth);
				sketch.rect(0, 0, sketch.width, sketch.height);
			};
		});
	}

	/** Underlay which draws the geometry of each shape as a basic 3D polygon 'tower' */
	underlayGeo: UnderlayFunc = (sketch: p5, shapes: TLShape[]) => {
		for (const shape of shapes) {
			sketch.push();
			sketch.translate(shape.x, shape.y);
			sketch.rotateZ(shape.rotation);

			const geoColor: p5.Color = sketch.color(190, 50, 50);
			const strokeColor: p5.Color = sketch.color(190, 50, 30);
			const depth = 10000;

			const geo = this.editor.getShapeGeometry(shape);
			const closedCurve = shape.type !== "arrow" && geo.isClosed;
			const vertices = geo.vertices;
			sketch.stroke(strokeColor);
			sketch.fill(geoColor);
			const numSides = closedCurve ? vertices.length : vertices.length - 1;
			for (let i = 0; i < numSides; i++) {
				const nextIndex = (i + 1) % vertices.length;
				sketch.beginShape();
				sketch.vertex(vertices[i].x, vertices[i].y, 0);
				sketch.vertex(vertices[nextIndex].x, vertices[nextIndex].y, 0);
				sketch.vertex(vertices[nextIndex].x, vertices[nextIndex].y, -depth);
				sketch.vertex(vertices[i].x, vertices[i].y, -depth);
				sketch.endShape(sketch.CLOSE);
			}
			sketch.pop();
		}
	};

	/** Underlay which draws the history of each shape as a 'slice' of the shape */
	underlayHistory: UnderlayFunc = (sketch: p5, shapes: TLShape[]) => {
		for (const shape of shapes) {
			const history = this.histories.toArray(shape.id);
			if (!history) {
				continue;
			}
			const geoColor: p5.Color = sketch.color(190, 50, 50);
			const strokeColor: p5.Color = sketch.color(190, 50, 30);

			for (let t = history.length - 1; t >= 0; t--) {
				const record = history[t];
				const layerDepth = -50;
				const depth = layerDepth * (history.length - 1 - t);

				sketch.push();
				sketch.translate(record.x, record.y, depth);
				sketch.rotateZ(record.rotation);
				sketch.stroke(strokeColor);
				sketch.fill(geoColor);
				sketch.beginShape();
				for (const vertex of record.vertices) {
					sketch.vertex(vertex.x, vertex.y, 0);
				}
				sketch.endShape(sketch.CLOSE);
				sketch.pop();
			}
		}
	};

	/** Underlay which draws edges between shapes as hanging 'ropes' */
	underlayEdge: UnderlayFunc = (sketch: p5, shapes: TLShape[]) => {
		let previousShape: TLShape | null = null;
		for (const shape of shapes) {
			if (!previousShape) {
				previousShape = shape;
				continue;
			}

			const fromCenter = this.editor.getShapePageBounds(shape)?.center;
			const toCenter = this.editor.getShapePageBounds(previousShape)?.center;
			if (!fromCenter || !toCenter) {
				continue;
			}

			sketch.push();
			sketch.translate(fromCenter.x, fromCenter.y);

			const segments = 20; // Number of segments in the rope
			const sag = 1000; // How much the rope sags
			const strokeWeight = 20; // how thick the lines are
			const strokeColor: p5.Color = sketch.color(250, 50, 50);

			sketch.stroke(strokeColor);
			sketch.strokeWeight(strokeWeight);
			sketch.noFill();

			sketch.beginShape();
			for (let i = 0; i <= segments; i++) {
				const t = i / segments;
				const x = sketch.lerp(0, toCenter.x - fromCenter.x, t);
				const y = sketch.lerp(0, toCenter.y - fromCenter.y, t);
				const parabola = sag * Math.sin(Math.PI * t); // Simple parabolic equation for sag
				const col = sketch.lerpColor(strokeColor, sketch.color("red"), t);
				sketch.stroke(col);
				sketch.vertex(x, y, -parabola);
			}
			sketch.endShape();
			sketch.pop();
			previousShape = shape;
		}
	};
}
