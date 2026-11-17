"""Rebuild conservative development tables from frozen raw traces, not screenshots."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np


def section_metrics(progress, height, edges, targets, interpolate, terminal_margin=.15):
    result = []
    for i, (left, right) in enumerate(zip(edges[:-1], edges[1:])):
        # Traces start after the first control step and progress is quantized
        # on 4 cm path samples. Do not classify its unobserved first bin as a
        # missed posture. This fixed domain rule is identical for every actor.
        if i == 0:
            left += .04
        if i == len(targets)-1:
            right -= terminal_margin
        if right <= left:
            raise ValueError('Section shorter than terminal margin')
        count = max(1, int(np.ceil((right-left)/.01)))
        grid = left+(np.arange(count)+.5)*(right-left)/count
        values = interpolate(progress, height, grid)
        valid = np.isfinite(values)
        error = float(np.mean(np.abs(values[valid]-targets[i]))) if valid.any() else None
        # A single missing midpoint at the start of the first section can
        # arise from post-step logging. Keep it missing in the MAE; tolerate
        # at most one grid cell here, never a missing internal/terminal tail.
        complete = bool(valid.all() or (i == 0 and len(valid)>1 and not valid[0] and valid[1:].all()))
        result.append(dict(mae_cm=None if error is None else error*100,
                           coverage=float(valid.mean()), complete=complete,
                           conforms=bool(complete and error <= .04)))
    return result


def export(research, site):
    sys.path.insert(0, str(research))
    from scripts.research_comparison.transition_audit import path_profile
    from scripts.diffusion_policy.evaluation.metrics import project_trajectory_to_polyline
    from scripts.diffusion_policy.evaluation.diagnostic_v2 import _interpolate_first_passage
    actors = [a for a in json.loads((site/'data/actors.json').read_text())
              if a['family'] in ('diffusion','hierarchy','gaussian_bc')]
    summaries=[]; records=[]; hashes={}; keys={}
    base={'procedural','coherent_smooth','rounded_waypoint','hard_waypoint'}
    for actor in actors:
        keys[actor['id']]=set()
        for folder in sorted((research/'scratch/data_reuse_local_20261115').glob(actor['id']+'_*_stage50')):
            suite='composition' if '_composition_' in folder.name else 'core'
            if suite=='core' and '_core_' not in folder.name: continue
            names=('timeseries.npz','timeseries_metadata.json','episode_metrics.json')
            if not all((folder/name).exists() for name in names): raise ValueError('Incomplete bundle '+str(folder))
            meta=json.loads((folder/names[1]).read_text()); metrics=json.loads((folder/names[2]).read_text())
            for name in names: hashes[folder.name+'/'+name]=hashlib.sha256((folder/name).read_bytes()).hexdigest()
            with np.load(folder/names[0]) as z:
                for i,(scenario,original) in enumerate(zip(meta['scenarios'],metrics,strict=True)):
                    if scenario['path_shape'] not in base or not np.isclose(scenario['requested_speed_m_s'],.35 if suite=='composition' else .25): continue
                    arc,heights,changes=path_profile(scenario)
                    key=(suite,scenario['path_shape'],scenario['repeat'],scenario.get('transition_direction'),float(heights[0]))
                    if key in keys[actor['id']]: raise ValueError('Duplicate condition')
                    keys[actor['id']].add(key)
                    n=int(original['active_steps']); valid=z['valid'][:n,i].astype(bool)
                    if not valid.all(): raise ValueError('Invalid sample in active trace')
                    p,cte=project_trajectory_to_polyline(z['positions_xy'][:n,i],scenario['path_xy']) if n else (np.array([]),np.array([]))
                    h=z['achieved_height_m'][:n,i]
                    edges=np.r_[arc[0],arc[changes],arc[-1]]; targets=np.r_[heights[0],heights[changes]]
                    sections=section_metrics(p,h,edges,targets,_interpolate_first_passage)
                    all_sections=all(s['conforms'] for s in sections)
                    events=[]
                    for j,b in enumerate(arc[changes]):
                        left=max(b-.6,(arc[changes[j-1]]+b)/2 if j else 0)
                        right=min(b+.6,(b+arc[changes[j+1]])/2 if j+1<len(changes) else arc[-1])
                        mask=(p>=left)&(p<=right)
                        if n: mask[0]=False
                        complete=bool(n and p.max()>=right and p.min()<=left+.04)
                        eligible=bool(complete and sections[j]['conforms'] and sections[j+1]['conforms'])
                        d=z['action_delta_rms'][:n,i][mask]
                        tilt=z['tilt_deg'][:n,i][mask]
                        events.append(dict(direction='up' if targets[j+1]>targets[j] else 'down',
                            complete_window=complete,eligible=eligible,samples=int(mask.sum()),
                            command_delta_p95=float(np.percentile(d,95)) if len(d) else None,
                            tilt_p95_deg=float(np.percentile(tilt,95)) if len(tilt) else None))
                    arrived=bool(original['task_arrived'])
                    joint=bool(original['task_success'] and all_sections and n and np.sqrt(np.mean(cte**2))<=.1)
                    records.append(dict(actor=actor['id'],family=actor['family'],key=key,
                        block=('repeated-standing' if heights[0]>.2 else 'repeated-crouched') if suite=='composition' else ('single' if len(changes) else 'constant'),
                        arrived=arrived,legacy_pass=bool(original['task_success']),all_sections=all_sections,joint_pass=joint,
                        cte_cm=float(100*np.sqrt(np.mean(cte**2))) if n else None,
                        height_cm=float(100*np.mean(np.abs(h-z['required_height_m'][:n,i]))) if n else None,
                        sections=sections,events=events))
    reference=next(iter(keys.values()))
    if len(reference)!=48 or any(k!=reference for k in keys.values()): raise ValueError('Expected 48 matched conditions per actor')
    mean=lambda v:float(np.mean(v)) if len(v) else None
    for actor in actors:
        for block in ('constant','single','repeated-standing','repeated-crouched'):
            rows=[r for r in records if r['actor']==actor['id'] and r['block']==block]
            arrived=[r for r in rows if r['arrived']]
            events=[e for r in rows for e in r['events']]; eligible=[e for e in events if e['eligible']]
            summaries.append(dict(actor=actor['id'],family=actor['family'],block=block,n=len(rows),
                arrivals=len(arrived),legacy_pass=100*mean([r['legacy_pass'] for r in rows]),
                joint_pass=100*mean([r['joint_pass'] for r in rows]),all_sections=100*mean([r['all_sections'] for r in rows]),
                cte_arrived_cm=mean([r['cte_cm'] for r in arrived]),height_arrived_cm=mean([r['height_cm'] for r in arrived]),
                planned_events=len(events),eligible_events=len(eligible),
                command_delta_p95=mean([e['command_delta_p95'] for e in eligible]),
                tilt_p95_deg=mean([e['tilt_p95_deg'] for e in eligible])))
    payload=dict(schema_version=1,status='exploratory development; not confirmatory',
        contract=dict(section_tolerance_cm=4,initial_unobserved_bin_m=.04,initial_grid_cell_tolerance=1,terminal_margin_m=.15,grid_cm=1,
            startup='historical policy-controlled settling; no trajectory trimming',
            smoothness='conditional command variation and tilt; not jerk or causal superiority'),
        actors=actors,rows=summaries,episodes=records,source_sha256=hashes)
    output=site/'data/publication-evidence.json'
    output.write_text(json.dumps(payload,allow_nan=False,separators=(',',':')),encoding='utf-8')
    print(f'Exported {len(records)} episodes / {len(summaries)} actor-block rows to {output}')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--research-root',type=Path,required=True)
    args=parser.parse_args()
    export(args.research_root.resolve(),Path(__file__).resolve().parents[1])
