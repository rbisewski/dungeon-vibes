uniform float uTime; varying vec2 vUv; varying float vSeed;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x), mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x), f.y); }
void main(){
  float t = uTime*2.3 + vSeed*17.0;
  float y = clamp((vUv.y-0.16)/0.84, 0.0, 1.0);
  float n = n2(vec2(vUv.x*4.0 + vSeed*5.0, y*3.0 - t*1.9))*0.6 + n2(vec2(vUv.x*9.0, y*7.0 - t*3.4))*0.4;
  float x = (vUv.x-0.5)*2.0 + (n-0.5)*0.9*y;
  float taper = mix(0.62, 0.04, pow(y, 0.9));
  float body = 1.0 - smoothstep(taper*0.35, taper, abs(x));
  float f = body * smoothstep(1.0, 0.3, y + n*0.5) * smoothstep(0.0, 0.1, y + 0.05);
  vec3 col = mix(vec3(0.9,0.16,0.02), vec3(1.0,0.6,0.16), smoothstep(0.1,0.6,f));
  col = mix(col, vec3(1.0,0.93,0.72), smoothstep(0.6,0.95,f));
  float halo = exp(-length(vec2((vUv.x-0.5)*2.0, (vUv.y-0.32)*1.6))*3.0)*0.28;
  gl_FragColor = vec4(col*f*2.6 + vec3(1.0,0.42,0.1)*halo, 1.0);
}
