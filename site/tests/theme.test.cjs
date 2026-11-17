const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../theme.js'),'utf8');

function boot(saved,blocked=false){
 const root={dataset:{}},callbacks={},events={},button={hidden:true,textContent:'',attrs:{},
  setAttribute(key,value){this.attrs[key]=value;},addEventListener(key,callback){events[key]=callback;}};
 const image={dataset:{},src:'assets/figures/timing/walk_to_crouch_speed.svg',
  getAttribute(){return this.src;},setAttribute(key,value){assert.equal(key,'src');this.src=value;}};
 const document={documentElement:root,readyState:'loading',getElementById:()=>button,
  querySelectorAll:()=>[image],addEventListener:(key,callback)=>callbacks[key]=callback};
 const storage={getItem(){if(blocked)throw Error('Storage disabled');return saved;},
  setItem(key,value){if(blocked)throw Error('Storage disabled');assert.equal(key,'path-diff-theme');saved=value;}};
 vm.runInNewContext(code,{document,localStorage:storage});
 return {root,button,image,ready:()=>callbacks.DOMContentLoaded(),click:()=>events.click(),saved:()=>saved};
}

test('dark is the initial theme and the control is progressively enabled',()=>{
 const page=boot();assert.equal(page.root.dataset.theme,'dark');assert.equal(page.button.hidden,true);
 page.ready();assert.equal(page.button.hidden,false);assert.equal(page.button.textContent,'Light theme');
});
test('stored light preference is applied before first paint',()=>{
 const page=boot('light');assert.equal(page.root.dataset.theme,'light');
 page.ready();assert.equal(page.button.attrs['aria-label'],'Switch to dark theme');
 assert.equal(page.image.src,'assets/figures/timing/light/walk_to_crouch_speed.svg');
});
test('theme and chart assets switch in both directions without changing data',()=>{
 const page=boot();page.ready();page.click();assert.equal(page.root.dataset.theme,'light');
 assert.equal(page.saved(),'light');page.click();assert.equal(page.root.dataset.theme,'dark');
 assert.equal(page.image.src,'assets/figures/timing/walk_to_crouch_speed.svg');assert.equal(page.saved(),'dark');
});
test('preference survives a second page load',()=>{
 const first=boot();first.ready();first.click();const next=boot(first.saved());
 assert.equal(next.root.dataset.theme,'light');
});
test('blocked storage or invalid stored values do not break the selector',()=>{
 const page=boot('light',true);assert.equal(page.root.dataset.theme,'dark');page.ready();page.click();
 assert.equal(page.root.dataset.theme,'light');assert.equal(boot('invalid').root.dataset.theme,'dark');
});
