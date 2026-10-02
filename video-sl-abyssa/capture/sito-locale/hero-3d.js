import * as THREE from './assets/three.module.min.js';

// Original procedural jellyfish: volumetric bell, internal organs, oral arms
// and tubular tentacles. No photograph, video or flat sprite forms the animal.
export function initHero(container, initiallyPaused = false) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' }); }
  catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x03121b);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Animated three-dimensional jellyfish swimming through deep blue water, with a pulsing translucent bell and flowing tentacles');
  container.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
  camera.position.set(0, .1, 11);
  const time = { value: 0 }, jellyfish = [];
  const motion = `
    vec3 swim(vec3 p, float phase) {
      float d = max(0., -p.y);
      float pulse = sin(uTime * 1.65 + phase);
      p.xz *= 1. + .045 * pulse * exp(-d * .4);
      p.y += max(p.y,0.) * .11 * sin(uTime * 1.65 + phase - .5);
      p.x += sin(d * 1.9 - uTime * 1.2 + phase) * d * .065;
      p.z += sin(d * 2.2 - uTime * .95 + phase + 1.) * d * .048;
      return p;
    }`;
  function material(phase, kind, opacity = 1) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: time, uPhase: { value: phase }, uKind: { value: kind }, uOpacity: { value: opacity } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; uniform float uPhase; varying vec3 vNormal; varying vec3 vEye; varying vec2 vUv; varying vec3 vPos; ${motion}
        void main(){vUv=uv;vec3 p=swim(position,uPhase);vPos=p;vec4 mv=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform float uTime;uniform float uPhase;uniform float uKind;uniform float uOpacity;varying vec3 vNormal;varying vec3 vEye;varying vec2 vUv;varying vec3 vPos;
        void main(){float fresnel=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.6);
        float rib=pow(max(0.,cos(vUv.x*6.283185*32.+sin(vUv.y*13.)*.25)),28.);
        float rim=pow(1.-vUv.y,17.);float cell=sin(vUv.x*210.+sin(vUv.y*29.)*2.)*sin(vUv.y*150.);
        vec3 blue=mix(vec3(.008,.15,.35),vec3(.05,.7,1.),fresnel);
        float alpha=.16+fresnel*.52;
        if(uKind<.5){blue+=vec3(.015,.15,.24)*rib*(1.-vUv.y);blue+=vec3(.02,.42,.65)*rim;alpha+=rib*.055+rim*.18+cell*.009;}
        else{blue=mix(vec3(.025,.24,.43),vec3(.21,.85,1.),fresnel*.7+.2);alpha=.32+fresnel*.38;alpha*=smoothstep(-5.6,-1.2,vPos.y);}
        gl_FragColor=vec4(blue,alpha*uOpacity);}`
    });
  }
  function bellGeometry() {
    const vertices=[],uv=[],indices=[], around=96, rings=36;
    for(let j=0;j<=rings;j++)for(let i=0;i<=around;i++){
      const t=j/rings, a=i/around*Math.PI*2, theta=t*Math.PI*.5;
      const scallop=1.+.018*Math.cos(a*16.)*Math.pow(t,8);
      const r=1.34*Math.sin(theta)*scallop;
      vertices.push(Math.cos(a)*r,.83*Math.cos(theta)-.06*Math.pow(t,8)*Math.cos(a*16.),Math.sin(a)*r);
      uv.push(i/around,1-t);
      if(j<rings&&i<around){const k=j*(around+1)+i;indices.push(k,k+around+1,k+1,k+1,k+around+1,k+around+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const bellShape=bellGeometry();
  function buildJelly(phase, detail) {
    const group=new THREE.Group(), skin=material(phase,0), tissue=material(phase,1,.78);
    group.add(new THREE.Mesh(bellShape,skin));
    const inner=new THREE.Mesh(bellShape,material(phase,0,.26));inner.scale.set(.94,.85,.94);inner.position.y=-.035;group.add(inner);
    // Four folded internal gonads, seen through the transparent bell.
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2,points=[];
      for(let n=0;n<=56;n++){const t=n/56*Math.PI*2;const r=.26*(1+.13*Math.cos(3*t));points.push(new THREE.Vector3(Math.cos(a)*.31+Math.cos(t)*r,.3+.065*Math.sin(t*2),Math.sin(a)*.31+Math.sin(t)*r));}
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),56,.021,5,true),tissue));
    }
    // Tentacles have circular cross-sections and occupy multiple depth planes.
    for(let k=0;k<detail;k++){
      const a=k/detail*Math.PI*2, length=2.65+1.8*(.5+.5*Math.sin(k*7.23)), points=[];
      const r=1.26;
      for(let n=0;n<=48;n++){const f=n/48,d=f*length;points.push(new THREE.Vector3(Math.cos(a)*r*(1-f*.27)+Math.sin(d*3.1+k)*.055*f,-d,Math.sin(a)*r*(1-f*.2)+Math.cos(d*2.6+k)*.07*f));}
      const tube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,k%4===0?.013:.006,4,false);
      // Taper the distal end without changing the geometry every frame.
      group.add(new THREE.Mesh(tube,material(phase+k*.19,1,k%4===0?.75:.46)));
    }
    // Eight pleated oral arms, surfaces with a real curled cross-section.
    for(let k=0;k<8;k++){
      const pos=[],uv=[],idx=[],a=k*Math.PI/4;
      for(let j=0;j<=64;j++)for(let s=0;s<=6;s++){
        const f=j/64,d=f*(2.7+(k%3)*.27),v=s/6-.5;
        const angle=a+d*.72, r=.18+f*.12;
        const width=(.12+.07*Math.sin(d*6+k))*(1-f*.8);
        pos.push(Math.cos(angle)*r+Math.cos(angle+1.57)*v*width*2,-d+.03*Math.sin(v*12+d*13)*f,Math.sin(angle)*r+Math.sin(angle+1.57)*v*width*2);
        uv.push(s/6,f);if(j<64&&s<6){const q=j*7+s;idx.push(q,q+7,q+1,q+1,q+7,q+8);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();group.add(new THREE.Mesh(g,material(phase+k*.07,1,.46)));
    }
    scene.add(group);jellyfish.push({group,phase});return group;
  }
  const main=buildJelly(0,40), distant=buildJelly(2,16), far=buildJelly(4,12);
  distant.scale.setScalar(.29);far.scale.setScalar(.16);
  distant.position.set(6,2.6,-7);far.position.set(-5.5,3.8,-10);
  [distant,far].forEach(g=>g.traverse(o=>{if(o.material?.uniforms?.uOpacity)o.material.uniforms.uOpacity.value*=.3;}));
  // A physical seabed plane, with animated interference caustics and distance haze.
  const seabed=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShaderMaterial({
    uniforms:{uTime:time},vertexShader:`varying vec3 p;void main(){vec4 w=modelMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float uTime;varying vec3 p;
    void main(){vec2 q=p.xz*.67;float w=sin(q.x*2.4+sin(q.y*2.+uTime*.17))+sin(q.y*2.3+sin(q.x*1.6-uTime*.16));float c=pow(1.-abs(sin(w*2.)),12.);float haze=exp(-length(p.xz-vec2(2.,3.))*.08);vec3 col=vec3(.011765,.070588,.105882)+vec3(.009,.09,.14)*c*haze;gl_FragColor=vec4(col,1.);}`
  }));seabed.rotation.x=-Math.PI/2;seabed.position.y=-4;scene.add(seabed);
  // A single GPU particle field, not hundreds of DOM elements.
  const particles=new THREE.BufferGeometry(),points=[];
  let seed=87;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  for(let i=0;i<260;i++)points.push((random()-.5)*26,(random()-.5)*16,random()*-20+4);
  particles.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const dust=new THREE.Points(particles,new THREE.ShaderMaterial({uniforms:{uTime:time},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime;varying float fade;void main(){vec3 p=position;p.y=mod(p.y+8.+uTime*.035,16.)-8.;p.x+=sin(uTime*.12+p.y)*.12;vec4 mv=modelViewMatrix*vec4(p,1.);fade=clamp(3./-mv.z,.1,.65);gl_PointSize=clamp(15./-mv.z,1.,3.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float fade;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.25,.7,.85,smoothstep(.5,.06,r)*fade);}`}));scene.add(dust);
  let paused=initiallyPaused,visible=true,raf=0,last=0,elapsed=0,px=0,py=0,sx=0,sy=0,scroll=0,disposed=false;
  let mainX=3,mainY=1.1;
  function render(){renderer.render(scene,camera);}
  function pose(dt=0){
    const ease=1-Math.exp(-dt*3);sx+=(px-sx)*ease;sy+=(py-sy)*ease;
    main.position.set(mainX+sx*.45,mainY+Math.sin(elapsed*.7)*.13+scroll*.35,0);
    main.rotation.set(.43+sy*.11,.12+Math.sin(elapsed*.3)*.14+sx*.22,-.12+Math.sin(elapsed*.55)*.055);
    distant.position.y=2.6+Math.sin(elapsed*.5+2)*.2;distant.rotation.set(.2,.2,-.22);
    far.position.y=3.8+Math.sin(elapsed*.4+4)*.16;far.rotation.z=.18;
    time.value=elapsed;render();
  }
  function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const viewW=2*11*Math.tan(43*Math.PI/360)*camera.aspect;const mobile=w<701;mainX=viewW*(mobile?.29:.30);mainY=mobile?.15:1.1;main.scale.setScalar(mobile?.78:1);distant.visible=!mobile;far.visible=!mobile;pose();}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  function tick(t){raf=0;if(disposed||paused||!visible||document.hidden)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;elapsed+=dt;pose(dt);raf=requestAnimationFrame(tick);}
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function start(){if(!disposed&&!raf&&!paused&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
  function pointer(e){if(paused)return;const r=container.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;}
  function leave(){px=py=0;}
  const hero=container.parentElement;
  hero.addEventListener('pointermove',pointer,{passive:true});hero.addEventListener('pointerleave',leave);
  function onScroll(){if(!paused)scroll=Math.min(1,Math.max(0,-hero.getBoundingClientRect().top/hero.clientHeight));}
  window.addEventListener('scroll',onScroll,{passive:true});
  function onMotion(e){paused=e.detail;paused?stop():start();}
  document.addEventListener('abyssa-motion',onMotion);
  function visibility(){document.hidden?stop():start();}document.addEventListener('visibilitychange',visibility);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?start():stop();});intersection.observe(hero);
  function lost(e){e.preventDefault();stop();hero.classList.remove('hero-3d-ready');}canvas.addEventListener('webglcontextlost',lost);
  function restored(){resize();hero.classList.add('hero-3d-ready');start();}canvas.addEventListener('webglcontextrestored',restored);
  function dispose(){if(disposed)return;disposed=true;stop();observer.disconnect();intersection.disconnect();hero.removeEventListener('pointermove',pointer);hero.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',onScroll);document.removeEventListener('abyssa-motion',onMotion);document.removeEventListener('visibilitychange',visibility);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();}
  window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
  pose();hero.classList.add('hero-3d-ready');start();
  return {dispose};
}
