## tldraw-3d
A simple 3D 'underlay' for tldraw. 

The idea is simple: The UX of 2D canvases can be great, but that doesn't mean we can't use that third spare dimension for feedback. The underlay is a 3D scene which is aligned to the 2D canvas and rendered underneath it.

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