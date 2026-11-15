// Separable 9-tap Gaussian using 5 bilinear taps.
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tColor, vUv).rgb*0.2270270270;
  c += (texture2D(tColor, vUv+uDir*1.3846153846).rgb + texture2D(tColor, vUv-uDir*1.3846153846).rgb)*0.3162162162;
  c += (texture2D(tColor, vUv+uDir*3.2307692308).rgb + texture2D(tColor, vUv-uDir*3.2307692308).rgb)*0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}
