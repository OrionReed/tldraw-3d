import { Editor, Geometry2d, TLShape, VecLike } from "@tldraw/tldraw";
import p5 from "p5";
import fogVertexShader from './glsl/fog.vert?raw';
import fogFragmentShader from './glsl/fog.frag?raw';
import { opts } from './Controls'

export class Underlay {
  editor: Editor
  p5: p5
  width: number
  height: number

  constructor(editor: Editor) {
    this.editor = editor
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.p5 = new p5((sketch: p5) => {
      let layer: p5.Framebuffer
      let fogShader: p5.Shader
      sketch.preload = () => {
        fogShader = sketch.createShader(fogVertexShader, fogFragmentShader);
      }
      sketch.setup = () => {
        sketch.createCanvas(this.width, this.height, sketch.WEBGL);
        const bufferOpts = {
          width: sketch.width,
          height: sketch.height,
        }
        layer = sketch.createFramebuffer(bufferOpts) as unknown as p5.Framebuffer; // eww
      };
      sketch.draw = () => {
        sketch.colorMode(sketch.HSL)
        const isDarkMode = this.editor.user.getIsDarkMode()
        const bgColor: p5.Color = isDarkMode ? sketch.color(220, 10, 10) : sketch.color('white')
        sketch.background(bgColor);
        const shapes = this.editor.getCurrentPageShapes();
        layer.begin();
        sketch.clear();
        sketch.lights();
        sketch.scale(1, -1, 1); // flip y for framebuffer

        this.draw(sketch, shapes);
        layer.end();

        // Apply fog to the scene
        // const fogColor = sketch.color(bgColor);
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
    let previousShape: TLShape | null = null
    shapes.forEach((shape) => {
      const shapeX = (shape.x + cam.x) - sketch.width / 2;
      const shapeY = (shape.y + cam.y) - sketch.height / 2;

      sketch.push();
      sketch.translate(shapeX, shapeY);
      sketch.rotateZ(shape.rotation);

      if (opts.depth) {
        this.drawGeo(shape)
      }

      if (previousShape && opts.edges) {
        this.drawRope(shape, previousShape);
      }
      sketch.pop();
      previousShape = shape
    });
  }

  drawGeo(shape: TLShape) {
    const geoColor: p5.Color = this.p5.color(190, 50, 50)
    const strokeColor: p5.Color = this.p5.color(190, 50, 30)
    const depth = 10000

    const geo = this.editor.getShapeGeometry(shape)
    const closedCurve = shape.type !== 'arrow' && geo.isClosed
    const vertices = geo.vertices
    this.p5.stroke(strokeColor)
    this.p5.fill(geoColor);
    const numSides = closedCurve ? vertices.length : vertices.length - 1
    for (let i = 0; i < numSides; i++) {
      const nextIndex = (i + 1) % vertices.length;
      this.p5.beginShape();
      this.p5.vertex(vertices[i].x, vertices[i].y, 0);
      this.p5.vertex(vertices[nextIndex].x, vertices[nextIndex].y, 0);
      this.p5.vertex(vertices[nextIndex].x, vertices[nextIndex].y, -depth);
      this.p5.vertex(vertices[i].x, vertices[i].y, -depth);
      this.p5.endShape(this.p5.CLOSE);
    }
  }

  drawRope(shape: TLShape, toShape: TLShape) {
    const geo = this.editor.getShapeGeometry(shape)
    const segments = 20; // Number of segments in the rope
    const sag = 1000; // How much the rope sags
    const strokeWeight = 20; // how thick the lines are
    const strokeColor: p5.Color = this.p5.color(250, 50, 50);

    this.p5.push(); // Save the current drawing state

    // Adjust for the shape's position and rotation
    this.p5.translate(geo.bounds.w / 2, geo.bounds.h / 2);
    this.p5.rotateZ(-shape.rotation);

    const centerVec = this.centerToCenter(shape, toShape);

    this.p5.stroke(strokeColor);
    this.p5.strokeWeight(strokeWeight); // Set a thick stroke
    this.p5.noFill();

    this.p5.beginShape();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = this.p5.lerp(0, centerVec.x, t);
      const y = this.p5.lerp(0, centerVec.y, t);
      const parabola = sag * Math.sin(Math.PI * t); // Simple parabolic equation for sag
      const col = this.p5.lerpColor(strokeColor, this.p5.color('red'), t);
      this.p5.stroke(col);
      this.p5.vertex(x, y, -parabola);
    }
    this.p5.endShape();
    this.p5.pop(); // Restore the original drawing state
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
}