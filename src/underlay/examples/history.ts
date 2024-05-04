import { UnderlayBase } from "@/underlay";
import { Editor, TLRecord, TLShape, TLShapeId, VecLike } from "tldraw";
import p5 from "p5";

type Snapshot = {
  x: number;
  y: number;
  rotation: number;
  vertices: VecLike[];
};

/** Underlay which draws the history of each shape as a 'slice' of the shape */
export class HistoryUnderlay extends UnderlayBase {
  override name = "History";
  private histories: CircularBufferDict<TLShapeId, Snapshot>;

  constructor(editor: Editor) {
    super(editor);
    this.histories = new CircularBufferDict<TLShapeId, Snapshot>(120);
    this.editor.store.onAfterChange = (
      _: TLRecord,
      next: TLRecord,
      __: "remote" | "user",
    ) => {
      if (next.typeName !== "shape") {
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
  }

  render(sketch: p5, shapes: TLShape[]) {
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
      this.head = (this.head + 1) % this.capacity;
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

