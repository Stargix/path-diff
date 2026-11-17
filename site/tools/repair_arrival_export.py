"""Re-export terminal-arrival fields from immutable episode records, without simulation."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--research-root', type=Path, required=True)
    args = parser.parse_args()
    research = args.research_root.resolve()
    sys.path.insert(0, str(research))
    from scripts.research_comparison.arrival_fields import arrival_fields
    site = Path(__file__).resolve().parents[1]
    path = site/'data/episodes.json'
    before = path.read_bytes()
    episodes = json.loads(before)
    lookup = {}; sources = {}
    pattern = re.compile(r'(.+)_(core|composition)_(\d+)_(\d+)_stage(\d+)$')
    actors = {row['actor'] for row in episodes}
    for folder in sorted((research/'scratch/data_reuse_local_20261115').iterdir()):
        match = pattern.fullmatch(folder.name)
        if not match or match[1] not in actors:
            continue
        raw = folder/'episode_metrics.json'
        if not raw.is_file():
            raise ValueError('Missing raw episode records: '+str(raw))
        sources[folder.name] = hashlib.sha256(raw.read_bytes()).hexdigest()
        for row in json.loads(raw.read_text()):
            key = (match[2], int(match[5]), int(match[4]), row['path_shape'], row['repeat'],
                   row['requested_speed'], row['requested_height'], row['transition_direction'])
            identity = (match[1], key)
            if identity in lookup:
                raise ValueError('Duplicate source condition')
            lookup[identity] = row
    if len(lookup) != len(episodes):
        raise ValueError('Raw/exported condition counts differ')
    corrected = 0
    for episode in episodes:
        original = lookup[(episode['actor'], tuple(episode['key']))]
        if bool(episode['success']) != bool(original['task_success']):
            raise ValueError('Original task label differs; refusing to rewrite it')
        fields = arrival_fields(original)
        corrected += episode['arrived'] != fields['arrived']
        episode.update(fields)
    # All records validated before writing. Other labels/errors remain untouched.
    path.write_text(json.dumps(episodes, allow_nan=False, separators=(',', ':')), encoding='utf-8')
    summary_path = site/'data/summary.json'
    summary = json.loads(summary_path.read_text())
    for key, value in summary.items():
        actor, suite, stage = key.split('/')
        rows = [row for row in episodes if row['actor']==actor and row['suite']==suite
                and row['stage']==int(stage.removeprefix('stage'))]
        if rows:
            value['arrived'] = sum(row['arrived'] for row in rows)
            errors = [row['arrival_speed_error_mps'] for row in rows if row['arrival_speed_error_mps'] is not None]
            value['arrival_speed_error_mps'] = dict(n=len(errors), mean=sum(errors)/len(errors) if errors else None)
    summary_path.write_text(json.dumps(summary, allow_nan=False, separators=(',', ':')), encoding='utf-8')
    provenance_path = site/'data/provenance.json'
    provenance = json.loads(provenance_path.read_text())
    provenance['terminal_arrival_export_correction'] = dict(date='2026-11-18', corrected_arrival_flags=corrected,
        previous_episodes_sha256=hashlib.sha256(before).hexdigest(),
        episodes_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_episode_metrics_sha256=sources,
        definition='arrived = task_arrived; route_arrived retained separately; speed error uses first terminal-task arrival',
        original_task_pass_and_tracking_measurements_unchanged=True)
    provenance_path.write_text(json.dumps(provenance, allow_nan=False, separators=(',', ':')), encoding='utf-8')
    print(f'Validated {len(episodes)} episodes; corrected {corrected} arrival flags; original pass labels unchanged.')


if __name__ == '__main__':
    main()
