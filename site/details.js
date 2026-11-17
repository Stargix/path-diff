(async()=>{
 'use strict';
 const E=window.PathDiffEvidence;
 const load=async name=>{const response=await fetch('data/'+name+'.json?v=20261118-arrival',{cache:'no-cache'});if(!response.ok)throw Error(name);return response.json();};
 const [episodes,actors]=await Promise.all(['episodes','actors'].map(load));E.validateBank(episodes,actors);
 const profiles=[['Constant walk',row=>row.key[2]===0&&row.key[6]>.2],['Constant crouch',row=>row.key[2]===0&&row.key[6]<.2],['Walk → crouch',row=>row.key[7]==='walk_to_crouch'],['Crouch → walk',row=>row.key[7]==='crouch_to_walk']];
 const table=(id,headers,body)=>{document.getElementById(id).innerHTML='<table><thead><tr>'+headers.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';};
 let body='';
 for(const suite of ['core','composition']){
  const rows=E.families.map(family=>({family,...E.aggregate(episodes,actors,family,row=>row.suite===suite)}));
  body+='<tr class="table-group"><th scope="rowgroup" colspan="6">'+(suite==='core'?'Constants & single changes':'Repeated posture changes')+' · '+rows[0].attempts+' attempts per actor</th></tr>';
  body+=rows.map(row=>'<tr'+(row.family==='diffusion'?' class="ours"':'')+'><th scope="row">'+E.names[row.family]+'</th><td>'+row.attempts+'</td>'+['pass','gate'].map(key=>'<td>'+(E.isBest(row[key],rows.map(r=>r[key]))?'<strong class="winner">'+E.format(row[key])+'</strong>':E.format(row[key]))+'</td>').join('')+['cte','height'].map(key=>'<td>'+(E.isLowest(row[key],rows.map(r=>r[key]))?'<strong class="winner">'+E.format(row[key],2)+'</strong>':E.format(row[key],2))+'</td>').join('')+'</tr>').join('');
 }
 table('full-bank',['Controller','Attempts / actor','Original pass (%)','Tracking-gated pass (%)','Active CTE (cm)','Active height MAE (cm)'],body);body='';
 for(const suite of ['core','composition'])for(const speed of (suite==='core'?[.25,.5,.85]:[.35,.65,.85])){
  body+='<tr class="table-group"><th scope="rowgroup" colspan="4">'+(suite==='core'?'Constants & single changes':'Four repeated changes')+' · '+speed.toFixed(2)+' m/s</th></tr>';
  const variants=suite==='core'?profiles:[['Standing start',row=>row.key[2]===0],['Crouched start',row=>row.key[2]===1]];
  for(const [label,test] of variants){
   const values=E.families.map(family=>E.aggregate(episodes,actors,family,row=>row.suite===suite&&row.key[5]===speed&&test(row)).pass);
   body+='<tr><th scope="row">'+label+'</th>'+values.map(value=>'<td>'+(E.isBest(value,values)?'<strong class="winner">'+E.format(value)+'</strong>':E.format(value))+'</td>').join('')+'</tr>';
  }
 }
 table('breakdown',['Requested profile',...E.families.map(f=>E.names[f]+' (%)')],body);
 body=['core','composition'].map(suite=>{const row=E.aggregate(episodes,actors,'gaussian_random',r=>r.suite===suite);return '<tr><th scope="row">'+(suite==='core'?'Constants & single changes':'Repeated posture')+'</th><td>'+row.attempts+'</td><td>'+E.format(row.pass)+'</td><td>'+E.format(row.gate)+'</td></tr>';}).join('');
 table('scratch-reference',['Reference bank','Attempts / actor','Original pass (%)','Tracking-gated pass (%)'],body);
})().catch(error=>{console.error(error);document.getElementById('details-error').hidden=false;});
