"""Import WC43/44 only after all same-bank evaluations have completed."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile


def merge(episodes, extra):
    required = {'wc43', 'wc44'}
    if {r['actor'] for r in extra} != required:
        raise ValueError('Both archived actors must be evaluated before import')
    reference = {tuple(r['key']) for r in episodes if r['actor'] == 'wc42'}
    if len(reference) != 252:
        raise ValueError('Incomplete WC42 reference bank')
    for actor in required:
        rows = [r for r in extra if r['actor'] == actor]
        if len(rows) != 252 or {tuple(r['key']) for r in rows} != reference:
            raise ValueError(f'Unmatched or incomplete evaluation: {actor}')
    return [r for r in episodes if r['actor'] not in required] + extra


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--research-root', type=Path, required=True)
    parser.add_argument('--protocol', type=Path, required=True)
    args = parser.parse_args()
    research, root = args.research_root.resolve(), args.protocol.resolve()
    sys.path.insert(0, str(research))
    from scripts.research_comparison.complete_diffusion_seeds import EXPECTED, verify_pairs
    from scripts.research_comparison.analyze import analyze
    from scripts.research_comparison.transition_audit import audit
    from build_presentation_evidence import build
    from export_publication_evidence import export

    verify_pairs(root)
    analyze(root)  # Checks every completion marker and output checksum.
    analysis_path = root/'analysis.json'
    extra = json.loads(analysis_path.read_text())
    site = Path(__file__).resolve().parents[1]
    def read(name): return json.loads((site/'data'/name).read_text())
    episodes = merge(read('episodes.json'), extra['episodes'])
    actors = [a for a in read('actors.json') if a['id'] not in EXPECTED]
    for actor, digest in EXPECTED.items():
        actors.append(dict(id=actor, kind='policy', family='diffusion', display_label='Diffusion + DPPO',
            training_seed=int(actor[-2:]), checkpoint_sha256=digest, execution_horizon_steps=4,
            control_hz=50, decision_hz=12.5, checkpoint_selection='historically_selected'))
    summary = read('summary.json')
    summary.update(extra['summary'])
    provenance = read('provenance.json')
    provenance['diffusion_seed_completion'] = dict(
        analysis_sha256=hashlib.sha256(analysis_path.read_bytes()).hexdigest(),
        base_actor='wc42', actors=list(EXPECTED), extra_episodes=len(extra['episodes']),
        validation='All original materialized scenarios and staging/timing metadata matched exactly.')
    # Validate the full extended trace audit before changing any website data.
    output = root/'transition_audit'
    audit(Path(json.loads((root/'protocol.json').read_text())['reference_results']), output)
    report = json.loads((output/'transition_audit.json').read_text())
    compact = {k: report[k] for k in ('schema_version','protocol','groups','source_sha256')}
    compact.update(source_bundle_count=len(report['source_sha256'])//3,
                   episode_count=len(report['episodes']), planned_transition_count=len(report['events']))
    with tempfile.TemporaryDirectory(prefix='seed-import-', dir=site.parent) as temporary:
        staged = Path(temporary)
        (staged/'data').mkdir()
        def write(name, data):
            (staged/'data'/name).write_text(json.dumps(data, allow_nan=False, separators=(',', ':')), encoding='utf-8')
        # No means or figures are copied from the historical route bank.
        write('episodes.json', episodes)
        write('actors.json', actors)
        write('summary.json', summary)
        write('provenance.json', provenance)
        write('transition-audit.json', compact)
        build(research, staged)
        export(research, staged)
        for path in sorted((staged/'data').iterdir()):
            path.replace(site/'data'/path.name)
    print(f'Imported both archived WC actors: {len(actors)} actors, {len(episodes)} attempts.')


if __name__ == '__main__':
    main()
