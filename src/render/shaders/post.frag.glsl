uniform sampler2D tColor; uniform sampler2D tDepth;
uniform vec2 uRes; uniform float uFocusY, uFocusD, uTime, uMaxR, uExposure;
varying vec2 vUv;
float bayer2(vec2 a){ a=floor(a); return fract(a.x*0.5 + a.y*a.y*0.75); }
float bayer4(vec2 a){ return bayer2(0.5*a)*0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5*a)*0.25 + bayer2(a); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float coc(vec2 uv, float d){
  float dy = abs(uv.y - uFocusY);
  float cy = smoothstep(0.065, 0.44, dy);
  float cz = smoothstep(0.02, 0.12, abs(d - uFocusD)) * smoothstep(0.03, 0.18, dy);
  return clamp(max(cy*cy*0.55 + cy*0.45, cz*0.6), 0.0, 1.0);
}
void main(){
  vec2 pix = floor(vUv*uRes);
  vec2 uv = (pix+0.5)/uRes;
  float d0 = texture2D(tDepth, uv).r;
  float c0 = coc(uv, d0);
  vec3 col = texture2D(tColor, uv).rgb;
  if(c0 > 0.01){
    vec3 acc = col; float ws = 1.0; float R0 = c0*uMaxR;
    for(int i=0;i<32;i++){
      float fi = float(i)+0.5;
      float r = sqrt(fi/32.0)*R0;
      float a = fi*2.39996323;
      vec2 su = uv + vec2(cos(a),sin(a))*r/uRes;
      float sc = coc(su, texture2D(tDepth, su).r)*uMaxR;
      float w = clamp(sc - r + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, su).rgb*w; ws += w;
    }
    col = acc/ws;
  }
  col *= uExposure;
  col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(1.0/2.2));
  float l = dot(col, vec3(0.299,0.587,0.114));
  vec3 cold = vec3(l)*vec3(0.80,0.90,1.10);
  col = mix(col, cold, (1.0 - smoothstep(0.06, 0.42, l))*0.6);
  col = mix(col, col*vec3(1.06,0.98,0.86), smoothstep(0.3,0.85,l)*0.45);
  col = col*0.95 + vec3(0.016,0.021,0.032);
  vec2 q = (vUv-0.5)*vec2(1.0,1.15);
  col *= clamp(1.0 - dot(q,q)*1.15, 0.0, 1.0)*0.85 + 0.15*smoothstep(0.9,0.0,length(q));
  col += (hash(pix + fract(uTime*7.3)*vec2(131.7,71.3)) - 0.5)*0.03;
  float L = 30.0;
  col = floor(col*L + bayer8(pix)) / L;
  gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
}
