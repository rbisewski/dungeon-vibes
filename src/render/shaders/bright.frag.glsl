// 2x2 box downsample of the (nearest-filtered) scene with a soft-knee brightness threshold; threshold 0 passes all.
uniform sampler2D tColor;
uniform vec2 uTexel;
uniform float uThreshold, uKnee;
varying vec2 vUv;
void main(){
  vec3 c = 0.25*(texture2D(tColor, vUv+uTexel*vec2(-0.5,-0.5)).rgb + texture2D(tColor, vUv+uTexel*vec2(0.5,-0.5)).rgb
    + texture2D(tColor, vUv+uTexel*vec2(-0.5,0.5)).rgb + texture2D(tColor, vUv+uTexel*vec2(0.5,0.5)).rgb);
  c = min(c, vec3(24.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0*uKnee);
  soft = soft*soft/(4.0*uKnee + 1e-4);
  gl_FragColor = vec4(c*max(soft, br - uThreshold)/max(br, 1e-4), 1.0);
}
