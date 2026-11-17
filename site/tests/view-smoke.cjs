// DOM-contract checks; browser verification is still required for layout/playback.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..'),E=require('../evidence.js'),nodes=new Map();
let videos=[],observer;
class Element {
 constructor(id=''){this.id=id;this.children=[];this.dataset={};this.attrs={};this.textContent='';this.hidden=true;}
 append(node){this.children.push(node);}
 setAttribute(key,value){this.attrs[key]=value;}
 set innerHTML(value){this.html=value;if(this.id==='videos')videos=[...value.matchAll(/<video\b([^>]+)>/g)].map(match=>({markup:match[1],readyState:4,ended:false,currentTime:0,playCount:0,play(){this.playCount++;return Promise.resolve();},pause(){},click(){this.onclick();}}));}
 get innerHTML(){return this.html||'';}
}
const html=fs.readFileSync(path.join(site,'index.html'),'utf8'),details=fs.readFileSync(path.join(site,'results.html'),'utf8');
for(const [,id] of (html+details).matchAll(/\bid="([^"]+)"/g))nodes.set(id,new Element(id));
const document={getElementById:id=>{assert(nodes.has(id),'Missing ID '+id);return nodes.get(id);},querySelector:selector=>{assert(nodes.has(selector.slice(1)),'Missing '+selector);return nodes.get(selector.slice(1));},querySelectorAll:selector=>selector==='#videos video'?videos:selector==='.scenario-button'?nodes.get('scenario-grid').children:[],createElement:()=>new Element()};
const errors=[],context={window:{PathDiffEvidence:E},document,fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(site,url.split('?')[0]),'utf8'))}),matchMedia:()=>({matches:false}),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},console:{error:error=>errors.push(error)},IntersectionObserver:class{constructor(callback){observer=callback;}observe(){}}};
(async()=>{
 await vm.runInNewContext(fs.readFileSync(path.join(site,'app.js'),'utf8'),context);await new Promise(setImmediate);
 for(const button of nodes.get('scenario-grid').children){button.onclick();await new Promise(setImmediate);assert.equal(videos.length,3);assert(videos.every(video=>video.markup.includes('width="960" height="540"')));}
 assert.equal(nodes.get('scenario-grid').children.length,4);observer([{isIntersecting:true}]);await new Promise(setImmediate);assert(videos.every(video=>video.playCount>0),'visible videos autoplay');
 await vm.runInNewContext(fs.readFileSync(path.join(site,'research.js'),'utf8'),context);
 assert.equal(errors.length,0,String(errors));
 for(const id of ['system-results','composition-table']){const content=nodes.get(id).innerHTML;assert.equal((content.match(/<th scope="row">/g)||[]).length,6);assert(!/NaN|undefined|±/.test(content));}
 assert(nodes.get('bank-overview').textContent.includes('432'));assert(nodes.get('system-reading').textContent.includes('89.7%'));
 assert(!nodes.get('composition-table').innerHTML.includes('class="winner"'),'post-hoc diagnostic is not a leaderboard');
 assert(nodes.get('composition-table').innerHTML.includes('8 / 8'));
 for(const id of ['single-response','repeated-response']){const content=nodes.get(id).innerHTML;assert.equal((content.match(/<svg /g)||[]).length,2);assert(!/NaN|undefined/.test(content));}
 assert(nodes.get('single-response').innerHTML.includes('-0.6'));assert(nodes.get('repeated-response').innerHTML.includes('4.0'));
 await vm.runInNewContext(fs.readFileSync(path.join(site,'details.js'),'utf8'),context);
 assert.equal(errors.length,0,String(errors));assert.equal((nodes.get('breakdown').innerHTML.match(/<th scope="row">/g)||[]).length,18);
 console.log('PASS: four video cases, autoplay, primary/diagnostic tables, all three runs, complete response plots and 18 task/speed rows.');
})().catch(error=>{console.error(error);process.exitCode=1;});
