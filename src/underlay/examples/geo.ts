import { UnderlayBase } from "@/underlay";
import type { TLShape } from "tldraw";
import type p5 from "p5";

/** Underlay which draws the geometry of each shape as a basic 3D polygon 'tower' */
export class GeoUnderlay extends UnderlayBase {
  name = "Geo";
  override render(sketch: p5, shapes: TLShape[]) {
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
}

