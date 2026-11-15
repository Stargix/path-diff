const COLORS = { hierarchy: "#5368cb", diffusion: "#c37d34", gaussian_bc: "#628975" };
const LABELS = { h42: "Frozen-expert hierarchy", wc42: "Diffusion + DPPO", gaussian_bc_42: "Gaussian BC + PPO" };
const $ = (s) => document.querySelector(s);
const fmt = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : "—";
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : "—";
const svg = (name, attrs = {}) => { const e = document.createElementNS("http://www.w3.org/2000/svg", name); for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

async function start() {
  const [actors, episodes, scenarios, traces] = await Promise.all(["actors", "episodes", "scenarios", "traces"].map(n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw Error(`${n}: ${r.status}`); return r.json(); })));
  const actorMap = Object.fromEntries(actors.map(a => [a.id, a]));
  const episodeMap = new Map(episodes.map(e => [`${e.actor}|${JSON.stringify(e.key)}`, e]));
  const traceMap = new Map(traces.traces.map(t => [`${t.scenario_id}|${t.actor_id}`, t]));
  const picker = $("#scenario-select");
  scenarios.scenarios.forEach((s,i) => picker.add(new Option(`${String(i+1).padStart(2,"0")}  ${s.title}`, s.id)));
  const slider = $("#time-scrubber"); let frame = 0, raf = 0, playing = false;
  const current = () => scenarios.scenarios.find(s => s.id === picker.value);
  function drawRoute(s) {
    const box={w:760,h:300,l:46,r:16,t:16,b:32};
    const route=s.reference_metadata.path_xy; const all=[...route];
    for (const id of ["h42","wc42","gaussian_bc_42"]) { const t=traceMap.get(`${s.id}|${id}`); if(t) all.push(...t.xy_m); }
    const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]); const xr=[Math.min(...xs),Math.max(...xs)], yr=[Math.min(...ys),Math.max(...ys)];
    const scale=Math.min((box.w-box.l-box.r)/Math.max(1e-4,xr[1]-xr[0]),(box.h-box.t-box.b)/Math.max(1e-4,yr[1]-yr[0]));
    const x=v=>box.l+(v-xr[0])*scale+(box.w-box.l-box.r-(xr[1]-xr[0])*scale)/2;
    const y=v=>box.h-box.b-(v-yr[0])*scale-(box.h-box.t-box.b-(yr[1]-yr[0])*scale)/2;
    const chart=svg("svg",{viewBox:`0 0 ${box.w} ${box.h}`,role:"img","aria-label":"Recorded base trajectories compared with reference route"});
    for(let k=0;k<4;k++){const gy=box.t+k*(box.h-box.t-box.b)/3;chart.append(svg("line",{x1:box.l,y1:gy,x2:box.w-box.r,y2:gy,stroke:"#e8ebef"}));}
    const path=d=>d.map((p,i)=>`${i?"L":"M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
    chart.append(svg("path",{d:path(route),fill:"none",stroke:"#9ba5b1","stroke-width":3,"stroke-dasharray":"7 6","stroke-linecap":"round"}));
    for(const id of ["h42","wc42","gaussian_bc_42"]){const t=traceMap.get(`${s.id}|${id}`);if(!t)continue;const color=COLORS[actorMap[id].family];chart.append(svg("path",{d:path(t.xy_m),fill:"none",stroke:color,"stroke-width":2.5,"stroke-linejoin":"round","stroke-linecap":"round"}));}
    chart.append(svg("text",{x:box.l,y:box.h-7,fill:"#818b97","font-size":11}).appendChild(document.createTextNode("Route reference · dashed")));
    $("#route-chart").replaceChildren(chart);
  }
  function drawSignals(s, time) {
    const w=760,h=205,l=48,r=15,t=12,b=30, xMax=24; const x=v=>l+v/xMax*(w-l-r);
    const chart=svg("svg",{viewBox:`0 0 ${w} ${h}`,role:"img","aria-label":"Required and measured body height over simulated time"});
    const md=s.reference_metadata, base=md.path_height_m;
    let req=[];
    if(md.height_profile==="constant") req=[[0,base],[4,base]];
    else if(md.height_profile==="repeated") req=md.height_schedule_m.map((v,i)=>[i*.8,v]);
    else { const f=md.transition_fraction??.5, low=.1705, high=.2932; const start=md.transition_direction==="crouch_to_walk"?low:high, end=start===high?low:high; req=[[0,start],[f*4,start],[f*4,end],[4,end]]; }
    const heights=[...req.map(v=>v[1]),...s.clips.map(c=>traceMap.get(`${s.id}|${c.actor_id}`).height_m).flat()];
    const lo=Math.min(...heights)-.025,hi=Math.max(...heights)+.025,y=v=>h-b-(v-lo)/(hi-lo)*(h-t-b);
    for(let k=0;k<4;k++){const gy=t+k*(h-t-b)/3;chart.append(svg("line",{x1:l,y1:gy,x2:w-r,y2:gy,stroke:"#e8ebef"}));}
    const reqPts=[[0,req[0][1]]]; for(const [dist,height] of req.slice(1)){reqPts.push([dist/4*xMax,reqPts.at(-1)[1]],[dist/4*xMax,height]);}
    reqPts.push([xMax,req.at(-1)[1]]);
    const line=pts=>pts.map((p,i)=>`${i?"L":"M"}${x(p[0])},${y(p[1])}`).join(" ");
    chart.append(svg("path",{d:line(reqPts),fill:"none",stroke:"#8b949f","stroke-width":2,"stroke-dasharray":"6 5"}));
    for(const id of ["h42","wc42","gaussian_bc_42"]){const tr=traceMap.get(`${s.id}|${id}`);const pts=tr.time_s.map((tm,i)=>[tm,tr.height_m[i]]);chart.append(svg("path",{d:line(pts),fill:"none",stroke:COLORS[actorMap[id].family],"stroke-width":2}));}
    chart.append(svg("line",{x1:x(time),y1:t,x2:x(time),y2:h-b,stroke:"#293342","stroke-width":1,"stroke-dasharray":"3 3"}));
    [0,6,12,18,24].forEach(tm=>chart.append(svg("text",{x:x(tm),y:h-7,"text-anchor":"middle",fill:"#77828e","font-size":10}).appendChild(document.createTextNode(`${tm}s`))));
    $("#signal-chart").replaceChildren(chart);
  }
  function render() {
    const s=current(); if(!s)return;
    const ts=s.clips.map(c=>traceMap.get(`${s.id}|${c.actor_id}`));
    const maxTime=Math.max(...ts.map(t=>t.time_s.at(-1)));
    const time=frame/1000*maxTime;
    $("#time-label").value=`${time.toFixed(2)} s`;
    $("#scenario-meta").innerHTML=`<span class="meta-chip">${s.condition_key[3]}</span><span class="meta-chip">${s.condition_key[5].toFixed(2)} m/s requested mean</span><span class="meta-chip">${s.reference_metadata.height_profile}</span><span class="meta-chip">${s.condition_key[4]===0?"Evaluation repeat 0":"Evaluation repeat 1"}</span>`;
    const cards=s.clips.map(c=>{const e=c.recorded_metrics, a=actorMap[c.actor_id],color=COLORS[a.family], d=s.condition_key[0]==="core"?168:84; const surv=e.survived; return `<article class="method-card" style="--method:${color}"><div class="method-title"><h3>${LABELS[c.actor_id]}</h3><span class="seed-label">seed ${a.training_seed}</span></div><svg class="trajectory" data-id="${c.actor_id}" viewBox="0 0 400 220" role="img" aria-label="Recorded route trace for ${LABELS[c.actor_id]}"></svg><div class="card-metrics"><div class="metric"><span>Task success</span><b>${e.success?"Yes":"No"}</b></div><div class="metric"><span>Adherence</span><b>${e.adherence?"Yes":"No"}</b></div><div class="metric"><span>Survived 24 s</span><b>${surv?"Yes":"No"}</b></div></div><div class="status-line"><span class="status-pill ${e.success?"pass":"fail"}">${e.success?"Task complete":"Task not complete"}</span> &nbsp;Cross-track RMSE ${fmt(e.total_cte_m*100,1)} cm · arrival speed error ${e.arrived?fmt(e.arrival_speed_error_mps*100,1)+" cm/s":"N/A (did not arrive)"}</div><p class="status-line">Illustrative episode only; bank denominator ${d}. <a href="data/actors.json">Checkpoint identity ↗</a></p></article>`;}).join("");
    $("#comparison-grid").innerHTML=cards;
    const route=s.reference_metadata.path_xy, all=[...route,...ts.flatMap(t=>t.xy_m)],xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const px=v=>16+(v-minX)/Math.max(.001,maxX-minX)*368, py=v=>204-(v-minY)/Math.max(.001,maxY-minY)*188;
    const poly=p=>p.map((q,i)=>`${i?"L":"M"}${px(q[0]).toFixed(1)},${py(q[1]).toFixed(1)}`).join(" ");
    document.querySelectorAll(".trajectory").forEach(el=>{const id=el.dataset.id,tr=traceMap.get(`${s.id}|${id}`);el.replaceChildren(svg("path",{d:poly(route),fill:"none",stroke:"#aab2bc","stroke-width":2,"stroke-dasharray":"6 5"}),svg("path",{d:poly(tr.xy_m),fill:"none",stroke:COLORS[actorMap[id].family],"stroke-width":3,"stroke-linejoin":"round"}));const active=Math.max(0,tr.time_s.findIndex(tm=>tm>=time));const p=tr.xy_m[Math.max(0,active)];el.append(svg("circle",{cx:px(p[0]),cy:py(p[1]),r:5,fill:COLORS[actorMap[id].family],stroke:"white","stroke-width":2}));});
    drawRoute(s);drawSignals(s,time);updateTable(episodes,actorMap);
  }
  function updateTable(rows, map){
    const suite=$("#suite-filter").value, actor=$("#actor-filter").value;
    const actorsIn=[...new Set(rows.filter(e=>e.suite===suite).map(e=>e.actor))].sort();
    $("#actor-filter").innerHTML='<option value="all">All actors</option>'+actorsIn.map(id=>`<option value="${id}">${LABELS[id]||id}</option>`).join("");
    if(actor!=="all"&&actorsIn.includes(actor))$("#actor-filter").value=actor;
    const select=$("#actor-filter").value;
    const groups=actorsIn.filter(id=>select==="all"||id===select).map(id=>{const es=rows.filter(e=>e.actor===id&&e.suite===suite);return {id,es,n:es.length,success:es.filter(e=>e.success).length,adherence:es.filter(e=>e.adherence).length,survival:es.filter(e=>e.survived).length,arrived:es.filter(e=>e.arrived),cte:es.filter(e=>e.total_cte_m!==null).map(e=>e.total_cte_m),height:es.filter(e=>e.full_active_height_mae_m!==null).map(e=>e.full_active_height_mae_m)};});
    const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
    $("#results-table").innerHTML=`<table><thead><tr><th>Controller</th><th>Task success</th><th>Adherence</th><th>Survived</th><th>Active CTE RMSE</th><th>Full-trace height MAE</th><th>Arrival speed error*</th></tr></thead><tbody>${groups.map(g=>`<tr><td>${LABELS[g.id]||g.id} <small>seed ${map[g.id].training_seed}</small></td><td>${g.success}/${g.n} · ${pct(g.success,g.n)}</td><td>${g.adherence}/${g.n} · ${pct(g.adherence,g.n)}</td><td>${g.survival}/${g.n} · ${pct(g.survival,g.n)}</td><td>${fmt(avg(g.cte)*100,2)} cm · n=${g.cte.length}</td><td>${fmt(avg(g.height)*100,2)} cm · n=${g.height.length}</td><td>${fmt(avg(g.arrived.map(e=>e.arrival_speed_error_mps))*100,2)} cm/s · n=${g.arrived.length}</td></tr>`).join("")}</tbody></table>`;
  }
  picker.addEventListener("change",()=>{frame=0;slider.value="0";stop();render();});
  slider.addEventListener("input",()=>{frame=Number(slider.value);render();});
  $("#restart").addEventListener("click",()=>{frame=0;slider.value="0";render();});
  $("#play-toggle").addEventListener("click",()=>{playing=!playing;$("#play-toggle").textContent=playing?"Pause traces":"Play traces";$("#play-toggle").setAttribute("aria-pressed",String(playing));if(playing)raf=requestAnimationFrame(tick);});
  function stop(){playing=false;cancelAnimationFrame(raf);$("#play-toggle").textContent="Play traces";$("#play-toggle").setAttribute("aria-pressed","false");}
  let last=0;function tick(now){if(!playing)return;if(last)frame=Math.min(1000,frame+(now-last)/24000*1000);last=now;slider.value=String(frame);render();if(frame>=1000){stop();last=0;}else raf=requestAnimationFrame(tick);}
  $("#suite-filter").addEventListener("change",()=>updateTable(episodes,actorMap));$("#actor-filter").addEventListener("change",()=>updateTable(episodes,actorMap));
  render();
}
start().catch(err=>{console.error(err);document.querySelector("main").insertAdjacentHTML("afterbegin",`<p class="load-error">The evaluation data could not be loaded: ${String(err.message||err)}. Open this page through a local web server.</p>`);});
