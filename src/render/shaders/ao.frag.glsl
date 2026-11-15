// Ambient occlusion from the depth buffer (Alchemy AO). The camera is orthographic, so view-space positions follow
// directly from screen position and linear depth.
uniform sampler2D tDepth;
uniform vec2 uRes, uHalf;
uniform float uNear, uFar, uRadius, uIntensity;
varying vec2 vUv;
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).r; return vec3((uv*2.0-1.0)*uHalf, -(uNear + d*(uFar-uNear))); }
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d0 = texture2D(tDepth, vUv).r;
  if(d0 > 0.9995){ gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec2 px = 1.0/uRes;
  // normal from the nearer neighbour on each axis, so silhouettes do not bend it
  vec3 r = viewPos(vUv+vec2(px.x,0.0)), l = viewPos(vUv-vec2(px.x,0.0)), u = viewPos(vUv+vec2(0.0,px.y)), d = viewPos(vUv-vec2(0.0,px.y));
  vec3 dx = abs(r.z-P.z) < abs(P.z-l.z) ? r-P : P-l;
  vec3 dy = abs(u.z-P.z) < abs(P.z-d.z) ? u-P : P-d;
  vec3 N = normalize(cross(dx, dy));
  float rot = ign(gl_FragCoord.xy)*6.2831853;
  vec2 ruv = uRadius/(2.0*uHalf);
  float occ = 0.0;
  for(int i=0;i<14;i++){
    float fi = float(i)+0.5;
    float a = fi*2.39996323 + rot;
    vec3 v = viewPos(vUv + vec2(cos(a), sin(a))*sqrt(fi/14.0)*ruv) - P;
    float vv = dot(v, v);
    occ += max(dot(v, N) - 0.03, 0.0)/(vv + 0.015) * smoothstep(uRadius*uRadius*6.0, uRadius*uRadius*2.0, vv);
  }
  gl_FragColor = vec4(clamp(1.0 - occ*uIntensity/14.0, 0.0, 1.0));
}
