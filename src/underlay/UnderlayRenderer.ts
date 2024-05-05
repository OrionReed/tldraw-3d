import p5 from "p5";
import type { Editor } from "tldraw";
import fogFragmentShader from "@/underlay/glsl/fog.frag?raw";
import fogVertexShader from "@/underlay/glsl/fog.vert?raw";
import type { UnderlayBase } from "@/underlay/UnderlayBase";

/** An "Underlay" is a 3D scene that is drawn under the canvas with aligned coordinates (tldraw is at z=0). */
export class UnderlayRenderer {
  editor: Editor;
  p5: p5;
  width: number;
  height: number;
  underlays: Map<string, UnderlayBase> = new Map();

  constructor(editor: Editor, underlays: (new (editor: Editor) => UnderlayBase)[]) {
    this.editor = editor;
    for (const underlay of underlays) {
      const instance = new underlay(this.editor);
      this.underlays.set(instance.name, instance);
    }
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.createDebugUI();

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
      };

      /** Draw the underlays with a fog shader */
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

        for (const underlay of this.underlays.values()) {
          if (underlay.enabled) {
            underlay.render(sketch, shapes);
          }
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

  // TODO: Move this to a React component
  private createDebugUI() {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'controls';
    document.body.appendChild(controlsDiv);

    for (const name of this.underlays.keys()) {
      const button = document.createElement('button');
      button.textContent = `${name} 🙈`;
      button.addEventListener('click', () => {
        const underlay = this.underlays.get(name);
        if (!underlay) return;
        underlay.enabled = !underlay.enabled;
        button.textContent = `${name} ${underlay.enabled ? '🙈' : '🙉'}`;
      });
      controlsDiv.appendChild(button);
    }
  }
}
