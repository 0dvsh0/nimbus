/* ==========================================================================
   Living sky — WebGL fragment shader.
   The original artwork is used as a texture and gently domain-warped by
   flowing fbm noise so the clouds breathe. Ink contour lines (iso-lines of
   the noise field) echo the hand-drawn swirls. The pointer stirs the sky.
   Falls back to the static CSS background if WebGL is unavailable.
   ========================================================================== */
(function () {
  const canvas = document.getElementById("sky");
  if (!canvas) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) return;

  const vert = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uHasTex;
    uniform vec2  uTexSize;
    uniform sampler2D uTex;

    // palette from the artwork
    const vec3 INK    = vec3(0.027, 0.016, 0.047);
    const vec3 NIGHT  = vec3(0.078, 0.043, 0.125);
    const vec3 VIOLET = vec3(0.247, 0.125, 0.388);
    const vec3 ORCHID = vec3(0.525, 0.333, 0.690);
    const vec3 LILAC  = vec3(0.784, 0.682, 0.839);
    const vec3 MOON   = vec3(0.957, 0.922, 0.937);

    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for(int i=0;i<5;i++){ v += a*noise(p); p = m*p; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 st = uv; st.x *= uRes.x / uRes.y;
      float t = uTime * 0.035;

      // pointer influence
      vec2 m = uMouse; m.x *= uRes.x / uRes.y;
      float md = length(st - m);
      float stir = exp(-md*md*7.0);

      // domain warp — the diagonal drift of the clouds (top-left → bottom-right)
      vec2 q = vec2(fbm(st*1.6 + vec2(t, -t*0.6)), fbm(st*1.6 + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(st*1.8 + 3.0*q + vec2(1.7, 9.2) + t*1.4), fbm(st*1.8 + 3.0*q + vec2(8.3, 2.8) - t));
      r += (st - m) * stir * 0.35;
      float f = fbm(st*1.4 + 2.6*r);

      // procedural ink-cloud colour
      vec3 col = mix(NIGHT, VIOLET, smoothstep(0.15, 0.6, f));
      col = mix(col, ORCHID, smoothstep(0.5, 0.78, f) * 0.8);
      col = mix(col, LILAC, smoothstep(0.7, 0.92, f*length(q)*1.35));

      // painted texture, warped by the same field
      if(uHasTex > 0.5){
        float sa = uRes.x/uRes.y, ta = uTexSize.x/uTexSize.y;
        vec2 tuv = uv;
        if(sa > ta){ float s = ta/sa; tuv.y = tuv.y*s + (1.0-s)*0.5; }
        else       { float s = sa/ta; tuv.x = tuv.x*s + (1.0-s)*0.5; }
        tuv.y = 1.0 - tuv.y;
        tuv += (r - 0.5) * 0.028 + (st - m) * stir * 0.02;
        vec3 tex = texture2D(uTex, tuv).rgb;
        col = mix(col, tex, 0.82);
      }

      // ink contour lines — the hand-drawn swirl strokes
      float iso = f * 18.0;
      float line = abs(fract(iso) - 0.5) / fwidthApprox(iso);
      col = mix(col, INK, (1.0 - smoothstep(0.0, 1.2, line)) * 0.22 * smoothstep(0.3, 0.6, f));

      // moonlit rim where the pointer is
      col += LILAC * stir * 0.10;

      // vignette into the night
      float v = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.1, 1.3)));
      col = mix(INK, col, 0.35 + 0.65*v);

      gl_FragColor = vec4(col, 1.0);
    }
  `.replace("fwidthApprox(iso)", "(18.0*0.012)");

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, vert), fs = sh(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("uRes"), uTime = U("uTime"), uMouse = U("uMouse"), uHasTex = U("uHasTex"), uTexSize = U("uTexSize");
  gl.uniform1f(uHasTex, 0);

  // texture
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = () => {
    try {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.uniform2f(uTexSize, img.naturalWidth, img.naturalHeight);
      gl.uniform1f(uHasTex, 1);
    } catch (e) { /* tainted canvas → stay procedural */ }
  };
  img.src = "images/clouds.png";

  let mouse = [0.5, 0.55], target = [0.5, 0.55];
  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  }, { passive: true });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr * 0.75));
    canvas.height = Math.max(1, Math.floor(h * dpr * 0.75));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    mouse[0] += (target[0] - mouse[0]) * 0.04;
    mouse[1] += (target[1] - mouse[1]) * 0.04;
    gl.uniform1f(uTime, reduce ? 10 : (now - t0) / 1000);
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
  document.documentElement.classList.add("has-webgl");
})();
