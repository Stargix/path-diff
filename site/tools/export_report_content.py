"""Import the report abstract, reported tables and current figure assets.

The original report benchmark and the later hierarchy bank remain separate.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

SITE=Path(__file__).resolve().parents[1]


def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()


def export(source):
    tex=source.read_text(encoding='utf-8')
    abstract=re.search(r'\\begin\{abstract\}(.*?)\\end\{abstract\}',tex,re.S).group(1).strip()
    tables={}
    for name in ('offline','time','holdout'):
        tables[name]=next(t for t in re.findall(r'\\begin\{table\}.*?\\end\{table\}',tex,re.S) if '\\label{tab:'+name+'}' in t)
    # Explicit transcription checked against numeric tokens in the source tables.
    training=[dict(method='Deterministic imitation',constant='0.0',transition='0.0',cte='5.4'),
              dict(method='Diffusion imitation',constant='2.8',transition='0.6',cte='3.5'),
              dict(method='Diffusion + DPPO (ours)',constant='100.0 ± 0.0',transition='99.9 ± 0.1',cte='2.1 ± 0.5')]
    timing=[dict(input='Remaining-time feedback',adherence=91.0,speed_mae=2.04),
            dict(input='Fixed requested mean',adherence=81.2,speed_mae=3.63),
            dict(input='Shuffled requested mean',adherence=29.2,speed_mae=17.87)]
    validation=[dict(speed=.25,id_adherence=97.7,stress_adherence=99.0,id_cte=1.75),
                dict(speed=.50,id_adherence=99.2,stress_adherence=100.0,id_cte=2.20),
                dict(speed=.85,id_adherence=67.2,stress_adherence=61.5,id_cte=5.32)]
    for row in training:
        for key in ('constant','transition','cte'):
            assert all(n in re.findall(r'\d+\.\d+',tables['offline']) for n in re.findall(r'\d+\.\d+',row[key]))
    for row in timing:
        for key in ('adherence','speed_mae'):assert str(row[key]) in tables['time']
    for row in validation:
        for key in ('id_adherence','stress_adherence','id_cte'):assert f'{row[key]:.2f}' in tables['holdout'] or f'{row[key]:.1f}' in tables['holdout']
    assets={}
    destination=SITE/'assets/figures/report';destination.mkdir(exist_ok=True)
    for name in ('fig_posture_transitions','speed_on_path','geometry_pace_maps','geometry_stress_strip','offline_coverage','training_families'):
        p=source.parent/'compact_figures'/f'{name}.png'
        shutil.copy2(p,destination/p.name)
        assets[f'assets/figures/report/{p.name}']=digest(p)
    data=dict(abstract=abstract,training=training,timing=timing,validation=validation,
              provenance=dict(tex_name=source.name,tex_sha256=digest(source),assets_sha256=assets))
    (SITE/'data/report.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Imported current report abstract, three tables and six figures; source document unchanged.')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True)
    export(p.parse_args().source)
