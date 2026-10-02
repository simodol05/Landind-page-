import * as THREE from './assets/three.module.min.js';
export function initScene(container,initialPaused){
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);container.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Three-dimensional model of six aquarium exhibition spaces');renderer.domElement.setAttribute('role','img');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(7.4,7.7,10);camera.lookAt(0,0,0);
 scene.add(new THREE.AmbientLight(0x9bdbd9,2.5));const key=new THREE.DirectionalLight(0xe1ffe9,4);key.position.set(3,8,4);scene.add(key);const rim=new THREE.PointLight(0x35d8ef,45,25);rim.position.set(-4,2,-2);scene.add(rim);
 const model=new THREE.Group();scene.add(model);const floor=new THREE.Mesh(new THREE.CylinderGeometry(5.25,5.4,.14,64),new THREE.MeshStandardMaterial({color:0x102e35,metalness:.65,roughness:.4}));floor.position.y=-.66;model.add(floor);
 const rimRing=new THREE.Mesh(new THREE.TorusGeometry(5.25,.012,8,100),new THREE.MeshBasicMaterial({color:0x55b4b0}));rimRing.rotation.x=Math.PI/2;rimRing.position.y=-.58;model.add(rimRing);
 const grid=new THREE.GridHelper(8.8,16,0x356469,0x234348);grid.position.y=-.57;model.add(grid);
 const loader=new THREE.TextureLoader(),names=['turtle','reef','tunnel','kelp','hero','penguins'],tanks=[];
 const positions=[[-2.5,1.2],[0,1.8],[2.5,1.2],[2.5,-1.5],[0,-2.15],[-2.5,-1.5]];
 const route=new THREE.CatmullRomCurve3(positions.map(([x,z])=>new THREE.Vector3(x,-.44,z)),true,'catmullrom',.15);
 const routeMesh=new THREE.Mesh(new THREE.TubeGeometry(route,100,.035,6,true),new THREE.MeshBasicMaterial({color:0x76d4bb}));model.add(routeMesh);
 const timekeeper={value:0};
 positions.forEach(([x,z],i)=>{
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=(i-2)*.12;model.add(g);
  const base=new THREE.Mesh(new THREE.BoxGeometry(1.95,.22,1.5),new THREE.MeshStandardMaterial({color:0x23545b,metalness:.8,roughness:.25}));base.position.y=-.37;g.add(base);
  const water=new THREE.Mesh(new THREE.BoxGeometry(1.82,1.3,1.37),new THREE.MeshPhysicalMaterial({color:i===4?0x33aabb:0x4caeb3,transparent:true,opacity:.18,roughness:.12,metalness:.1,depthWrite:false,side:THREE.DoubleSide}));water.position.y=.34;g.add(water);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.84,1.33,1.39)),new THREE.LineBasicMaterial({color:0x8bcac9,transparent:true,opacity:.65}));edges.position.y=.34;g.add(edges);
  const texture=loader.load(`assets/${names[i]}-small.webp`,()=>render());texture.colorSpace=THREE.SRGBColorSpace;
  const image=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.23),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));image.position.set(0,.33,-.66);g.add(image);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.36),new THREE.MeshBasicMaterial({color:0x9eeee2,transparent:true,opacity:.13,side:THREE.DoubleSide}));surface.rotation.x=-Math.PI/2;surface.position.y=.97;g.add(surface);
  const badge=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.012,24),new THREE.MeshBasicMaterial({color:0xb9efc8}));badge.position.set(-.76,-.235,.63);g.add(badge);
  tanks.push({g,edges,surface});
 });
 let active=0,paused=initialPaused,visible=true,raf=0,last=0,elapsed=0,px=0,py=0;
 function render(){renderer.render(scene,camera);}
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(7.4,7.7,10);camera.position.multiplyScalar(w/h<.85?1.22:1);camera.updateProjectionMatrix();camera.lookAt(0,-.1,0);render();}new ResizeObserver(resize).observe(container);resize();
 function tick(t){raf=0;if(paused||!visible||document.hidden)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;elapsed+=dt;model.rotation.y+=(px*.16-model.rotation.y)*.035;model.rotation.x+=(py*.055-model.rotation.x)*.035;tanks.forEach((o,i)=>{const y=(i===active?.29:0)+Math.sin(elapsed*.8+i)*.025;o.g.position.y+=(y-o.g.position.y)*.05;o.surface.material.opacity=.12+Math.sin(elapsed+i)*.035;});render();raf=requestAnimationFrame(tick);}
 function start(){last=0;if(!raf&&!paused&&visible&&!document.hidden)raf=requestAnimationFrame(tick);else render();}
 function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
 container.addEventListener('pointermove',e=>{if(paused)return;const r=container.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;});container.addEventListener('pointerleave',()=>{px=0;py=0;});
 function highlight(){tanks.forEach((o,i)=>{o.edges.material.color.set(i===active?0xc8f5d1:0x558587);if(paused)o.g.position.y=i===active?.29:0;});render();}
 document.addEventListener('abyssa-world',e=>{active=e.detail;highlight();});document.addEventListener('abyssa-motion',e=>{paused=e.detail;if(paused){stop();highlight();}else start();});
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start());new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?start():stop();},{threshold:0}).observe(container);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();container.classList.remove('ready');});renderer.domElement.addEventListener('webglcontextrestored',()=>{container.classList.add('ready');start();});
 highlight();container.classList.add('ready');start();
}
