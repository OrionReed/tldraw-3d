## A 3D 'Underlay' for tldraw

The idea is simple: 2D canvases can be great, but there's a whole dimension spare! What if we could use that third dimension for feedback, better legibility, or to allow for the creation of semantics which are not possible (or less useful) in 2D alone?

The underlay binds a 3D scene to the 2D canvas and renders it behind the 2D scene.

3 small examples:
- GeoUnderlay: Show shape geometry as a 3D "tower"
- HistoryUnderlay: Show shape history in the third dimension
- EdgeUnderlay: Show shape edges (i.e. arrows) between shapes with a parabolic curve


https://github.com/OrionReed/tldraw-3d/assets/16704290/bbb2b225-3857-43ea-9337-5dfb9bfafd4d


### Setup
```bash
yarn
yarn dev
```

To create a new underlay, you can create a new class which extends `UnderlayBase`. Then register the new underlay in `src/App.tsx`:
```ts
const underlays = [GeoUnderlay, HistoryUnderlay, ..., YourFancyNewUnderlay];
```
All you need to do is provide the underlay with a `name` and a `render` function. The `render` function should take a p5 sketch and a list of shapes and render to that sketch. The `UnderlayRenderer` will handle the rest.