// Behaviour/DOM-contract test. Does not substitute for a browser screenshot.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const nodes=new Map();let videos=[],observer;
class Node {
 constructor(id=''){this.id=id;this.children=[];this.dataset={};this.attrs={};this.textContent='';}
 append(node){this.children.push(node);}
 setAttribute(k,v){this.attrs[k]=v;}
 set innerHTML(value){this.html=value;if(this.id==='videos')videos=[...value.matchAll(/<video\b([^>]+)>/g)].map(m=>({markup:m[1],readyState:4,ended:false,currentTime:0,playCount:0,play(){this.playCount++;return Promise.resolve();},pause(){},click(){this.onclick();}}));}
 get innerHTML(){return this.html||'';}
}
for(const [,id] of html.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+id,new Node(id));
const document={getElementById:id=>{assert(nodes.has('#'+id),'Missing ID '+id);return nodes.get('#'+id);},querySelector:s=>{assert(nodes.has(s),'Missing selector '+s);return nodes.get(s);},querySelectorAll:s=>s==='#videos video'?videos:s==='.scenario-button'?nodes.get('#scenario-grid').children:[],createElement:()=>new Node()};
const errors=[];
const context={document,fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(site,url),'utf8'))}),matchMedia:()=>({matches:false}),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},console:{error:e=>errors.push(e)},IntersectionObserver:class{constructor(callback){observer=callback;}observe(){}}};
(async()=>{
 await vm.runInNewContext(fs.readFileSync(path.join(site,'app.js'),'utf8'),context);
 await vm.runInNewContext(fs.readFileSync(path.join(site,'research.js'),'utf8'),context);
 await new Promise(setImmediate);
 assert.equal(errors.length,0,String(errors));
 const buttons=nodes.get('#scenario-grid').children;
 assert.equal(buttons.length,4);
 const arc=nodes.get('#family-grid').innerHTML.match(/<path d="([^"]+)"[^>]*\/><\/svg><span>Arc<\/span>/);
 assert(arc,'Arc family is rendered');
 const arcXs=[...arc[1].matchAll(/[ML]([-\d.]+),/g)].map(m=>Number(m[1]));
 assert(Math.abs((Math.max(...arcXs)+Math.min(...arcXs))/2-90)<1e-6,'Arc is horizontally centred');
 for(const b of buttons){b.onclick();await new Promise(setImmediate);assert.equal(videos.length,3);assert(videos.every(v=>v.markup.includes('width="960" height="540"')&&v.markup.includes('height:auto')));assert(nodes.get('#videos').innerHTML.includes('Path Diff (ours)'));}
 observer([{isIntersecting:true}]);await new Promise(setImmediate);
 assert(videos.every(v=>v.playCount>0));
 assert.equal(nodes.get('#play').textContent,'Pause together');
 nodes.get('#play').onclick();assert.equal(nodes.get('#play').textContent,'Play together');
 for(const id of ['training-table','timing-table','baseline-table']){
  const output=nodes.get('#'+id).innerHTML;
  assert(output.includes('<table>'),id);
  assert(!/NaN|undefined/.test(output),id);
  assert.equal([...output.matchAll(/<th scope="row">/g)].length,3,id);
  assert([...output.matchAll(/class="winner"/g)].length>0,id+' has highlighted metric winners');
 }
 assert(nodes.get('#baseline-table').innerHTML.includes('0.25 m/s'));
 assert(nodes.get('#baseline-table').innerHTML.includes('100.0'));
 assert(nodes.get('#baseline-table').innerHTML.includes('Path Diff (ours)'));
 const broad=nodes.get('#full-results-table').innerHTML;
 assert.equal([...broad.matchAll(/<th scope="row">/g)].length,8);
 assert.equal([...broad.matchAll(/scope="rowgroup"/g)].length,2);
 assert(broad.includes('98.6'));
 assert(broad.includes('Random-init PPO'));
 assert(broad.includes('168')&&broad.includes('84'));
 assert(!/NaN|undefined/.test(broad));
 assert([...broad.matchAll(/class="winner"/g)].length>=10,'each metric is highlighted within each task bank');
 const profiles=nodes.get('#profile-results-table').innerHTML;
 assert.equal([...profiles.matchAll(/scope="rowgroup"/g)].length,3);
 assert.equal([...profiles.matchAll(/<th scope="row">/g)].length,12);
 assert(profiles.includes('Constant crouch')&&profiles.includes('Crouch → walk'));
 assert(!/NaN|undefined/.test(profiles));
 const speed=nodes.get('#speed-results-table').innerHTML;
 assert.equal([...speed.matchAll(/<th scope="row">/g)].length,4);
 assert(speed.includes('0.25 m/s')&&speed.includes('0.85 m/s'));
 const startup=nodes.get('#startup-table').innerHTML;
 assert.equal([...startup.matchAll(/<th scope="row">/g)].length,3);
 assert(!startup.includes('class="winner"'));
 const sections=nodes.get('#section-results-table').innerHTML;
 assert.equal([...sections.matchAll(/<th scope="row">/g)].length,6);
 assert(sections.includes('Section 5')&&sections.includes('Sampled distance'));
 assert(!/NaN|undefined/.test(sections));
 assert(!sections.includes('class="winner"'));
 const originalFetch=context.fetch;
 context.fetch=async url=>{
  const data=await (await originalFetch(url)).json();
  if(url.endsWith('actors.json')){
   const reference=data.find(a=>a.id==='wc42');
   for(const id of ['wc43','wc44'])if(!data.some(a=>a.id===id))data.push({...reference,id});
  }
  if(url.endsWith('episodes.json')){
   const reference=data.filter(e=>e.actor==='wc42');
   for(const id of ['wc43','wc44'])if(!data.some(e=>e.actor===id))data.push(...reference.map(e=>({...e,actor:id})));
  }
  return {ok:true,json:async()=>data};
 };
 // Synthetic duplicate actors test aggregation only, never exported to the site.
 await vm.runInNewContext(fs.readFileSync(path.join(site,'research.js'),'utf8'),context);
 await new Promise(setImmediate);
 assert.equal(errors.length,0,String(errors));
 const oursRow=nodes.get('#full-results-table').innerHTML.match(/<tr class="ours">(.*?)<\/tr>/s)[1];
 assert(!oursRow.includes('±'),'website displays the mean without SD');
 assert(nodes.get('#bank-actor-counts').textContent.includes('Path Diff (ours) 3'));
 assert(!nodes.get('#diffusion-seed-coverage').textContent.includes('Only seed 42'));
 assert(html.includes('<h1>Path-Conditioned Diffusion Policies for Quadruped Locomotion</h1>'));
 assert(html.includes('following a route with posture and timing requirements'));
 for(const id of ['single-response','repeated-response']){
  const output=nodes.get('#'+id).innerHTML;
  assert.equal([...output.matchAll(/<svg /g)].length,2,id);
  assert(!/NaN|undefined/.test(output),id);
 }
 assert(nodes.get('#single-response').innerHTML.includes('-0.6'));
 assert(nodes.get('#repeated-response').innerHTML.includes('4.0'));
 assert(nodes.get('#repeated-response').innerHTML.includes('four successive changes'));
 assert(!nodes.get('#repeated-response').innerHTML.includes('Distance from posture change'));
 console.log('Full-bank aggregate (8 rows), conservative subset, title, videos and transition panels passed. Layout screenshot still required.');
})().catch(e=>{console.error(e);process.exitCode=1;});
