"""Materialize an uninspected confirmation bank and frozen task contract; no GPU runs."""
import argparse
import hashlib
import json
import sys
from pathlib import Path


def prepare(research,site,output):
    sys.path.insert(0,str(research))
    from scripts.diffusion_policy.evaluation.route_bank import generate_bank,save_route_bank
    if output.exists(): raise FileExistsError('Preserve frozen contract; choose a new directory')
    output.mkdir(parents=True)
    families=['procedural','coherent_smooth','rounded_waypoint','hard_waypoint']
    bank=output/'routes.npz'
    routes=generate_bank(families,routes_per_family=8,base_seed=202611170701,split='confirmation_20261117_v1')
    save_route_bank(bank,routes)
    actors=[a for a in json.loads((site/'data/actors.json').read_text()) if a['family'] in ('diffusion','hierarchy','gaussian_bc')]
    conditions=[]
    for route in routes:
        for speed in (.25,.35):
            for profile in ('walk','crouch','walk_to_crouch','crouch_to_walk'):
                conditions.append(dict(family=route.family,repeat=route.repeat,speed=speed,profile=profile))
        for start in ('walk','crouch'):
            conditions.append(dict(family=route.family,repeat=route.repeat,speed=.35,profile='repeated',start=start,segment_m=.8))
    contract=dict(version=1,status='prepared; not executed; no outcomes inspected',actors=actors,
        bank_sha256=hashlib.sha256(bank.read_bytes()).hexdigest(),conditions=conditions,
        section_tolerance_m=.04,initial_unobserved_bin_m=.04,initial_grid_cell_tolerance=1,terminal_margin_m=.15,cte_gate_m=.1,
        startup=dict(estimand='end-to-end including policy-controlled initialization',warmup_steps=25,posture_settle_steps=50,
            deterministic_resets=True,record_staging_failures=True,reanchor_after_settling=False,trim_start=False),
        inference='native checkpoint frequencies; system comparison, not architecture-only',
        primary='legacy task pass AND every section conforming AND CTE<=0.1m; retain all planned attempts',
        proximity=dict(primary_claim=False,status='optional design only; no superiority claim',separations_m=[.8,1.6],
            route_length_m=4,speed_mps=.35,geometry='straight',starts=['walk','crouch'],
            boundaries_rule='(4-separation)/2 and (4+separation)/2; requires explicit two-change executor before running'),
        limitations=['shared offline prior','one evaluated diffusion seed in current development evidence',
            'no claim of standardized physical state after settling','new posture metric prospectively fixed, not independently validated yet'])
    (output/'contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
    digest=hashlib.sha256((output/'contract.json').read_bytes()).hexdigest()
    (output/'SHA256.txt').write_text(digest+'  contract.json\n'+contract['bank_sha256']+'  routes.npz\n')
    print(f'Frozen {len(routes)} geometries / {len(conditions)} conditions per actor. No simulations launched.')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--research-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();prepare(a.research_root.resolve(),Path(__file__).resolve().parents[1],a.output.resolve())
