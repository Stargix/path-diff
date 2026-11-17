/* Actor-first aggregations. Source task labels and measurements are never rewritten. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PathDiffEvidence = api;
})(globalThis, function () {
  'use strict';
  const families = ['diffusion', 'hierarchy', 'gaussian_bc'];
  const names = {diffusion:'Path Diff (ours)', hierarchy:'Frozen-expert hierarchy', gaussian_bc:'Gaussian BC + PPO', gaussian_random:'Random-init PPO'};
  const mean = values => { const valid = values.filter(Number.isFinite); return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null; };
  const format = (value, digits=1) => Number.isFinite(value) ? value.toFixed(digits) : '—';
  function validateBank(episodes, actors) {
    const ids = new Set(actors.map(actor => actor.id)), seen = new Set();
    if (ids.size !== actors.length) throw Error('Duplicate actors');
    for (const row of episodes) {
      if (!ids.has(row.actor) || !['core','composition'].includes(row.suite) || !Array.isArray(row.key)) throw Error('Unknown actor or task');
      const key = row.actor+'|'+JSON.stringify(row.key);
      if (seen.has(key)) throw Error('Duplicate actor-condition');
      seen.add(key);
      if (row.adherence && !row.success) throw Error('Tracking gate exceeds task pass');
      if (row.success && !row.arrived) throw Error('Task pass without terminal arrival');
    }
    for (const actor of actors) for (const suite of ['core','composition']) {
      if (episodes.filter(row => row.actor===actor.id && row.suite===suite).length !== (suite==='core'?168:84)) throw Error('Incomplete actor bank: '+actor.id);
    }
    const reference=new Set(episodes.filter(row=>row.actor===actors[0].id).map(row=>JSON.stringify(row.key)));
    for(const actor of actors)if(episodes.filter(row=>row.actor===actor.id).some(row=>!reference.has(JSON.stringify(row.key))))throw Error('Task identities differ across actors');
    return {actors:actors.length, episodes:episodes.length};
  }
  function aggregate(episodes, actors, family, predicate) {
    const selected = actors.filter(actor => actor.family===family);
    if (!selected.length) throw Error('Missing family '+family);
    const groups = selected.map(actor => episodes.filter(row => row.actor===actor.id && predicate(row)));
    if (!groups[0].length || groups.some(group => group.length!==groups[0].length)) throw Error('Unmatched counts '+family);
    const rate = key => mean(groups.map(group => 100*mean(group.map(row => Number(row[key])))));
    const error = key => mean(groups.map(group => {const value=mean(group.map(row=>row[key]));return value===null?null:100*value;}));
    return {actors:selected.length, attempts:groups[0].length, pass:rate('success'), gate:rate('adherence'), arrivals:mean(groups.map(group=>group.filter(row=>row.arrived).length)), cte:error('total_cte_m'), height:error('full_active_height_mae_m')};
  }
  function sectionSummary(evidence, family, block) {
    const rows=evidence.rows.filter(row=>row.family===family && row.block===block);
    if (!rows.length || rows.some(row=>row.n!==rows[0].n)) throw Error('Missing section evidence');
    return {actors:rows.length, attempts:rows[0].n, pass:mean(rows.map(row=>row.legacy_pass)), sections:mean(rows.map(row=>row.all_sections)), arrivals:mean(rows.map(row=>row.arrivals))};
  }
  function series(groups, length) {
    return Array.from({length},(_,i)=>{const values=groups.map(group=>group.mean_height_m[i]).filter(Number.isFinite);return {mean:mean(values),low:values.length?Math.min(...values):null,high:values.length?Math.max(...values):null,actors:values.length};});
  }
  const isBest=(value,values)=>Number.isFinite(value)&&Math.abs(value-Math.max(...values.filter(Number.isFinite)))<1e-9;
  return {families,names,mean,format,validateBank,aggregate,sectionSummary,series,isBest};
});
