const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..'),nodes=new Map();
for(const id of ['task-table','composition-table','speed-profile-table','tracking-reading','composition-reading','research-error'])nodes.set(id,{innerHTML:'',hidden:true});
const errors=[];
const context={document:{getElementById:id=>{assert(nodes.has(id));return nodes.get(id);}},fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(site,p),'utf8'))}),console:{error:e=>errors.push(e)}};
(async()=>{await vm.runInNewContext(fs.readFileSync(path.join(site,'publication.js'),'utf8'),context);await new Promise(setImmediate);assert.equal(errors.length,0);
for(const id of ['task-table','composition-table']){const html=nodes.get(id).innerHTML;assert(html.includes('Path Diff (ours)'));assert.equal((html.match(/<tr>/g)||[]).length,7);assert(!html.includes('NaN'));assert(!html.includes('undefined'));}
const speed=nodes.get('speed-profile-table').innerHTML;assert(speed.includes('0.50 m/s'));assert(speed.includes('0.85 m/s'));assert.equal((speed.match(/<tr><th scope="row">/g)||[]).length,8);assert(!speed.includes('class="winner"'));assert(!speed.includes('NaN'));
assert(nodes.get('composition-table').innerHTML.includes('Original task pass'));assert(nodes.get('composition-table').innerHTML.includes('All-section check'));assert(!nodes.get('composition-table').innerHTML.includes('Command variation'));assert(nodes.get('tracking-reading').textContent.includes('cm for Path Diff'));assert(nodes.get('composition-reading').textContent.includes('reach the goal'));
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');assert(html.includes('src="publication.js?'));assert(html.includes('href="results.html"'));console.log('New task/composition tables rendered: 6 method rows each, explicit missing values, linked breakdown.');})();
