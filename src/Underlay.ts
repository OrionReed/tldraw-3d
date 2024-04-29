import { Editor, TLCamera, TLRecord, TLShape, TLShapeId, VecLike } from "@tldraw/tldraw";
import p5 from "p5";
import fogVertexShader from './glsl/fog.vert?raw';
import fogFragmentShader from './glsl/fog.frag?raw';
import { opts } from './Controls'

type UnderlayDraw = (sketch: p5, shapes: TLShape[]) => void

export class Underlay {
  editor: Editor
  p5: p5
  width: number
  height: number
  histories: CircularBufferDict<TLShapeId, TLShape>;

  constructor(editor: Editor) {
    this.editor = editor
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.histories = new CircularBufferDict<TLShapeId, TLShape>(120);

    this.p5 = new p5((sketch: p5) => {
      let layer: p5.Framebuffer
      let fogShader: p5.Shader
      sketch.preload = () => {
        fogShader = sketch.createShader(fogVertexShader, fogFragmentShader);
      }
      sketch.setup = () => {
        sketch.createCanvas(this.width, this.height, sketch.WEBGL);
        layer = sketch.createFramebuffer({
          width: sketch.width,
          height: sketch.height,
        }) as unknown as p5.Framebuffer; // eww

        this.editor.store.onAfterChange = (_: TLRecord, next: TLRecord, __: 'remote' | 'user') => {
          if (next.typeName !== 'shape' || !opts.history) {
            return
          }
          this.histories.push(next.id, next)
        }
      };
      sketch.draw = () => {
        sketch.colorMode(sketch.HSL)
        const isDarkMode = this.editor.user.getIsDarkMode()
        const bgColor: p5.Color = isDarkMode ? sketch.color(220, 10, 10) : sketch.color('white')
        const shapes = this.editor.getCurrentPageShapes();
        layer.begin();
        sketch.clear();
        sketch.lights();
        sketch.scale(1, -1, 1); // flip y for framebuffer

        this.draw(sketch, shapes);

        layer.end();

        // Apply fog to the scene
        sketch.shader(fogShader);
        fogShader.setUniform('fog', [sketch.red(bgColor), sketch.green(bgColor), sketch.blue(bgColor)]);
        fogShader.setUniform('img', layer.color);
        fogShader.setUniform('depth', layer.depth);
        sketch.rect(0, 0, sketch.width, sketch.height);
      };
    });
  }

  draw(sketch: p5, shapes: TLShape[]) {
    const cam = this.editor.getCamera()
    sketch.scale(cam.z, cam.z, cam.z);

    if (opts.depth) {
      this.drawGeo(sketch, shapes)
    }
    if (opts.edges) {
      this.drawRope(sketch, shapes)
    }
    if (opts.history) {
      this.drawHistory(sketch, shapes)
    }
  }

  drawGeo: UnderlayDraw = (sketch: p5, shapes: TLShape[]) => {
    const cam = this.editor.getCamera()
    shapes.forEach((shape) => {
      const pos = this.shapePos(sketch, shape, cam)

      sketch.push();
      sketch.translate(pos.x, pos.y);
      sketch.rotateZ(shape.rotation);

      const geoColor: p5.Color = sketch.color(190, 50, 50)
      const strokeColor: p5.Color = sketch.color(190, 50, 30)
      const depth = 10000

      const geo = this.editor.getShapeGeometry(shape)
      const closedCurve = shape.type !== 'arrow' && geo.isClosed
      const vertices = geo.vertices
      sketch.stroke(strokeColor)
      sketch.fill(geoColor);
      const numSides = closedCurve ? vertices.length : vertices.length - 1
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
    });
  }

  drawHistory: UnderlayDraw = (sketch: p5, shapes: TLShape[]) => {
    const cam = this.editor.getCamera()
    shapes.forEach((shape) => {
      const history = this.histories.toArray(shape.id);
      if (!history) {
        return
      }
      const geoColor: p5.Color = sketch.color(190, 50, 50)
      const strokeColor: p5.Color = sketch.color(190, 50, 30)

      const geo = this.editor.getShapeGeometry(shape)
      for (let t = history.length - 1; t >= 0; t--) {
        const record = history[t]
        const pos = this.shapePos(sketch, record, cam)
        const layerDepth = -50
        const depth = layerDepth * (history.length - 1 - t)

        sketch.push();
        sketch.translate(pos.x, pos.y, depth);
        sketch.rotateZ(record.rotation);
        const vertices = geo.vertices
        sketch.stroke(strokeColor)
        sketch.fill(geoColor);
        sketch.beginShape();
        for (const vertex of vertices) {
          sketch.vertex(vertex.x, vertex.y, 0);
        }
        sketch.endShape(sketch.CLOSE);
        sketch.pop();
      }
    });
  }

