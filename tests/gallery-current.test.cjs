const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const site=path.resolve(__dirname,'..'),gallery=JSON.parse(fs.readFileSync(path.join(site,'data/gallery.json'),'utf8'));
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('all gallery captures exist and match their original capture metadata',()=>{
 for(const scenario of gallery.cases){assert.equal(scenario.clips.length,3);const routes=new Set();
  for(const clip of scenario.clips){for(const key of ['video','poster','metadata','metrics_file']){assert(!clip[key].includes('..'));assert(fs.existsSync(path.join(site,clip[key])),clip[key]);}
   const meta=JSON.parse(fs.readFileSync(path.join(site,clip.metadata),'utf8'));assert.equal(meta.actor_id,clip.actor);assert.equal(digest(path.join(site,clip.video)),meta.video_sha256);assert.equal(digest(path.join(site,clip.metrics_file)),meta.metrics_sha256);assert.deepEqual(clip.frame_times_s,meta.frame_times_s);assert(clip.fps>0);assert(clip.frame_times_s.every((t,i,a)=>i===0||t>a[i-1]));routes.add(meta.route_sha256);
  }assert.equal(routes.size,1,'paired route geometry '+scenario.id);
 }
});
