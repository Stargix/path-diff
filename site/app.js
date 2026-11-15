const $=s=>document.querySelector(s), IDS=["h42","wc42","gaussian_bc_42"];
const LABEL={h42:"Hierarchy",wc42:"Diffusion + DPPO",gaussian_bc_42:"Gaussian BC + PPO"};
const COL={h42:"#91b7e0",wc42:"#8ec9ac",gaussian_bc_42:"#d6a980"};
const num=(x,d=1)=>Number.isFinite(x)?x.toFixed(d):"N/A";
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
async function json(n){const r=await fetch("data/"+n+".json");if(!r.ok)throw Error(n+": "+r.status);return r.json();}
function routeSvg(points,current=null,extent=null){const xs=(extent||points).map(p=>p[0]),ys=(extent||points).map(p=>p[1]);const lo=[Math.min(...xs),Math.min(...ys)],scale=Math.min(330/Math.max(.01,Math.max(...xs)-lo[0]),160/Math.max(.01,Math.max(...ys)-lo[1]));const xy=p=>[25+(p[0]-lo[0])*scale,185-(p[1]-lo[1])*scale];return {path:points.map((p,i)=>(i?"L":"M")+xy(p).join(",")).join(" "),point:current?xy(current):null};}
async function start(){
 const [actors,episodes,bundle,traceBundle,media]=await Promise.all(["actors","episodes","scenarios","traces","media"].map(json));
 const am=Object.fromEntries(actors.map(a=>[a.id,a])), scenarios=bundle.scenarios, tm=new Map(traceBundle.traces.map(t=>[t.scenario_id+"|"+t.actor_id,t]));
 let selected=scenarios[0],time=0,playing=false,last=null,raf=0;
 const visible=()=>$("#model-select").value==="all"?IDS:[$("#model-select").value];
 function stop(){playing=false;last=null;cancelAnimationFrame(raf);$("#trace-play").textContent="Play traces";}
 function videos(){return [...document.querySelectorAll("#videos video")];}
 function pauseVideos(){videos().forEach(v=>v.pause());$("#play").textContent="Play together";}
 function renderMedia(){
  pauseVideos();const ids=visible();$("#videos").classList.toggle("single",ids.length===1);
  $("#scenario-info").textContent=selected.title+" · "+selected.condition_key[5].toFixed(2)+" m/s";
  $("#videos").innerHTML=ids.map(id=>{
   const c=selected.clips.find(c=>c.actor_id===id),m=c.recorded_metrics,clip=media.clips.find(v=>v.scenario_id===selected.id&&v.actor_id===id);
   const ready=clip?.status==="ready"&&clip.video&&clip.capture_id&&clip.capture_metrics;
   return '<article class="video-card"><h3>'+LABEL[id]+'<small>seed 42</small></h3><div class="video-slot">'+(ready?'<video controls muted playsinline preload="metadata" src="'+clip.video+'"'+(clip.poster?' poster="'+clip.poster+'"':'')+'></video>':'<span>Comparison capture not recorded</span><small>No substitute or reconstructed robot footage</small>')+'</div><div class="episode-metrics"><div><small>Task success · recorded evaluation</small>'+(m.success?"Yes":"No")+'</div><div><small>Adherence</small>'+(m.adherence?"Yes":"No")+'</div><div><small>Survived 24 s</small>'+(m.survived?"Yes":"No")+'</div></div><div class="episode-status">Active CTE '+num(m.total_cte_m===null?null:m.total_cte_m*100)+' cm · height MAE '+num(m.full_active_height_mae_m===null?null:m.full_active_height_mae_m*100)+' cm<br>Arrival-speed error '+(m.arrived?num(m.arrival_speed_error_mps*100)+" cm/s":"N/A — no arrival")+'</div></article>';
  }).join("");
  const count=videos().length;$("#media-status").textContent=count+"/"+ids.length+" comparison clips available · simulated time";
  $("#play").disabled=count!==ids.length;$("#restart").disabled=count!==ids.length;
  document.querySelectorAll(".scenario-button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.id===selected.id)));
  drawTraces();
 }
 function drawTraces(){
  const ids=visible(),route=selected.reference_metadata.path_xy,extent=[...route,...ids.flatMap(id=>tm.get(selected.id+"|"+id).xy_m)];
  $("#traces").innerHTML=ids.map(id=>{const t=tm.get(selected.id+"|"+id);let i=t.time_s.findIndex(v=>v>=time);if(i<0)i=t.time_s.length-1;
   const ref=routeSvg(route,null,extent),path=routeSvg(t.xy_m,t.xy_m[i],extent),ended=t.failure_time_s!==null&&time>=t.failure_time_s;
   return '<article class="video-card"><h3>'+LABEL[id]+'</h3><svg class="trace-svg" viewBox="0 0 380 210" role="img" aria-label="Recorded base trajectory"><path d="'+ref.path+'" fill="none" stroke="#77828f" stroke-dasharray="5 5"/><path d="'+path.path+'" fill="none" stroke="'+COL[id]+'" stroke-width="2"/><circle cx="'+path.point[0]+'" cy="'+path.point[1]+'" r="4" fill="'+COL[id]+'"/></svg><div class="episode-status">'+(ended?"Physical failure recorded — trace held":"Recorded base-position trajectory")+'</div></article>';
  }).join("");$("#traces").classList.toggle("single",ids.length===1);$("#trace-label").textContent=time.toFixed(2)+" s";
 }
 function table(){
  const suite=$("#suite-filter").value,speed=$("#speed-filter").value,posture=$("#posture-filter").value,seed=$("#seed-filter").value;
  const start=e=>e.key[7]==="crouch_to_walk"||e.suite==="composition"&&e.key[2]===1||!e.key[7]&&e.suite==="core"&&e.key[6]<.2?"crouched":"standing";
  const rows=episodes.filter(e=>e.suite===suite&&(speed==="all"||e.key[5]===Number(speed))&&(posture==="all"||start(e)===posture)&&(seed==="all"||am[e.actor].training_seed===Number(seed)));
  const data=actors.map(a=>{const es=rows.filter(e=>e.actor===a.id);if(!es.length)return "";const count=k=>es.filter(e=>e[k]).length;const arrived=es.filter(e=>e.arrived),errs=es.filter(e=>e.total_cte_m!==null);return '<tr><td>'+a.display_label+' <small>· '+a.training_seed+'</small></td><td>'+count("success")+'/'+es.length+'</td><td>'+count("adherence")+'/'+es.length+'</td><td>'+count("survived")+'/'+es.length+'</td><td>'+num(avg(errs.map(e=>e.total_cte_m))*100,2)+' cm · n='+errs.length+'</td><td>'+(arrived.length?num(avg(arrived.map(e=>e.arrival_speed_error_mps))*100,2)+" cm/s":"N/A")+' · n='+arrived.length+'</td></tr>';}).join("");
  $("#results-table").innerHTML='<table><thead><tr><th>Method · seed</th><th>Success</th><th>Adherence</th><th>Survival</th><th>Active CTE RMSE</th><th>Arrival-speed error</th></tr></thead><tbody>'+data+'</tbody></table>';
 }
 scenarios.forEach(s=>{const p=routeSvg(s.reference_metadata.path_xy);const b=document.createElement("button");b.className="scenario-button";b.dataset.id=s.id;b.setAttribute("aria-pressed","false");b.innerHTML='<svg viewBox="0 0 380 210" aria-hidden="true"><path d="'+p.path+'" fill="none" stroke="#8ec9ac" stroke-width="7"/></svg><strong>'+s.title+'</strong><small>'+s.condition_key[5].toFixed(2)+' m/s</small>';b.onclick=()=>{stop();selected=s;time=0;$("#trace-time").value=0;renderMedia();};$("#scenario-grid").append(b);});
 $("#model-select").onchange=renderMedia;
 $("#play").onclick=async()=>{const vs=videos();if(vs.some(v=>!v.paused)){pauseVideos();return;}try{await Promise.all(vs.map(v=>v.play()));$("#play").textContent="Pause together";}catch{pauseVideos();$("#media-status").textContent="Playback failed. Use the individual controls.";}};
 $("#restart").onclick=()=>{videos().forEach(v=>{v.pause();v.currentTime=0;});$("#play").textContent="Play together";};
 $("#trace-time").oninput=e=>{stop();time=Number(e.target.value);drawTraces();};
 $("#trace-reset").onclick=()=>{stop();time=0;$("#trace-time").value=0;drawTraces();};
 $("#trace-play").onclick=()=>{if(playing){stop();return;}if(time>=24)time=0;playing=true;last=null;$("#trace-play").textContent="Pause traces";raf=requestAnimationFrame(tick);};
 function tick(now){if(!playing)return;if(last!==null)time=Math.min(24,time+(now-last)/1000);last=now;$("#trace-time").value=time;drawTraces();if(time>=24)stop();else raf=requestAnimationFrame(tick);}
 function speeds(){const prev=$("#speed-filter").value,sp=[...new Set(episodes.filter(e=>e.suite===$("#suite-filter").value).map(e=>e.key[5]))].sort();$("#speed-filter").innerHTML='<option value="all">All speeds</option>'+sp.map(v=>'<option value="'+v+'">'+v.toFixed(2)+' m/s</option>').join("");if(sp.includes(Number(prev)))$("#speed-filter").value=prev;table();}
 $("#suite-filter").onchange=speeds;["speed","posture","seed"].forEach(k=>$("#"+k+"-filter").onchange=table);
 let teaserOn=false;$("#teaser-play").onclick=()=>{teaserOn=!teaserOn;$("#teaser-image").src=teaserOn?"assets/media/route_posture_demo.gif":"assets/media/standing.jpg";$("#teaser-label").textContent=teaserOn?"■ Stop example":"▶ Play simulation example";};
 renderMedia();speeds();
}
start().catch(e=>{$("#media-status").textContent="Could not load local comparison data: "+e.message;$("#media-status").classList.add("error");console.error(e);});