  drawRope: UnderlayDraw = (sketch: p5, shapes: TLShape[]) => {
    const cam = this.editor.getCamera()
    let previousShape: TLShape | null = null
    shapes.forEach((shape) => {
      if (!previousShape) {
        previousShape = shape
        return
      }

      const pos = this.shapePos(sketch, shape, cam)

      sketch.push();
      sketch.translate(pos.x, pos.y);
      sketch.rotateZ(shape.rotation);

      const geo = this.editor.getShapeGeometry(shape)
      const segments = 20; // Number of segments in the rope
      const sag = 1000; // How much the rope sags
      const strokeWeight = 20; // how thick the lines are
      const strokeColor: p5.Color = sketch.color(250, 50, 50);

      sketch.push(); // Save the current drawing state

      // Adjust for the shape's position and rotation
      sketch.translate(geo.bounds.w / 2, geo.bounds.h / 2);
      sketch.rotateZ(-shape.rotation);

      const centerVec = this.centerToCenter(shape, previousShape);

      sketch.stroke(strokeColor);
      sketch.strokeWeight(strokeWeight);
      sketch.noFill();

      sketch.beginShape();
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = sketch.lerp(0, centerVec.x, t);
        const y = sketch.lerp(0, centerVec.y, t);
        const parabola = sag * Math.sin(Math.PI * t); // Simple parabolic equation for sag
        const col = sketch.lerpColor(strokeColor, sketch.color('red'), t);
        sketch.stroke(col);
        sketch.vertex(x, y, -parabola);
      }
      sketch.endShape();
      sketch.pop(); // Restore the original drawing state
      sketch.pop();
      previousShape = shape
    });
  }

  /** Returns the vector from the center of the first shape to the center of the second shape, accounting for rotation */
  private centerToCenter(from: TLShape, to: TLShape): VecLike {
    const fromGeo = this.editor.getShapeGeometry(from);
    const toGeo = this.editor.getShapeGeometry(to);

    // Calculate center positions of each shape
    const fromCenterX = from.x + (fromGeo.bounds.w / 2) * Math.cos(from.rotation) - (fromGeo.bounds.h / 2) * Math.sin(from.rotation);
    const fromCenterY = from.y + (fromGeo.bounds.w / 2) * Math.sin(from.rotation) + (fromGeo.bounds.h / 2) * Math.cos(from.rotation);
    const toCenterX = to.x + (toGeo.bounds.w / 2) * Math.cos(to.rotation) - (toGeo.bounds.h / 2) * Math.sin(to.rotation);
    const toCenterY = to.y + (toGeo.bounds.w / 2) * Math.sin(to.rotation) + (toGeo.bounds.h / 2) * Math.cos(to.rotation);

    // Return the vector from the center of 'from' to the center of 'to'
    return {
      x: toCenterX - fromCenterX,
      y: toCenterY - fromCenterY,
    };
  }

  /** Returns the position of the shape in the sketch, accounting for the camera */
  private shapePos(sketch: p5, shape: TLShape, cam: TLCamera) {
    const shapeX = (shape.x + cam.x) - sketch.width / 2 / cam.z;
    const shapeY = (shape.y + cam.y) - sketch.height / 2 / cam.z;
    return { x: shapeX, y: shapeY }
  }

}

class CircularBufferDict<TKey, TValue> {
  private buffers: Map<TKey, CircularBuffer<TValue>>;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffers = new Map<TKey, CircularBuffer<TValue>>();
  }

  push(key: TKey, item: TValue): void {
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = new CircularBuffer<TValue>(this.capacity);
      this.buffers.set(key, buffer);
    }
    buffer.push(item);
  }

  get(key: TKey): CircularBuffer<TValue> | undefined {
    return this.buffers.get(key);
  }

  toArray(key: TKey): TValue[] | undefined {
    const buffer = this.buffers.get(key);
    return buffer ? buffer.toArray() : undefined;
  }
}

class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private length = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.length < this.capacity) {
      this.length++;
    } else {
      this.head = (this.head + 1) % this.capacity; // Overwrite the oldest data
    }
  }

  toArray(): T[] {
    const result = [];
    for (let i = 0; i < this.length; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }
}