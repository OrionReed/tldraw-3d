import { UnderlayBase } from "@/underlay";
import type { TLShape } from "tldraw";
import type p5 from "p5";

/** Underlay which draws edges between shapes as hanging 'ropes' */
export class EdgeUnderlay extends UnderlayBase {
  name = "Edges";
  render(sketch: p5, shapes: TLShape[]) {
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
  }
}