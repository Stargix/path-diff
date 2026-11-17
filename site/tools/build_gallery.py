#!/usr/bin/env python3
"""Import the selected, completed simulation captures into the static page."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import imageio.v2 as imageio
import numpy as np

SITE = Path(__file__).resolve().parents[1]
ACTORS = ("h42", "wc42", "gaussian_bc_42")
CASES = (
    ("ood-s-curve", "OOD S-curve · walk to crouch", "ood_s_curve", "core", 0.50),
    ("walk-to-crouch", "Walk to crouch", "coherent_smooth", "core", 0.50),
    ("corner-moderate", "OOD corner", "ood_corner", "core", 0.50),
    ("repeated-standing-original-slow", "Repeated posture changes", "coherent_smooth", "composition", 0.35),
    ("fast-crouch", "Fast crouch request", "coherent_smooth", "core", 0.85),
)


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def route(bank, family):
    index = next(i for i, (f, r) in enumerate(zip(bank['family'], bank['repeat'])) if str(f) == family and int(r) == 0)
    return bank['xy'][int(bank['offsets'][index]):int(bank['offsets'][index + 1])].round(4).tolist()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--captures', required=True, type=Path)
    p.add_argument('--repeated', required=True, type=Path)
    p.add_argument('--core-bank', required=True, type=Path)
    p.add_argument('--composition-bank', required=True, type=Path)
    args = p.parse_args()
    banks = {'core': np.load(args.core_bank), 'composition': np.load(args.composition_bank)}
    cases = []
    for case_id, title, family, suite, speed in CASES:
        case = {'id': case_id, 'title': title, 'family': family, 'suite': suite, 'speed': speed,
                'path_xy': route(banks[suite], family), 'clips': []}
        for actor in ACTORS:
            source = (args.repeated if suite == 'composition' else args.captures) / case_id / actor
            movie, metadata, metrics = (source / x for x in ('capture.mp4', 'capture.capture.json', 'capture.metrics.json'))
            if not all(x.is_file() for x in (movie, metadata, metrics, source / 'evaluation/evaluation_summary.json')):
                raise FileNotFoundError(f'Incomplete capture: {source}')
            meta, m = json.loads(metadata.read_text()), json.loads(metrics.read_text())
            if meta['actor_id'] != actor or meta['scenario_id'] != case_id or sha(movie) != meta['video_sha256'] or sha(metrics) != meta['metrics_sha256']:
                raise ValueError(f'Capture identity or hash mismatch: {source}')
            if not np.isclose(meta['scenario_key']['requested_speed_m_s'], speed) or meta['scenario_key']['path_shape'] != family:
                raise ValueError(f'Incorrect scenario: {source}')
            dst = SITE / 'assets/media/comparisons' / case_id / actor
            dst.mkdir(parents=True, exist_ok=True)
            shutil.copy2(movie, dst / 'capture.mp4')
            shutil.copy2(metadata, dst / 'capture.capture.json')
            shutil.copy2(metrics, dst / 'capture.metrics.json')
            reader = imageio.get_reader(str(movie))
            try:
                frame = reader.get_data(min(20, len(meta['frame_times_s']) - 1))
                imageio.imwrite(dst / 'poster.jpg', frame, quality=85)
            finally:
                reader.close()
            rel = dst.relative_to(SITE).as_posix()
            case['clips'].append({'actor': actor, 'video': rel + '/capture.mp4', 'poster': rel + '/poster.jpg',
                'metadata': rel + '/capture.capture.json', 'metrics_file': rel + '/capture.metrics.json',
                'fps': meta['fps'], 'frame_times_s': meta['frame_times_s'], 'end_reason': meta['end_reason'],
                'video_sha256': meta['video_sha256'], 'checkpoint_sha256': meta['checkpoint_sha256'],
                'metrics': {k: m.get(k) for k in ('task_success', 'survived', 'route_arrived', 'route_arrival_time_s',
                    'task_success_mean_speed_error_m_s', 'active_cross_track_rmse_m', 'active_height_mae_m')}})
        cases.append(case)
    # Also draw the four base families and three OOD families from the same frozen bank.
    families = [{'id': f, 'path_xy': route(banks['core'], f), 'ood': f.startswith('ood_')} for f in
                ('procedural', 'coherent_smooth', 'rounded_waypoint', 'hard_waypoint', 'ood_arc', 'ood_s_curve', 'ood_corner')]
    (SITE / 'data/gallery.json').write_text(json.dumps({'cases': cases, 'families': families}, separators=(',', ':')), encoding='utf-8')
    print(f'Imported {sum(len(c["clips"]) for c in cases)} verified captures.')


if __name__ == '__main__':
    main()
