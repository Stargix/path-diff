// Pure DOM-contract test, not browser/layout verification.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const site = path.resolve(__dirname, '..');
class Element {
  constructor(value='') { this.value=value; this.children=[]; this.tagName='DIV'; }
  set innerHTML(value) { this.html=value; const first=value.match(/^<option value="([^"]+)"/); if(first)this.value=first[1]; }
  get innerHTML() { return this.html || ''; }
  append(node) { this.children.push(node); }
  before() {}
  querySelector() { return this.children.find(e=>e.tagName==='H2'); }
}
(async()=>{
  const ids = new Map();
  for (const [id,value] of Object.entries({'suite':'composition','start':'0','speed':'.35','family':'comparison','curves':'','legend':'','table':''})) ids.set(`#audit-${id}`,new Element(value));
  const section=new Element(); const heading=new Element(); heading.tagName='H2'; section.children=[heading,new Element()]; ids.set('#transitions',section);
  const errors=[];
  const document={querySelector:id=>{assert(ids.has(id),`Missing selector ${id}`);return ids.get(id);},createElement:()=>new Element()};
  await vm.runInNewContext(fs.readFileSync(path.join(site,'transition-audit.js'),'utf8'),{document,fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(site,'data/transition-audit.json'),'utf8'))}),console:{error:e=>errors.push(e)}});
  assert.equal(errors.length,0,String(errors));
  let cases=0;
  for(const suite of ['composition','core']) for(const start of ['0','1']) for(const speed of (suite==='core'?[.25,.5,.85]:[.35,.65,.85])) for(const family of ['comparison','hierarchy','gaussian_bc','gaussian_random']) {
    for(const [key,value] of Object.entries({suite,start,speed,family}))ids.get(`#audit-${key}`).value=String(value);
    ids.get('#audit-family').onchange();
    const html=ids.get('#audit-table').innerHTML+ids.get('#audit-curves').innerHTML;
    assert(!/NaN|undefined/.test(html),`${suite}/${start}/${speed}/${family}`);
    assert(html.includes('Path Diff (ours)'));
    cases++;
  }
  console.log(`Audit view: ${cases} selector combinations passed (DOM-contract test only).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
