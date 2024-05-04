import { Editor, TLShape } from "tldraw";
import p5 from "p5";

export abstract class UnderlayBase {
  abstract name: string;
  protected editor: Editor;

  /** Called once per frame and passed the current p5 sketch and all shapes */
  abstract render(sketch: p5, shapes: TLShape[]): void;
  constructor(editor: Editor) {
    this.editor = editor;
  }
}