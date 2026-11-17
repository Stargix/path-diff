/* Exploratory offline diagnostics. The original success metric is unchanged. */
(async function () {
  const section = document.querySelector('#transitions');
  const response = await fetch('data/transition-audit.json');
  if (!response.ok) throw Error('Transition audit data unavailable');
  const data = await response.json();
  const details = document.createElement('details');
  details.className = 'individual-trace';
  details.innerHTML = '<summary>Inspect the individual seed-42 example</summary>';
  [...section.children].filter(e => e.tagName !== 'H2').forEach(e => details.append(e));
  section.append(details);
  section.querySelector('h2').textContent = 'Transitions across routes and training seeds';
  const content = document.createElement('div');
  content.innerHTML = `<p class="section-copy">Compare both directions of height change across the complete development bank. The hierarchy varies substantially between training seeds; the selected videos alone do not establish an advantage for Path Diff.</p>
    <div class="filters"><label>Profile <select id="audit-suite"><option value="composition">Four repeated changes</option><option value="core">Single change</option></select></label><label>Initial posture <select id="audit-start"><option value="0">Standing</option><option value="1">Crouched</option></select></label><label>Requested mean <select id="audit-speed"></select></label><label>Controllers <select id="audit-family"><option value="comparison">Ours, hierarchy and Gaussian BC</option><option value="hierarchy">Ours and hierarchy</option><option value="gaussian_bc">Ours and Gaussian BC</option><option value="gaussian_random">Ours and random-weight PPO</option></select></label></div>
    <div id="audit-legend" class="audit-legend"></div><div id="audit-curves" class="audit-curves"></div>
    <p class="fine">Curves are mean measured height at first passage through each location, aligned with the actual discretized change. Only available trajectories contribute at each location; absent or failed transitions are not filled in. All planned transitions remain in the table below. Lines are separate training seeds, not confidence intervals.</p>
    <div class="table-scroll" id="audit-table"></div>
    <details><summary>Definitions and sensitivity to the scoring margin</summary><p>A completed transition requires the preceding and new height each to be held within 2 cm for 20 cm of progress in their respective segments. This exploratory diagnostic is stricter than task success and does not measure motion smoothness. Transitions not reached before arrival or failure remain in the denominator.</p><p>The last three columns recompute task success with 0, 10 or 25 cm excluded on each side of height changes, keeping arrival, pose and timing checks unchanged. The 25 cm column reproduces the official results. No alternative margin is selected as a replacement metric. Height MAE includes transitions and partial trajectories; read it alongside survival.</p><p>All results use development routes. Three online diffusion runs are available under a shared offline prior. Additional route conditions are not additional training seeds. Differences do not isolate diffusion, multimodality, control frequency or checkpoint selection.</p></details>
    <p class="fine"><a href="data/transition-audit.json" download>Download the all-seed transition audit ↓</a></p>`;
  details.before(content);
  const names = {wc42:'Path Diff (ours) · 42',h42:'Hierarchy · 42',h43:'Hierarchy · 43',h44:'Hierarchy · 44'};
  const family = id => id.startsWith('h') ? 'hierarchy' : id.startsWith('gaussian_random') ? 'gaussian_random' : id.startsWith('gaussian') ? 'gaussian_bc' : 'diffusion';
  const colors = {diffusion:'#8ec9ac',hierarchy:'#91b7e0',gaussian_bc:'#d6a980',gaussian_random:'#cc9db7'};
  const label = id => names[id] || `${family(id)==='gaussian_bc'?'Gaussian BC + PPO':'Random-weight PPO'} · ${id.slice(-2)}`;
  const dash = id => id.endsWith('43') ? '7 3' : id.endsWith('44') ? '2 3' : '';
  const select = name => document.querySelector(`#audit-${name}`);
  const fmt = v => Number.isFinite(v) ? (v*100).toFixed(2) : 'N/A';
  function speeds() {
    const values = select('suite').value==='core' ? [.25,.5,.85] : [.35,.65,.85];
    select('speed').innerHTML=values.map(v=>`<option value="${v}">${v.toFixed(2)} m/s</option>`).join('');
    select('start').disabled=select('suite').value==='core';
    render();
  }
  function render() {
    const suite=select('suite').value, speed=Number(select('speed').value), start=suite==='core'?null:Number(select('start').value), chosen=select('family').value;
    const groups=data.groups.filter(g=>g.suite===suite&&g.speed===speed&&g.start===start);
    const ids=['wc42','h42','h43','h44','gaussian_bc_42','gaussian_bc_43','gaussian_bc_44','gaussian_random_42','gaussian_random_43','gaussian_random_44'].filter(id=>family(id)==='diffusion'||(chosen==='comparison'?['hierarchy','gaussian_bc'].includes(family(id)):family(id)===chosen));
    const get=(id,direction)=>groups.find(g=>g.actor===id&&g.direction===direction);
    document.querySelector('#audit-legend').innerHTML=ids.map(id=>`<span><svg viewBox="0 0 30 8" aria-hidden="true"><path d="M0,4 L30,4" stroke="${colors[family(id)]}" stroke-width="2" stroke-dasharray="${dash(id)}"/></svg>${label(id)}</span>`).join('');
    const x=v=>48+(v+.3)/.9*410, y=v=>190-(v-.1)/.25*170;
    document.querySelector('#audit-curves').innerHTML=['down','up'].map(direction=>{
      const grid=[.1,.2,.3].map(v=>`<line x1="48" x2="458" y1="${y(v)}" y2="${y(v)}" stroke="#37414a"/><text x="40" y="${y(v)+4}" text-anchor="end">${v.toFixed(2)}</text>`).join('');
      const ticks=[-.3,0,.3,.6].map(v=>`<text x="${x(v)}" y="209" text-anchor="middle">${v.toFixed(1)}</text>`).join('');
      const before=direction==='down'?.2932:.1705, after=direction==='down'?.1705:.2932;
      const target=`M${x(-.3)},${y(before)} L${x(0)},${y(before)} L${x(0)},${y(after)} L${x(.6)},${y(after)}`;
      const paths=ids.map(id=>{let connected=false;const group=get(id,direction);const path=group.aligned_mean_height_m.map((v,i)=>{if(v===null){connected=false;return '';}const command=connected?'L':'M';connected=true;return `${command}${x(data.protocol.alignment_grid_m[i])},${y(v)}`;}).join(' ');return `<path d="${path}" fill="none" stroke="${colors[family(id)]}" stroke-width="${id==='wc42'?3:1.6}" stroke-dasharray="${dash(id)}"/>`;}).join('');
      return `<article class="audit-curve"><h3>${direction==='down'?'Standing → crouched':'Crouched → standing'}</h3><svg viewBox="0 0 480 240" role="img" aria-label="Mean measured height around ${direction==='down'?'crouching':'standing'} transitions">${grid}${ticks}<path d="${target}" fill="none" stroke="#d7dce0" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="${x(0)}" x2="${x(0)}" y1="20" y2="190" stroke="#59616b" stroke-dasharray="2 4"/>${paths}<text x="253" y="232" text-anchor="middle">Distance from height change (m)</text><text x="13" y="105" text-anchor="middle" transform="rotate(-90 13 105)">Height (m)</text></svg></article>`;
    }).join('');
    document.querySelector('#audit-table').innerHTML=`<table><thead><tr><th>Controller · seed</th><th>Down completed / planned</th><th>Up completed / planned</th><th>Survived 24 s</th><th>Height MAE (cm)</th><th>Success · 0 cm</th><th>10 cm</th><th>25 cm (official)</th></tr></thead><tbody>${ids.map(id=>{const d=get(id,'down'),u=get(id,'up');return `<tr><td>${label(id)}</td><td>${d.completed}/${d.planned} · ${d.reached} reached</td><td>${u.completed}/${u.planned} · ${u.reached} reached</td><td>${d.survived}/${d.episodes}</td><td>${fmt(d.height_mae_m)}</td>${['0.0','0.1','0.25'].map(m=>`<td>${d.sensitivity_success[m]}/${d.episodes}</td>`).join('')}</tr>`;}).join('')}</tbody></table>`;
  }
  select('suite').onchange=speeds;
  ['speed','start','family'].forEach(name=>select(name).onchange=render);
  speeds();
})().catch(error=>{console.error(error);const node=document.querySelector('#transitions');const p=document.createElement('p');p.textContent='Transition audit could not be loaded. Please reload or use the downloadable evaluation records.';node.append(p);});
