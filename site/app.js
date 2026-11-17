const $ = s => document.querySelector(s);
const IDS = ['wc42','h42','gaussian_bc_42'];
const LABEL = {wc42:'Path Diff (ours)',h42:'Frozen-expert hierarchy',gaussian_bc_42:'Gaussian BC + PPO'};
const CASES = ['ood-s-curve','walk-to-crouch','corner-moderate','repeated-standing-original-slow'];
const COPY = {
 's-curve-horizontal':['S-curve · crouch to walk','0.50 m/s · crouched → standing','A broader S-shaped route with a posture change halfway along it.'],
 's-curve-rise':['S-curve · crouch to walk','0.50 m/s · crouched → standing','A broader S-shaped route with a posture change halfway along it.'],
 'corner-posture':['Corner · two posture changes','0.50 m/s · stand → crouch → stand','The robot crouches before the corner and stands again afterwards.'],
 'repeated-standing-original-slow': ['Repeated height changes','0.35 m/s · standing → crouched → standing → crouched → standing',
  'A route with four successive posture changes.'],
 'walk-to-crouch':['Walk to crouch','0.50 m/s · one height change','A smooth route with one standing-to-crouching transition.'],
 'ood-s-curve':['S-curve','0.50 m/s · walk to crouch','An S-shaped stress route with a posture change halfway along it.'],
 'corner-moderate':['Sharp turn','0.50 m/s · standing height','A corner stress route at constant standing height.']
};
async function json(name) {
 const r=await fetch('data/'+name+'.json'); if(!r.ok)throw Error('Missing '+name); return r.json();
}
async function start() {
 const gallery=await json('gallery');
 const replacements={'ood-s-curve':'s-curve-rise','corner-moderate':'corner-posture'};
 const cases=CASES.map(id=>(id==='ood-s-curve' && gallery.cases.find(s=>s.id==='s-curve-horizontal')) || gallery.cases.find(s=>s.id===replacements[id]) || gallery.cases.find(s=>s.id===id));
 if(cases.some(s=>!s))throw Error('Missing comparison case');
 let selected=cases[0], clips=[], running=false, pausedByUser=false, inView=false, clock=0, previous=null, frame=0, end=0, generation=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const videos=()=>[...document.querySelectorAll('#videos video')];
 function pause() {
  running=false;cancelAnimationFrame(frame);previous=null;videos().forEach(v=>v.pause());
  $('#play').textContent='Play together'; $('#play').setAttribute('aria-pressed','false');
 }
 function simFrame(clip,time) {
  const times=clip.frame_times_s;let lo=0,hi=times.length-1;
  const target=times[0]+time;
  while(lo<hi){const m=Math.ceil((lo+hi)/2);if(times[m]<=target)lo=m;else hi=m-1;}
  return lo/clip.fps;
 }
 function seek(time) {clock=time;videos().forEach((v,i)=>{v.currentTime=simFrame(clips[i],clock);});}
 async function play() {
  if(running)return;
  const token=generation;
  if(clock>=end)seek(0);
  videos().forEach(v=>{v.muted=true;});
  try {await Promise.all(videos().map(v=>v.play()));}
  catch {pause();return;}
  if(token!==generation)return;
  running=true;previous=null;$('#play').textContent='Pause together';$('#play').setAttribute('aria-pressed','true');
  frame=requestAnimationFrame(tick);
 }
 function tick(now) {
  if(!running)return;
  const active=videos();
  if(active.some(v=>v.readyState<3&&!v.ended)){previous=now;frame=requestAnimationFrame(tick);return;}
  if(previous!==null)clock+=(now-previous)/1000;previous=now;
  if(clock>=end){pause();seek(0);if(inView&&!pausedByUser&&!reduced)play();return;}
  active.forEach((v,i)=>{const desired=simFrame(clips[i],clock);if(Math.abs(v.currentTime-desired)>.15)v.currentTime=desired;});
  frame=requestAnimationFrame(tick);
 }
 async function render() {
  generation++;pause();clock=0;pausedByUser=false;
  clips=IDS.map(id=>selected.clips.find(c=>c.actor===id));
  const copy=COPY[selected.id];
  $('#case-title').textContent=copy[0];$('#case-request').textContent=copy[1];$('#case-explanation').textContent=copy[2];
  $('#videos').innerHTML=clips.map((clip,i)=>'<figure class="video-card '+(i===0?'ours':'')+'"><video width="960" height="540" style="width:100%;height:auto" muted playsinline preload="auto" src="'+clip.video+'" poster="'+clip.poster+'" tabindex="0" aria-label="'+LABEL[IDS[i]]+' simulation. Click to pause all; double-click to enlarge."></video><figcaption><strong>'+LABEL[IDS[i]]+'</strong>'+(copy[3]?'<span>'+copy[3][i]+'</span>':'')+'</figcaption></figure>').join('');
  end=Math.min(24,Math.max(...clips.map(c=>c.frame_times_s.at(-1)-c.frame_times_s[0])));
  videos().forEach(v=>{
   v.onclick=()=>{pausedByUser=running;if(running)pause();else play();};
   v.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();v.click();}};
   v.ondblclick=()=>{if(v.requestFullscreen)v.requestFullscreen().catch(()=>{});};
  });
  document.querySelectorAll('.scenario-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===selected.id)));
  if(inView&&!reduced)play();
 }
 cases.forEach(s=>{
  const b=document.createElement('button');b.className='scenario-button';b.dataset.id=s.id;b.textContent=COPY[s.id][0];
  b.onclick=()=>{selected=s;render();};$('#scenario-grid').append(b);
 });
 $('#play').onclick=()=>{pausedByUser=running;if(running)pause();else play();};
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(!inView)pause();else if(!pausedByUser&&!reduced)play();},{threshold:.15});
 await render();observer.observe($('#videos'));
 const familyNames={procedural:'Procedural',coherent_smooth:'Coherent smooth',rounded_waypoint:'Rounded waypoint',hard_waypoint:'Hard waypoint',ood_arc:'Arc',ood_s_curve:'S-curve',ood_corner:'Corner'};
 $('#family-grid').innerHTML=gallery.families.map(f=>{
  const xs=f.path_xy.map(p=>p[0]),ys=f.path_xy.map(p=>p[1]),lx=Math.min(...xs),ly=Math.min(...ys);
  const scale=Math.min(150/Math.max(.01,Math.max(...xs)-lx),65/Math.max(.01,Math.max(...ys)-ly));
  const left=f.id==='ood_arc'?(180-(Math.max(...xs)-lx)*scale)/2:15;
  const line=f.path_xy.map((p,i)=>(i?'L':'M')+(left+(p[0]-lx)*scale)+','+(85-(p[1]-ly)*scale)).join(' ');
  return '<div class="family-item"><svg width="140" height="78" viewBox="0 0 180 100" aria-hidden="true"><path d="'+line+'" fill="none" stroke="'+(f.ood?'#d6a980':'#8ec9ac')+'" stroke-width="3"/></svg><span>'+familyNames[f.id]+'</span></div>';
 }).join('');
}
start().catch(e=>{$('#case-explanation').textContent='The comparisons could not load. Open this page through the local HTTP preview and reload.';console.error(e);});
