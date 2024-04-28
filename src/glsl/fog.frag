precision highp float;
varying vec2 vTexCoord;
uniform sampler2D img;
uniform sampler2D depth;
uniform vec3 fog;
void main() {
  gl_FragColor = mix(
    // Original color
    texture2D(img, vTexCoord),
    // Fog color
    vec4(fog/255., 1.),
    // Mix between them based on the depth.
    // The pow() makes the light falloff a bit steeper.
    pow(texture2D(depth, vTexCoord).r, 6.)
  );
}