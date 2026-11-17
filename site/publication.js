/* Tables derived from raw traces by export_publication_evidence.py. */
(async()=>{
 const response=await fetch('data/publication-evidence.json');if(!response.ok)throw Error('Evidence unavailable');
 const data=await response.json(),families=['diffusion','hierarchy','gaussian_bc'];
 const names={'diffusion':'Path Diff (ours)','hierarchy':'Frozen-expert hierarchy','gaussian_bc':'Gaussian BC + PPO'};
 const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 const fmt=(v,n=1)=>v===null?'—':v.toFixed(n);
 const cell=(x,winner=false)=>'<td>'+(winner?'<strong class="winner">'+x+'</strong>':x)+'</td>';
 function table(id,headers,blocks){
  let html='<table><thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>';
  for(const [block,title] of blocks){
   html+='<tr class="table-group"><th colspan="'+headers.length+'">'+title+'</th></tr>';
   const rows=families.map(f=>{
    const r=data.rows.filter(r=>r.family===f&&r.block===block);
    const m=k=>avg(r.map(x=>x[k]).filter(v=>v!==null));return {f,r,m};
   });
   const bestSections=Math.max(...rows.map(x=>x.m('all_sections')));
   for(const {f,r,m} of rows){
    html+='<tr><th scope="row">'+names[f]+'</th>';
    if(id==='task-table'){
     const bestPass=Math.max(...rows.map(x=>x.m('legacy_pass')));
     html+=cell(fmt(m('legacy_pass')),fmt(m('legacy_pass'))===fmt(bestPass))+cell(fmt(m('arrivals'))+' / '+r[0].n)+cell(fmt(m('cte_arrived_cm'),2))+cell(fmt(m('height_arrived_cm'),2));
    }
    else html+=cell(fmt(m('legacy_pass')))+cell(fmt(m('all_sections')),fmt(m('all_sections'))===fmt(bestSections))+cell(fmt(m('arrivals'))+' / '+r[0].n)+cell(fmt(m('height_arrived_cm'),2));
    html+='</tr>';
   }
  }
  document.getElementById(id).innerHTML=html+'</tbody></table>';
 }
 table('task-table',['Controller','Original task pass (%) ↑','Arrivals / actor','Active CTE (cm)','Active height MAE (cm)'],[['constant','Constant posture · 0.25 m/s'],['single','One posture change · 0.25 m/s']]);
 table('composition-table',['Controller','Original task pass (%)','All-section check (%) ↑','Arrivals / actor','Active height MAE (cm)'],[['repeated-standing','Standing start · four changes · 0.35 m/s'],['repeated-crouched','Crouched start · four changes · 0.35 m/s']]);
 const tracking=f=>avg(data.rows.filter(r=>r.family===f&&['constant','single'].includes(r.block)).map(r=>r.cte_arrived_cm));
 document.getElementById('tracking-reading').textContent='Across these low-speed tasks, active CTE is '+fmt(tracking('diffusion'),2)+' cm for Path Diff, '+fmt(tracking('hierarchy'),2)+' cm for the hierarchy and '+fmt(tracking('gaussian_bc'),2)+' cm for Gaussian BC + PPO. Path Diff tracks the route more closely than the hierarchy under this protocol; Gaussian has the lowest lateral error here. The repeated profiles below test whether that tracking also comes with the requested postures.';
 const actor=data.actors.find(a=>a.family==='diffusion');
 const crouch=data.rows.find(r=>r.actor===actor.id&&r.block==='repeated-crouched');
 document.getElementById('composition-reading').textContent='For the displayed Path Diff actor, '+crouch.arrivals+' of '+crouch.n+' crouched-start attempts reach the goal. Original task pass is '+fmt(crouch.legacy_pass)+'%, while '+fmt(crouch.all_sections)+'% meet the section-wise check. The decrease concerns reproducing each part of the profile, not simply reaching the end. The hierarchy also varies between training runs; its mean need not resemble the individual video above.';
 const [episodes,actors]=await Promise.all(['episodes','actors'].map(async name=>{const r=await fetch('data/'+name+'.json');if(!r.ok)throw Error('Missing '+name);return r.json();}));
 const base=new Set(['procedural','coherent_smooth','rounded_waypoint','hard_waypoint']);
 const profiles=[['Constant walk',e=>e.key[2]===0&&e.key[6]>.2],['Constant crouch',e=>e.key[2]===0&&e.key[6]<.2],['Walk → crouch',e=>e.key[7]==='walk_to_crouch'],['Crouch → walk',e=>e.key[7]==='crouch_to_walk']];
 let stress='<table><thead><tr><th>Requested profile</th>'+families.map(f=>'<th>'+names[f]+'</th>').join('')+'</tr></thead><tbody>';
 for(const speed of [.5,.85]){
  stress+='<tr class="table-group"><th colspan="4">Requested mean · '+speed.toFixed(2)+' m/s</th></tr>';
  for(const [label,predicate] of profiles){
   stress+='<tr><th scope="row">'+label+'</th>';
   for(const f of families){
    const rates=actors.filter(a=>a.family===f).map(a=>{
     const selected=episodes.filter(e=>e.actor===a.id&&e.suite==='core'&&base.has(e.key[3])&&e.key[5]===speed&&predicate(e));
     if(selected.length!==8)throw Error('Incomplete speed/profile condition '+a.id);
     return 100*avg(selected.map(e=>Number(e.success)));
    });
    stress+=cell(fmt(avg(rates))+'%');
   }
   stress+='</tr>';
  }
 }
 document.getElementById('speed-profile-table').innerHTML=stress+'</tbody></table>';
})().catch(e=>{console.error(e);document.getElementById('research-error').hidden=false;});
