/* SD Orb, variant C: analytic ribbons. Raw WebGL1, no deps.
   Mounts a canvas into every [data-orb]; window.SDOrb.setEnergy(0..1). */
(function () {
  'use strict';
  var W = window, D = document;
  function mq(q) { try { return !!(W.matchMedia && W.matchMedia(q).matches); } catch (e) { return false; } }

  var FREEZE = typeof W.__ORB_FREEZE_T === 'number';
  var STILL = FREEZE || mq('(prefers-reduced-motion: reduce)');
  var HOVER = mq('(hover:hover)');
  var MOBILE = mq('(pointer:coarse)') || W.innerWidth < 768;
  var DPR = Math.min(W.devicePixelRatio || 1, MOBILE ? 1.5 : 2);
  var TAU = Math.PI * 2, R_SPHERE = 0.34, PULSE_T = 3.5, MAX_TILT = 0.14; // ~8 deg
  var NR_HI = 8, NR_LO = 5;
  var ATTR = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };

  // Ribbons: normal(3), offset c, width, brightness, wobble amp, wobble freq,
  // precession axis(3), precession rad/s, comet (flow along ring) rad/s.
  // First NR_LO are kept in low quality, so the hero bundle comes first.
  var RINGS = [
    [ 0.38, -0.62, 0.62,  0.00, 0.026, 1.30, 0.015, 5.0,  0.55, -0.35, 0.75,  0.35,  0.9],
    [ 0.34, -0.66, 0.60, -0.09, 0.012, 0.90, 0.025, 4.0,  0.55, -0.35, 0.75,  0.41,  1.1],
    [ 0.15,  0.25, 1.00,  0.42, 0.014, 0.90, 0.030, 6.0,  0.00, 0.00, 1.0, -0.22, -0.8],
    [ 0.42, -0.58, 0.64,  0.08, 0.007, 0.75, 0.020, 6.0,  0.50, -0.30, 0.80,  0.30,  0.8],
    [-0.20, -0.10, 1.00,  0.30, 0.008, 0.70, 0.040, 5.0,  0.00, 0.00, 1.0,  0.18,  1.2],
    [ 0.30, -0.70, 0.55, -0.17, 0.006, 0.60, 0.030, 7.0,  0.60, -0.40, 0.70,  0.47, -0.7],
    [-0.70, -0.30, 0.50,  0.05, 0.008, 0.40, 0.030, 4.0,  1.00, 0.30, 0.2, -0.20,  0.6],
    [ 0.10,  0.90, 0.40,  0.10, 0.006, 0.35, 0.030, 5.0,  0.40, 1.00, -0.2, 0.25, -1.3]
  ];

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;',
    'uniform vec4 uM;', // pulse, energy, px (sphere units), unused
    'uniform vec4 uH;', // hotspot: cos b, sin b, cos 2a, sin 2a
    'uniform vec4 uA[NR];', // ring normal, offset
    'uniform vec4 uB[NR];', // ring flow dir, wobble phase
    'uniform vec4 uC[NR];', // width, bright, wobble amp, wobble freq
    'uniform mat3 uN;', // shimmer rotation
    'const vec3 CORE=vec3(.01,.05,.22),DEEP=vec3(.01,.10,.60),ELEC=vec3(.04,.36,1.),CYAN=vec3(.10,.72,1.),HOT=vec3(.91,.965,1.);',
    'float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
    ' return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),',
    '  mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    // angular distance of P to each wobbling ring -> (hot core, soft glow)
    // pz: screen-space slope of the surface, so line width never drops below a pixel near the limb (analytic AA)
    'vec2 rib(vec3 P,float px){vec2 g=vec2(0.);vec2 pz=P.xy/(P.z>0.?max(P.z,.03):min(P.z,-.03));',
    ' for(int i=0;i<NR;i++){vec4 a=uA[i],b=uB[i],c=uC[i];',
    '  float wv=sin(c.w*dot(P,cross(a.xyz,b.xyz))+b.w);',
    '  float s=dot(P,a.xyz)-a.w-c.z*wv;',
    '  float pw=px*length(a.xy-a.z*pz);',
    '  float w0=c.x*(.7+.3*wv),w=max(w0,pw),q=s*s/(w*w);', // width breathes with the wobble: twisting-ribbon look
    '  float t=(abs(s)-2.6*w)/max(.4*w,.8*pw);', // thin companion strands either side
    '  float k=.5+.5*dot(P,b.xyz);k=c.y*(.15+.85*k*k*k)*sqrt(w0/w);',
    '  g+=k*vec2(exp(-q)+.35*exp(-t*t),exp(-q*.025));}',
    ' return g;}',
    'void main(){',
    ' float pulse=uM.x,E=uM.y,sc=1.+.02*pulse,px=uM.z/sc,br=.86+.28*pulse;',
    ' vec2 p=(gl_FragCoord.xy-.5*uRes)/(' + R_SPHERE + '*min(uRes.x,uRes.y)*sc);',
    ' float r=length(p),d=max(r-1.,0.);',
    // outer halo, forced to 0 well before the canvas edge (1.47)
    ' float fd=smoothstep(.42,0.,d);',
    ' float kh=1.-.3*E;',
    ' vec3 col=(ELEC*.55*exp(-d*24./kh)+ELEC*.7*exp(-d*6./kh)+DEEP*.9*exp(-d*2.2/kh))*fd*br*(1.+.5*E);',
    ' float m=smoothstep(1.+px,1.-px,r);',
    ' vec2 dr=p/max(r,1e-4);',
    ' float h2=.5+.5*((dr.x*dr.x-dr.y*dr.y)*uH.z+2.*dr.x*dr.y*uH.w),h1=max(dot(dr,uH.xy),0.);',
    ' float hot=h2*h2*h2*.7+h1*h1*.6;',
    ' if(r<1.+px){',
    '  float z=sqrt(max(1.-r*r,0.)),f=1.-z;',
    '  vec3 P=vec3(p,z),Q=vec3(p,-z);',
    '  vec3 c=mix(DEEP*1.05,DEEP*1.5+ELEC*.12,f);',
    '  c+=(DEEP+ELEC)*.28*smoothstep(.15,-1.1,p.y)*(.3+.7*f);',
    '  c+=ELEC*.25*smoothstep(-.1,-1.,p.x)*f;',
    '  float lb=1.+f*f;',
    '  vec2 gF=rib(P,px)*lb,gB=rib(Q,px)*lb;',
    '#ifndef LQ',
    '  float n=vn(uN*P*2.6);gF*=.5+n;c*=.45+1.1*n;',
    '#endif',
    '  float ie=1.+.4*E;',
    '  c+=(CYAN*gF.x*2.6+ELEC*gF.y*.4+HOT*max(gF.x-1.5,0.)*.25)*ie;',
    '  c+=(ELEC*(gB.x*.45+gB.y*.35))*ie*(.6+.4*z);',
        '  float f2=f*f,f3=f2*f,f8=f3*f3*f2;',
    '  c+=((ELEC*.8*f2+CYAN*1.2*f3)*(1.+.9*E)*(.35+hot)+HOT*f8*hot*hot*.8*(1.+.8*E))*br;',
    '  col=mix(col,c,m);',
    ' }',
    ' float e=(r-1.)/.016;',
    ' col+=(CYAN*(.25+1.6*hot)+HOT*.12*hot)*exp(-e*e)*br*(1.+.5*E);',
    // per-channel tone map: low-red blues ramp to cyan as they get brighter, never grey
    ' col=1.-exp(-col*1.1);',
    ' gl_FragColor=vec4(col,max(m,max(col.r,max(col.g,col.b))));',
    '}'
  ].join('\n');

  // ---- ring math (JS side, per frame; shader only does dot products) ----
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function rot(ax, ang, v) { // Rodrigues
    var c = Math.cos(ang), s = Math.sin(ang), k = (ax[0] * v[0] + ax[1] * v[1] + ax[2] * v[2]) * (1 - c), x = cross(ax, v);
    return [v[0] * c + x[0] * s + ax[0] * k, v[1] * c + x[1] * s + ax[1] * k, v[2] * c + x[2] * s + ax[2] * k];
  }
  var RG = RINGS.map(function (q) {
    var n = norm([q[0], q[1], q[2]]);
    return { n: n, e: norm(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), ax: norm([q[8], q[9], q[10]]), w: q[11], s: q[12], c: q[3] };
  });
  var UC = new Float32Array(NR_HI * 4), UA = new Float32Array(NR_HI * 4), UB = new Float32Array(NR_HI * 4), UN = new Float32Array(9);
  RINGS.forEach(function (q, i) { UC.set([q[4], q[5], q[6], q[7]], i * 4); });
  var NAX = norm([0.3, 1, 0.2]);

  function tilt(v, ty, tx) { // Ry(ty) * Rx(tx)
    var cx = Math.cos(tx), sx = Math.sin(tx), cy = Math.cos(ty), sy = Math.sin(ty);
    var y = v[1] * cx - v[2] * sx, z = v[1] * sx + v[2] * cx;
    return [v[0] * cy + z * sy, y, -v[0] * sy + z * cy];
  }
  function rings(ph, ty, tx) {
    for (var i = 0; i < NR_HI; i++) {
      var g = RG[i], a = g.w * ph, n = rot(g.ax, a, g.n), e = rot(g.ax, a, g.e), e2 = cross(n, e);
      var b = g.s * ph, cb = Math.cos(b), sb = Math.sin(b);
      var u = [e[0] * cb + e2[0] * sb, e[1] * cb + e2[1] * sb, e[2] * cb + e2[2] * sb];
      n = tilt(n, ty, tx); u = tilt(u, ty, tx);
      UA.set([n[0], n[1], n[2], g.c], i * 4);
      UB.set([u[0], u[1], u[2], ((0.8 + 0.13 * i) * ph + i * 1.7) % TAU], i * 4); // wrapped: GPU sin() is imprecise for big args
    }
  }
  function noiseRot(ph) {
    var a = ph * 0.45;
    UN.set(rot(NAX, a, [1, 0, 0]), 0); UN.set(rot(NAX, a, [0, 1, 0]), 3); UN.set(rot(NAX, a, [0, 0, 1]), 6);
  }

  // ---- state ----
  var orbs = [], raf = 0, last = 0, clock = 0, phase = 0, energy = 0, eTarget = 0;
  var lq = false, scale = 1, fCount = 0, fSum = 0;

  function build(o) {
    var gl = o.gl, nr = lq ? NR_LO : NR_HI;
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; }
    var p = gl.createProgram(), v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, '#define NR ' + nr + '\n' + (lq ? '#define LQ\n' : '') + FS);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { gl.deleteProgram(p); return false; }
    if (o.prog) gl.deleteProgram(o.prog);
    o.prog = p; o.nr = nr; o.u = {};
    ['uRes', 'uM', 'uH', 'uA', 'uB', 'uC', 'uN'].forEach(function (k) { o.u[k] = gl.getUniformLocation(p, k); });
    gl.useProgram(p);
    gl.uniform4fv(o.u.uC, UC.subarray(0, nr * 4));
    return true;
  }
  function setup(o) {
    var gl = o.gl;
    o.prog = null;
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return build(o);
  }
  function fail(o) {
    o.dead = true;
    if (o.cv.parentNode) o.cv.parentNode.removeChild(o.cv);
    o.el.classList.add('is-fallback');
  }
  function resize(o) {
    if (o.dead) return;
    var w = Math.max(1, Math.round(o.el.clientWidth * DPR * scale)), h = Math.max(1, Math.round(o.el.clientHeight * DPR * scale));
    var changed = o.cv.width !== w || o.cv.height !== h;
    if (changed) { o.cv.width = w; o.cv.height = h; }
    if (changed || STILL) draw(o); // resizing clears the canvas; repaint now, not next frame
  }
  function draw(o) {
    var gl = o.gl, u = o.u, w = o.cv.width, h = o.cv.height;
    if (o.dead || o.lost || !o.prog || gl.isContextLost()) return;
    var pulse = 0.5 + 0.5 * Math.sin(TAU * clock / PULSE_T);
    var a = 0.15 + 0.3 * Math.sin(clock * 0.31), b = 3.2 + 0.5 * Math.sin(clock * 0.23);
    rings(phase, o.ty, o.tx);
    gl.viewport(0, 0, w, h);
    gl.uniform2f(u.uRes, w, h);
    gl.uniform4f(u.uM, pulse, energy, 1 / (R_SPHERE * Math.min(w, h)), 0);
    gl.uniform4f(u.uH, Math.cos(b), Math.sin(b), Math.cos(2 * a), Math.sin(2 * a));
    gl.uniform4fv(u.uA, UA.subarray(0, o.nr * 4));
    gl.uniform4fv(u.uB, UB.subarray(0, o.nr * 4));
    gl.uniformMatrix3fv(u.uN, false, UN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---- loop ----
  function running() {
    if (STILL || D.hidden) return false;
    for (var i = 0; i < orbs.length; i++) if (orbs[i].vis && !orbs[i].dead && !orbs[i].lost) return true;
    return false;
  }
  function kick() { if (!raf && running()) { last = 0; raf = requestAnimationFrame(tick); } }
  function degrade() {
    lq = true; scale = 0.7;
    orbs.forEach(function (o) { if (!o.dead && !o.lost) { build(o); resize(o); } });
  }
  function tick(now) {
    raf = 0;
    if (!running()) return;
    var ms = last ? now - last : 0, dt = Math.min(ms / 1000, 0.1);
    last = now;
    if (!lq && ms > 0 && ++fCount > 10) { // skip warm-up, then average 90 frames
      fSum += ms;
      if (fCount === 100 && fSum / 90 > 20) degrade();
    }
    clock += dt;
    energy += (eTarget - energy) * (1 - Math.exp(-dt / 0.15)); // ~0.6 s settle
    phase += dt * (1 + 1.4 * energy);
    noiseRot(phase);
    var k = 1 - Math.exp(-dt / 0.25);
    orbs.forEach(function (o) {
      o.tx += (o.ttx - o.tx) * k; o.ty += (o.tty - o.ty) * k;
      if (o.vis) draw(o);
    });
    raf = requestAnimationFrame(tick);
  }

  function mount(el) {
    var cv = D.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;top:0;left:0;width:100%;height:100%;display:block;pointer-events:none';
    el.appendChild(cv);
    var o = { el: el, cv: cv, gl: null, vis: true, tx: 0, ty: 0, ttx: 0, tty: 0 };
    try { o.gl = cv.getContext('webgl', ATTR) || cv.getContext('experimental-webgl', ATTR); } catch (e) { o.gl = null; }
    try { if (!o.gl || !setup(o)) { fail(o); return; } } catch (e) { fail(o); return; }
    orbs.push(o);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); o.lost = true; o.prog = null; }, false);
    cv.addEventListener('webglcontextrestored', function () {
      o.lost = false;
      try { if (!setup(o)) { if (!o.gl.isContextLost()) fail(o); return; } } catch (e) { fail(o); return; }
      resize(o); kick();
    }, false);
    if (W.ResizeObserver) new ResizeObserver(function () { resize(o); }).observe(el);
    else W.addEventListener('resize', function () { resize(o); });
    if (W.IntersectionObserver) new IntersectionObserver(function (en) { o.vis = en[en.length - 1].isIntersecting; kick(); }).observe(el);
    resize(o);
  }

  function start() {
    if (FREEZE) { clock = phase = W.__ORB_FREEZE_T; }
    else if (STILL) { clock = phase = 1.2; }
    noiseRot(phase);
    var els = D.querySelectorAll('[data-orb]');
    for (var i = 0; i < els.length; i++) mount(els[i]);
    D.addEventListener('visibilitychange', kick);
    if (HOVER && !STILL) {
      W.addEventListener('pointermove', function (e) {
        orbs.forEach(function (o) {
          var r = o.el.getBoundingClientRect();
          var dx = (e.clientX - r.left - r.width / 2) / (W.innerWidth / 2), dy = (e.clientY - r.top - r.height / 2) / (W.innerHeight / 2);
          o.tty = Math.max(-1, Math.min(1, dx)) * MAX_TILT;
          o.ttx = Math.max(-1, Math.min(1, dy)) * MAX_TILT;
        });
      }, { passive: true });
      D.addEventListener('pointerout', function (e) { if (!e.relatedTarget) orbs.forEach(function (o) { o.ttx = o.tty = 0; }); });
    }
    kick();
  }

  W.SDOrb = {
    setEnergy: function (v) {
      v = +v; eTarget = v > 0 ? (v < 1 ? v : 1) : 0;
      if (STILL) { energy = eTarget; orbs.forEach(draw); } // still frame: jump, no animation
    }
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
