/* Curated evidence: matched-range development subsets, not a pooled stress leaderboard. */
(async function () {
 const load=async name=>{const r=await fetch('data/'+name+'.json');if(!r.ok)throw Error(name);return r.json();};
 const [report,evidence,episodes,actors]=await Promise.all(['report','presentation-evidence','episodes','actors'].map(load));
 const el=id=>document.getElementById(id);
 const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
 const families=['diffusion','hierarchy','gaussian_bc'];
 const labels={diffusion:'Path Diff (ours)',hierarchy:'Frozen-expert hierarchy',gaussian_bc:'Gaussian BC + PPO'};
 const colors={diffusion:'#8ec9ac',hierarchy:'#91b7e0',gaussian_bc:'#d6a980'};
 const methodIds=f=>evidence.methods.filter(m=>m.family===f).map(m=>m.actor);
 const averageAt=(groups,index)=>{const values=groups.map(g=>g.mean_height_m[index]).filter(Number.isFinite);return values.length?mean(values):null;};
 function path(grid,values,x,y){let pen=false;return values.map((v,i)=>{if(v===null){pen=false;return '';}const command=pen?'L':'M';pen=true;return command+x(grid[i])+','+y(v);}).join(' ');}
 const metric=(html,score)=>({html,score});
 function renderRows(rows,directions){
  const winners=directions.map((direction,column)=>{
   if(!direction)return new Set();
   const scores=rows.map(row=>row[column]?.score).filter(Number.isFinite);
   if(!scores.length)return new Set();
   const best=direction==='up'?Math.max(...scores):Math.min(...scores);
   return new Set(scores.filter(value=>Math.abs(value-best)<1e-9));
  });
  return rows.map(row=>'<tr'+(String(row[0]).includes('(ours)')?' class="ours"':'')+'>'+row.map((value,index)=>{
   const isMetric=value&&typeof value==='object'&&Number.isFinite(value.score);
   const content=isMetric?value.html:value;
   const shown=isMetric&&winners[index].has(value.score)?'<strong class="winner" aria-label="Best observed mean in this comparison">'+content+'</strong>':content;
   return (index?'<td>':'<th scope="row">')+shown+(index?'</td>':'</th>');
  }).join('')+'</tr>').join('');
 }
 function table(id,headers,rows,directions){el(id).innerHTML='<table><thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+renderRows(rows,directions)+'</tbody></table>';}
 const format=(values,digits=2)=>mean(values).toFixed(digits);
 const broadFamilies=[...families,'gaussian_random'];
 const broadLabels={...labels,gaussian_random:'Random-init PPO'};
 const baseFamilies=new Set(evidence.design.base_families);
 const profileTests=[['Constant walk',e=>e.key[2]===0 && e.key[6]>.2],['Constant crouch',e=>e.key[2]===0 && e.key[6]<.2],['Walk → crouch',e=>e.key[7]==='walk_to_crouch'],['Crouch → walk',e=>e.key[7]==='crouch_to_walk']];
 const profileBody=[.25,.5,.85].map(speed=>{
  const title=speed===.25?'Conservative request · 0.25 m/s':'Higher-speed stress · '+speed.toFixed(2)+' m/s';
  const rows=profileTests.map(([name,predicate])=>[name,...broadFamilies.map(f=>{
   const values=actors.filter(a=>a.family===f).map(a=>{
    const selected=episodes.filter(e=>e.actor===a.id&&e.suite==='core'&&e.key[5]===speed&&baseFamilies.has(e.key[3])&&predicate(e));
    if(selected.length!==8)throw Error('Incomplete matched profile: '+a.id+'/'+name+'/'+speed);
    return 100*mean(selected.map(e=>Number(e.success)));
   });
   return format(values,1)+'%';
  })]);
  return '<tr class="table-group"><th scope="rowgroup" colspan="5">'+title+'</th></tr>'+renderRows(rows,Array(5).fill(null));
 }).join('');
 el('profile-results-table').innerHTML='<table><thead><tr>'+['Requested posture',...broadFamilies.map(f=>broadLabels[f])].map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+profileBody+'</tbody></table>';
 const actorCounts=Object.fromEntries(broadFamilies.map(f=>[f,actors.filter(a=>a.family===f).length]));
 el('bank-overview').textContent='All '+episodes.length.toLocaleString('en-US')+' evaluated attempts are retained here, grouped by controller and task bank. Compare the complete results with the speed and posture breakdowns below.';
 el('bank-actor-counts').textContent='Evaluated actors: '+broadFamilies.map(f=>broadLabels[f]+' '+actorCounts[f]).join('; ')+'.';
 el('diffusion-seed-coverage').textContent=actorCounts.diffusion===1?
  'Three WC training seeds exist in the historical archive. Only seed 42 has been evaluated on this newer comparison bank so far; seeds 43 and 44 must be evaluated here before their results can be included. Historical results from other route banks are not pooled into this table.':
  'This comparison includes '+actorCounts.diffusion+' evaluated diffusion actors. Their mean describes online runs under a shared offline prior, not variability of data collection or offline imitation.';
 const broadHeaders=['Controller','Attempts / actor','Original task pass (%) ↑','Task + CTE gate (%) ↑','No physical failure, 24 s (%)','Active CTE (cm)','Active height MAE (cm)'];
 const broadBody=['core','composition'].map(suite=>{
  const heading=suite==='core'?'Core tasks · constants and single changes':'Repeated-height tasks · four changes';
  const rows=broadFamilies.map(f=>{
   const records=actors.filter(a=>a.family===f).map(a=>episodes.filter(e=>e.actor===a.id&&e.suite===suite));
   const expected=suite==='core'?168:84;
   if(!records.length||records.some(r=>r.length!==expected))throw Error('Incomplete full evaluation bank: '+f+'/'+suite);
   const rate=key=>{const values=records.map(r=>100*mean(r.map(e=>Number(e[key]))));return metric(format(values,1),mean(values));};
   const error=key=>{const values=records.map(r=>100*mean(r.map(e=>e[key]).filter(Number.isFinite)));return metric(format(values),mean(values));};
   return [broadLabels[f],expected,rate('success'),rate('adherence'),rate('survived'),error('total_cte_m'),error('full_active_height_mae_m')];
  });
  return '<tr class="table-group"><th scope="rowgroup" colspan="7">'+heading+'</th></tr>'+renderRows(rows,[null,null,'up','up','up','down','down']);
 }).join('');
 el('full-results-table').innerHTML='<table><thead><tr>'+broadHeaders.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+broadBody+'</tbody></table>';
 table('speed-results-table',['Controller','Core pass (%)<br>0.25 m/s','Core pass (%)<br>0.50 m/s','Core pass (%)<br>0.85 m/s','Repeated pass (%)<br>0.35 m/s','Repeated pass (%)<br>0.65 m/s','Repeated pass (%)<br>0.85 m/s'],broadFamilies.map(f=>{
  const cells=[broadLabels[f]];
  for(const [suite,speeds] of [['core',[.25,.5,.85]],['composition',[.35,.65,.85]]])for(const speed of speeds){
   const values=actors.filter(a=>a.family===f).map(a=>{
    const rows=episodes.filter(e=>e.actor===a.id&&e.suite===suite&&e.key[5]===speed);
    if(rows.length!==(suite==='core'?56:28))throw Error('Incomplete speed stratum');
    return 100*mean(rows.map(e=>Number(e.success)));
   });
   cells.push(metric(format(values,1),mean(values)));
  }
  return cells;
 }),[null,'up','up','up','up','up','up']);
 table('training-table',['Policy','Constant-posture adherence ↑','Single-change adherence ↑','Single-change CTE ↓'],report.training.map(r=>[r.method,metric(parseFloat(r.constant).toFixed(1)+'%',parseFloat(r.constant)),metric(parseFloat(r.transition).toFixed(1)+'%',parseFloat(r.transition)),metric(parseFloat(r.cte).toFixed(1)+' cm',parseFloat(r.cte))]),[null,'up','up',null]);
 table('timing-table',['Temporal input','Adherence ↑','Mean-speed MAE ↓'],report.timing.map(r=>[r.input,metric(r.adherence.toFixed(1)+'%',r.adherence),metric(r.speed_mae.toFixed(2)+' cm/s',r.speed_mae)]),[null,'up',null]);
 table('baseline-table',['Controller','Core pass (%) ↑<br><small>0.25 m/s</small>','Core CTE (cm) ↓<br><small>0.25 m/s</small>','Repeated pass (%) ↑<br><small>standing start</small>','Repeated height MAE (cm) ↓<br><small>standing start</small>','Repeated pass (%) ↑<br><small>crouched start</small>','Repeated height MAE (cm) ↓<br><small>crouched start</small>'],families.map(f=>{
  const rows=evidence.methods.filter(m=>m.family===f);
  const values=key=>rows.map(m=>m[key]);
  return [labels[f],metric(format(values('core_success_percent'),1),mean(values('core_success_percent'))),metric(format(values('core_cte_cm')),mean(values('core_cte_cm'))),format(rows.map(m=>m.repeated_success_percent[0]),1),format(values('repeated_standing_height_mae_cm')),format(rows.map(m=>m.repeated_success_percent[1]),1),format(values('repeated_crouched_height_mae_cm'))];
 }),[null,'up',null,null,null,null,null]);
 table('startup-table',['Controller','Initial CTE (cm)','Active CTE (cm)'],families.map(f=>{
  const ids=methodIds(f);
  const values=key=>ids.map(id=>{
   const rows=episodes.filter(e=>e.actor===id&&e.suite==='core'&&e.key[3]&&e.key[5]===.25&&evidence.design.base_families.includes(e.key[3]));
   if(rows.length!==32)throw Error('Incomplete startup subset');
   return 100*mean(rows.map(e=>e[key]));
  });
  return [labels[f],format(values('initial_distance_m')),format(values('total_cte_m'))];
 }),[null,null,null]);
 const sectionBody=[0,1].map(start=>{
  const sequence=start?'Crouch → stand → crouch → stand → crouch':'Stand → crouch → stand → crouch → stand';
  const rows=families.map(f=>{
   const counts=[],errors=[[],[],[],[],[]],coverage=[];
   for(const id of methodIds(f)){
    const planned=evidence.sections.filter(r=>r.actor===id&&r.start===start);
    if(planned.length!==8)throw Error('Incomplete section diagnostic');
    const arrived=planned.filter(r=>r.arrived);
    counts.push(arrived.length);
    for(let j=0;j<5;j++){
     const available=arrived.map(r=>r.sections[j].mae_cm).filter(Number.isFinite);
     if(available.length!==arrived.length)throw Error('Arrived route missing an entire section');
     if(available.length)errors[j].push(mean(available));
    }
    if(arrived.length)coverage.push(100*mean(arrived.map(r=>mean(r.sections.map(s=>s.coverage)))));
   }
   const arrivals=counts.every(n=>n===counts[0]) ? counts[0]+'/8' : format(counts,1)+' / 8';
   return [labels[f],arrivals,...errors.map(v=>v.length?format(v):'—'),coverage.length?format(coverage,1)+'%':'—'];
  });
  return '<tr class="table-group"><th scope="rowgroup" colspan="8">'+sequence+'</th></tr>'+renderRows(rows,Array(8).fill(null));
 }).join('');
 el('section-results-table').innerHTML='<table><thead><tr>'+['Controller','Arrivals / actor','Section 1','Section 2','Section 3','Section 4','Section 5','Sampled distance'].map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+sectionBody+'</tbody></table>';
 function singleChart(){
  const grid=evidence.single.grid_m;
  const x=v=>66+(v+.6)/1.2*410,y=v=>210-(v-.13)/.21*180;
  el('single-response').innerHTML=['down','up'].map(direction=>{
   const curves=families.map(f=>{
    const rows=evidence.single.groups.filter(g=>methodIds(f).includes(g.actor)&&g.direction===direction);
    return '<path d="'+path(grid,grid.map((_,i)=>averageAt(rows,i)),x,y)+'" stroke="'+colors[f]+'" fill="none" stroke-width="3" stroke-linejoin="round"/>';
   }).join('');
   const before=direction==='down'?.2932:.1705,after=direction==='down'?.1705:.2932;
   const target='M'+x(-.6)+','+y(before)+' L'+x(0)+','+y(before)+' L'+x(0)+','+y(after)+' L'+x(.6)+','+y(after);
   const lines=[.17,.23,.29].map(v=>'<line x1="66" x2="476" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#30383f"/><text x="54" y="'+(y(v)+5)+'" text-anchor="end">'+Math.round(v*100)+'</text>').join('');
   const ticks=[-.6,-.3,0,.3,.6].map(v=>'<text x="'+x(v)+'" y="234" text-anchor="middle">'+v.toFixed(1)+'</text>').join('');
   return '<figure class="response-panel"><h4>'+(direction==='down'?'Standing → crouched':'Crouched → standing')+'</h4><svg viewBox="0 0 510 278" role="img" aria-label="Single posture change from minus 0.6 to plus 0.6 metres">'+lines+ticks+'<line x1="'+x(0)+'" x2="'+x(0)+'" y1="30" y2="210" stroke="#7b838b" stroke-dasharray="2 5"/><path d="'+target+'" fill="none" stroke="#e7ecef" stroke-width="2" stroke-dasharray="7 5"/>'+curves+'<text x="270" y="269" text-anchor="middle">Distance from posture change (m)</text><text x="19" y="120" text-anchor="middle" transform="rotate(-90 19 120)">Height (cm)</text></svg></figure>';
  }).join('');
 }
 function repeatedChart(){
  const grid=evidence.repeated.grid_m;
  const x=v=>70+v/4*850,y=v=>200-(v-.13)/.21*165;
  el('repeated-response').innerHTML=[0,1].map(start=>{
   const groups=evidence.repeated.groups.filter(g=>g.start===start);
   const curves=families.map(f=>{
    const rows=groups.filter(g=>methodIds(f).includes(g.actor));
    return '<path d="'+path(grid,grid.map((_,i)=>averageAt(rows,i)),x,y)+'" stroke="'+colors[f]+'" fill="none" stroke-width="3" stroke-linejoin="round"/>';
   }).join('');
   const reference=groups[0].reference_height_m;
   const lines=[.17,.23,.29].map(v=>'<line x1="70" x2="920" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#30383f"/><text x="57" y="'+(y(v)+5)+'" text-anchor="end">'+Math.round(v*100)+'</text>').join('');
   const ticks=[0,.8,1.6,2.4,3.2,4].map(v=>'<text x="'+x(v)+'" y="227" text-anchor="middle">'+v.toFixed(1)+'</text>').join('');
   return '<figure class="response-panel"><h4>'+(start?'Crouched start':'Standing start')+' · four successive changes</h4><svg viewBox="0 0 960 270" role="img" aria-label="Full four metre route preserving all four repeated height changes, '+(start?'crouched':'standing')+' start">'+lines+ticks+'<path d="'+path(grid,reference,x,y)+'" fill="none" stroke="#e7ecef" stroke-width="2" stroke-dasharray="7 5"/>'+curves+'<text x="495" y="260" text-anchor="middle">Distance along the complete route (m)</text><text x="22" y="120" text-anchor="middle" transform="rotate(-90 22 120)">Height (cm)</text></svg></figure>';
  }).join('');
 }
 singleChart();repeatedChart();
})().catch(e=>{console.error(e);document.getElementById('research-error').hidden=false;});
