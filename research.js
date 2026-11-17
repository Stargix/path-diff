/* Original task labels, explicit denominators and actor-first means. */
(async function () {
 'use strict';
 const E=window.PathDiffEvidence, el=id=>document.getElementById(id);
 const load=async name=>{const response=await fetch('data/'+name+'.json?v=20261118-arrival',{cache:'no-cache'});if(!response.ok)throw Error('Missing '+name);return response.json();};
 const [episodes,actors,report,evidence,sections]=await Promise.all(['episodes','actors','report','presentation-evidence','publication-evidence'].map(load));
 E.validateBank(episodes,actors);
 const cell=(value,best=false)=>'<td>'+(best?'<strong class="winner">'+value+'</strong>':value)+'</td>';
 const rowName=family=>'<tr'+(family==='diffusion'?' class="ours"':'')+'><th scope="row">'+E.names[family]+'</th>';
 const table=(id,headers,body)=>{el(id).innerHTML='<table><thead><tr>'+headers.map(header=>'<th scope="col">'+header+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';};
 const group=(title,columns)=>'<tr class="table-group"><th scope="rowgroup" colspan="'+columns+'">'+title+'</th></tr>';
 let body='';const summaries={},base=new Set(evidence.design.base_families);
 for(const suite of ['core','composition']){
  const rows=E.families.map(family=>({family,...E.aggregate(episodes,actors,family,row=>row.suite===suite)}));summaries[suite]=rows;
  const speed=suite==='core'?.25:.35,subset=E.families.map(family=>({family,...E.aggregate(episodes,actors,family,row=>row.suite===suite&&row.key[5]===speed&&base.has(row.key[3]))}));
  body+=group(suite==='core'?'Constants & single changes <span>· 32 attempts per actor · 0.25 m/s</span>':'Repeated posture changes <span>· 16 attempts per actor · 0.35 m/s · both starting postures</span>',5);
  const differs=key=>new Set(subset.map(row=>row[key])).size>1;
  body+=subset.map(row=>rowName(row.family)+cell(E.format(row.pass),differs('pass')&&E.isBest(row.pass,subset.map(x=>x.pass)))+cell(E.format(row.gate),differs('gate')&&E.isBest(row.gate,subset.map(x=>x.gate)))+cell(E.format(row.cte,2))+cell(E.format(row.height,2))+'</tr>').join('');
 }
 table('system-results',['Controller','Original task<br>pass (%) ↑','Tracking-gated<br>pass (%) ↑','Active CTE<br><span>RMSE · cm</span>','Active height<br><span>MAE · cm</span>'],body);
 const displayed=new Set(actors.filter(actor=>E.families.includes(actor.family)).map(actor=>actor.id));
 el('bank-overview').textContent=displayed.size+' trained actors · 432 conservative-request episodes · four base families';
 const d=summaries.core.find(row=>row.family==='diffusion'),h=summaries.core.find(row=>row.family==='hierarchy'),rd=summaries.composition.find(row=>row.family==='diffusion'),rh=summaries.composition.find(row=>row.family==='hierarchy');
 el('system-reading').textContent='The complete mixed-speed bank contains 2,268 episodes for these controllers. There, the hierarchy has higher original core pass ('+E.format(h.pass)+'% versus '+E.format(d.pass)+'%); Path Diff has higher original repeated-task pass ('+E.format(rd.pass)+'% versus '+E.format(rh.pass)+'%). Those aggregates describe broader system capability with unequal speed support, not a controlled architecture ranking. The full bank and every speed/profile breakdown remain available in the evaluation details.';
 const training=report.training.filter(row=>row.method!=='Deterministic imitation');
 table('training-table',['Training stage','Constant-posture<br>adherence (%) ↑','Single-change<br>adherence (%) ↑','Single-change<br>CTE (cm)'],training.map((row,i)=>'<tr'+(i?' class="ours"':'')+'><th scope="row">'+(i?'Imitation + DPPO':'Diffusion imitation')+'</th>'+cell(E.format(parseFloat(row.constant)),i>0)+cell(E.format(parseFloat(row.transition)),i>0)+cell(E.format(parseFloat(row.cte)))+'</tr>').join(''));
 table('timing-table',['Temporal input','Adherence (%) ↑','Arrival mean-speed<br>MAE (cm/s)'],report.timing.map(row=>'<tr><th scope="row">'+row.input+'</th>'+cell(E.format(row.adherence),E.isBest(row.adherence,report.timing.map(r=>r.adherence)))+cell(E.format(row.speed_mae,2))+'</tr>').join(''));
 body='';
 for(const block of ['repeated-standing','repeated-crouched']){
  body+=group((block==='repeated-standing'?'Standing start':'Crouched start')+' <span>· 0.35 m/s · 8 attempts per actor</span>',4);
  body+=E.families.map(family=>{const row=E.sectionSummary(sections,family,block),count=Number.isInteger(row.arrivals)?row.arrivals:E.format(row.arrivals);return rowName(family)+cell(E.format(row.pass))+cell(E.format(row.sections))+cell(count+' / '+row.attempts)+'</tr>';}).join('');
 }
 table('composition-table',['Controller','Original task<br>pass (%)','All-section<br>diagnostic (%)','Arrivals<br>per actor'],body);
 const sd=E.sectionSummary(sections,'diffusion','repeated-standing'),cd=E.sectionSummary(sections,'diffusion','repeated-crouched');
 el('composition-reading').textContent='Path Diff is sensitive to the starting posture: its all-section diagnostic is '+E.format(sd.sections)+'% from standing and '+E.format(cd.sections)+'% from crouching. A low score can reflect a late or partial rise, not just remaining crouched throughout. Neither the mean height curves nor this retrospective check establish which system makes the smoothest physical transition.';
 const colors={diffusion:'#91d1b0',hierarchy:'#99bee7',gaussian_bc:'#ddb78f'};
 function line(grid,values,x,y){let open=false;return values.map((value,i)=>{if(!Number.isFinite(value)){open=false;return '';}const command=open?'L':'M';open=true;return command+x(grid[i]).toFixed(2)+','+y(value).toFixed(2);}).join(' ');}
 function band(grid,values,x,y){const segments=[];let current=[];values.forEach((value,i)=>{if(value.actors>=2)current.push(i);else if(current.length){segments.push(current);current=[];}});if(current.length)segments.push(current);return segments.filter(segment=>segment.length>1).map(indices=>'M'+indices.map(i=>x(grid[i]).toFixed(2)+','+y(values[i].high).toFixed(2)).join(' L')+' L'+[...indices].reverse().map(i=>x(grid[i]).toFixed(2)+','+y(values[i].low).toFixed(2)).join(' L')+' Z').join(' ');}
 function plot(grid,groups,reference,wide,label){
  const width=wide?960:520,right=width-23,left=56,top=18,bottom=wide?185:202,minX=wide?0:-.6,maxX=wide?4:.6;
  const x=value=>left+(value-minX)/(maxX-minX)*(right-left),y=value=>bottom-(value-.13)/.21*(bottom-top),ticks=wide?[0,.8,1.6,2.4,3.2,4]:[-.6,-.3,0,.3,.6];
  let svg=[.17,.23,.29].map(value=>'<line x1="'+left+'" x2="'+right+'" y1="'+y(value)+'" y2="'+y(value)+'" stroke="#2b353e"/><text x="'+(left-11)+'" y="'+(y(value)+4)+'" text-anchor="end">'+Math.round(value*100)+'</text>').join('');
  svg+=ticks.map(value=>'<text x="'+x(value)+'" y="'+(bottom+25)+'" text-anchor="middle">'+value.toFixed(1)+'</text>').join('');
  if(!wide)svg+='<line x1="'+x(0)+'" x2="'+x(0)+'" y1="'+top+'" y2="'+bottom+'" stroke="#75848e" stroke-dasharray="2 5"/>';
  for(const family of E.families){const ids=new Set(actors.filter(actor=>actor.family===family).map(actor=>actor.id)),values=E.series(groups.filter(group=>ids.has(group.actor)),grid.length);svg+='<path d="'+band(grid,values,x,y)+'" fill="'+colors[family]+'" fill-opacity=".10"/><path d="'+line(grid,values.map(value=>value.mean),x,y)+'" stroke="'+colors[family]+'" stroke-width="2.7" fill="none" stroke-linejoin="round"/>';}
  svg+='<path d="'+line(grid,reference,x,y)+'" stroke="#e4e9ee" stroke-width="1.8" stroke-dasharray="6 5" fill="none"/><text x="'+((left+right)/2)+'" y="'+(bottom+59)+'" text-anchor="middle">'+(wide?'Distance along route (m)':'Distance from posture change (m)')+'</text><text x="16" y="'+((top+bottom)/2)+'" text-anchor="middle" transform="rotate(-90 16 '+((top+bottom)/2)+')">Height (cm)</text>';
  return '<svg viewBox="0 0 '+width+' '+(bottom+74)+'" role="img" aria-label="'+label+'">'+svg+'</svg>';
 }
 el('single-response').innerHTML=['down','up'].map(direction=>{const grid=evidence.single.grid_m,before=direction==='down'?.2932:.1705,after=direction==='down'?.1705:.2932,groups=evidence.single.groups.filter(group=>group.direction===direction),label=direction==='down'?'Standing → crouched':'Crouched → standing';return '<figure class="response-panel"><h4>'+label+'</h4>'+plot(grid,groups,grid.map(value=>value<0?before:after),false,label+': mean response and range of actor means')+'</figure>';}).join('');
 el('repeated-response').innerHTML=[0,1].map(start=>{const groups=evidence.repeated.groups.filter(group=>group.start===start);if(!groups.length)throw Error('Missing repeated traces');const label=start?'Crouched start':'Standing start';return '<figure class="response-panel"><h4>'+label+'</h4>'+plot(evidence.repeated.grid_m,groups,groups[0].reference_height_m,true,label+': four changes along complete route')+'</figure>';}).join('');
})().catch(error=>{console.error(error);document.getElementById('research-error').hidden=false;});
