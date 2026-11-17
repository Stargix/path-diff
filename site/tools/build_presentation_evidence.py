"""Curate matched-range development comparisons and preserve ordered traces.

This post-hoc subset is not a new held-out benchmark. Geometry stress and
speed extrapolation are deliberately excluded from its method ranking.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np

BASE={'procedural','coherent_smooth','rounded_waypoint','hard_waypoint'}
SINGLE_GRID=np.round(np.arange(-.6,.601,.02),4)
ROUTE_GRID=np.round(np.arange(0,4.001,.02),4)


def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()


def average(curves,grid):
    if not curves:return dict(mean_height_m=[None]*len(grid),n=[0]*len(grid))
    a=np.asarray(curves);counts=np.isfinite(a).sum(axis=0);sums=np.nansum(a,axis=0)
    return dict(mean_height_m=[float(v/n) if n else None for v,n in zip(sums,counts)],n=counts.tolist())


def section_errors(progress,height,arc,targets,changes,interpolate):
    """Equal-distance first-passage errors, with no transition exclusions.

    Five sections remain ordered. Missing locations are never imputed. These
    continuous diagnostics do not introduce a new transition-success threshold.
    """
    edges=np.r_[arc[0],arc[changes],arc[-1]]
    result=[]
    for j,(left,right) in enumerate(zip(edges[:-1],edges[1:])):
        count=max(1,int(np.ceil((right-left)/.01)))
        grid=left+(np.arange(count)+.5)*(right-left)/count
        sampled=interpolate(progress,height,grid)
        target=targets[0 if j==0 else changes[j-1]]
        valid=np.isfinite(sampled)
        result.append(dict(mae_cm=float(100*np.mean(np.abs(sampled[valid]-target))) if valid.any() else None,
                           coverage=float(valid.mean())))
    return result


def build(research,site):
    sys.path.insert(0,str(research.resolve()))
    from scripts.diffusion_policy.evaluation.diagnostic_v2 import _interpolate_first_passage
    from scripts.diffusion_policy.evaluation.metrics import project_trajectory_to_polyline
    from scripts.research_comparison.transition_audit import path_profile
    source=research/'scratch/data_reuse_local_20261115'
    actors=json.loads((site/'data/actors.json').read_text())
    actors=[a for a in actors if a['family'] in ('diffusion','hierarchy','gaussian_bc')]
    episodes=json.loads((site/'data/episodes.json').read_text())
    summaries=[];single=[];repeated=[];sections=[];hashes={};condition_sets={}
    for actor in actors:
        selected=[e for e in episodes if e['actor']==actor['id'] and e['key'][3] in BASE]
        core=[e for e in selected if e['suite']=='core' and e['key'][5]==.25]
        starts=[[e for e in selected if e['suite']=='composition' and e['key'][5]==.35 and e['key'][2]==start] for start in (0,1)]
        if len(core)!=32 or any(len(rows)!=8 for rows in starts):raise ValueError('Incomplete matched subset')
        def metric(rows,key):
            values=[e[key] for e in rows if e[key] is not None and np.isfinite(e[key])]
            return float(np.mean(values)) if values else None
        summaries.append(dict(actor=actor['id'],family=actor['family'],core_n=32,repeated_n_per_start=8,
            core_success_percent=100*metric(core,'success'),core_cte_cm=100*metric(core,'total_cte_m'),
            repeated_standing_height_mae_cm=100*metric(starts[0],'full_active_height_mae_m'),
            repeated_crouched_height_mae_cm=100*metric(starts[1],'full_active_height_mae_m'),
            repeated_success_percent=[100*metric(rows,'success') for rows in starts],
            survived=[sum(e['survived'] for e in rows) for rows in (core,*starts)]))
        single_curves={'down':[],'up':[]};route_curves={0:[],1:[]};references={0:[],1:[]}
        condition_sets[actor['id']]={}
        for suite,variants in (('core',(1,)),('composition',(0,1))):
            for group in (0,1):
                for variant in variants:
                    folder=source/f'{actor["id"]}_{suite}_{group}_{variant}_stage50'
                    for name in ('timeseries.npz','timeseries_metadata.json','episode_metrics.json'):
                        hashes[f'{folder.name}/{name}']=digest(folder/name)
                    meta=json.loads((folder/'timeseries_metadata.json').read_text())
                    rows=json.loads((folder/'episode_metrics.json').read_text())
                    with np.load(folder/'timeseries.npz') as z:
                        for i,s in enumerate(meta['scenarios']):
                            wanted=.25 if suite=='core' else .35
                            if s['path_shape'] not in BASE or not np.isclose(s['requested_speed_m_s'],wanted):continue
                            key=(suite,variant,s['path_shape'],s['repeat'],s.get('transition_direction'))
                            condition_sets[actor['id']][str(key)]=hashlib.sha256(json.dumps(s,sort_keys=True).encode()).hexdigest()
                            n=int(rows[i]['active_steps'])
                            if not z['valid'][:n,i].all():raise ValueError('Invalid active sample')
                            p,_=project_trajectory_to_polyline(z['positions_xy'][:n,i],s['path_xy']) if n else (np.array([]),np.array([]))
                            h=z['achieved_height_m'][:n,i]
                            arc,height,changes=path_profile(s)
                            if suite=='core':
                                if len(changes)!=1:raise ValueError('Expected one change')
                                direction='down' if height[changes[0]]<height[changes[0]-1] else 'up'
                                single_curves[direction].append(_interpolate_first_passage(p-arc[changes[0]],h,SINGLE_GRID))
                            else:
                                if len(changes)!=4:raise ValueError('Expected four ordered changes')
                                sections.append(dict(actor=actor['id'],family=actor['family'],start=variant,
                                    route_family=s['path_shape'],repeat=s['repeat'],arrived=bool(rows[i]['task_arrived']),
                                    route_arrived=bool(rows[i]['route_arrived']),
                                    sections=section_errors(p,h,arc,height,changes,_interpolate_first_passage)))
                                route_curves[variant].append(_interpolate_first_passage(p,h,ROUTE_GRID))
                                indices=np.clip(np.searchsorted(arc,ROUTE_GRID,side='right')-1,0,len(height)-1)
                                references[variant].append(height[indices])
        for direction,curves in single_curves.items():
            if len(curves)!=8:raise ValueError('Missing single-change routes')
            single.append(dict(actor=actor['id'],direction=direction,planned=8,**average(curves,SINGLE_GRID)))
        for start,curves in route_curves.items():
            if len(curves)!=8:raise ValueError('Missing repeated routes')
            repeated.append(dict(actor=actor['id'],start=start,planned=8,**average(curves,ROUTE_GRID),
                reference_height_m=np.mean(references[start],axis=0).tolist()))
    keys=list(condition_sets.values())
    if any(k!=keys[0] for k in keys):raise ValueError('Unmatched trace conditions')
    data=dict(schema_version=1,design=dict(base_families=sorted(BASE),core_speed_mps=.25,repeated_speed_mps=.35,
        core_conditions_per_actor=32,repeated_conditions_per_start_per_actor=8,
        scope='Post-hoc development subset; conservative overlapping requests, not a proof of identical training support. No stress geometries or high-speed requests in this comparison.'),
        methods=summaries,single=dict(grid_m=SINGLE_GRID.tolist(),groups=single),
        repeated=dict(grid_m=ROUTE_GRID.tolist(),groups=repeated),sections=sections,source_sha256=hashes)
    output=site/'data/presentation-evidence.json'
    output.write_text(json.dumps(data,allow_nan=False,separators=(',',':')),encoding='utf-8')
    print(f'Wrote {output}; {len(actors)} actors, {len(actors)*32} trace conditions, no simulation reruns.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--research-root',type=Path,required=True)
    args=parser.parse_args()
    build(args.research_root,Path(__file__).resolve().parents[1])
