"""Rebuild the report's selected timing examples as web-native SVG figures.

Read archived rollouts only. Selection, active intervals, five-sample speed
smoothing and schedule-margin definition follow the original I2R figures.
No simulator, outcome-based reselection or comparative metric changes.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import LinearSegmentedColormap, Normalize
import numpy as np

SITE = Path(__file__).resolve().parents[1]
COLORS = {0.35: '#99bee7', 0.65: '#91d1b0', 0.85: '#ddb78f'}
RELATIVE = LinearSegmentedColormap.from_list('relative', ['#80b2da', '#e6e9e8', '#dfa978'])


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def smooth(values):
    return np.convolve(np.pad(values, (2, 2), mode='edge'), np.ones(5) / 5, mode='valid')


def local(points, path):
    angle = np.arctan2(*(path[1] - path[0])[::-1])
    rotation = np.array([[np.cos(angle), -np.sin(angle)], [np.sin(angle), np.cos(angle)]])
    return (points - path[0]) @ rotation


def project(points, path):
    delta = np.diff(path, axis=0)
    lengths = np.linalg.norm(delta, axis=1)
    fraction = np.clip(((points[:, None] - path[:-1]) * delta).sum(axis=2)
                       / np.maximum(lengths ** 2, 1e-12), 0, 1)
    candidates = path[:-1] + fraction[..., None] * delta
    segment = np.argmin(((points[:, None] - candidates) ** 2).sum(axis=2), axis=1)
    k = np.arange(len(points))
    return np.r_[0, np.cumsum(lengths)][segment] + fraction[k, segment] * lengths[segment]


def load(folder, root, sources):
    names = ['timeseries.npz', 'timeseries_metadata.json', 'evaluation_summary.csv']
    for name in names:
        path = folder / name
        sources.append({'path': path.relative_to(root).as_posix(), 'sha256': sha(path)})
    with (folder / names[2]).open(encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))
    return np.load(folder / names[0]), json.loads((folder / names[1]).read_text()), rows


def active(trace, row, index, dt):
    mask = trace['valid'][:, index].copy()
    arrival = float(row['task_success_time_s'])
    if np.isfinite(arrival) and row['task_arrived'].lower() == 'true':
        mask &= (np.arange(len(mask)) + 1) * dt <= arrival + 1e-5
    return mask


def save(fig, name, output):
    fig.savefig(output / (name + '.svg'), transparent=True, bbox_inches='tight', pad_inches=.12,
                metadata={'Date': None, 'Creator': 'Path Diff archived-report figure export'})
    plt.close(fig)


def build(root, report, output, data_path, theme='dark'):
    output.mkdir(parents=True, exist_ok=True)
    light = theme == 'light'
    foreground, grid = ('#53616b', '#d6dfe0') if light else ('#b6c0c8', '#2c353d')
    neutral = '#697b85' if light else '#b7c0c6'
    marker = '#52636e' if light else '#cad1d5'
    speed_colors = {0.35: '#2e628e', 0.65: '#216b48', 0.85: '#9c5e2b'} if light else COLORS
    relative_cmap = LinearSegmentedColormap.from_list('relative_light', ['#367aa5', '#6f818a', '#b7702c']) if light else RELATIVE
    plt.rcParams.update({'font.family': 'sans-serif', 'font.sans-serif': ['DejaVu Sans'],
                         'font.size': 11, 'text.color': foreground, 'axes.labelcolor': foreground,
                         'xtick.color': foreground if light else '#a6afb7',
                         'ytick.color': foreground if light else '#a6afb7',
                         'axes.edgecolor': neutral if light else '#4b5964', 'axes.spines.top': False,
                         'axes.spines.right': False, 'grid.color': grid,
                         'svg.fonttype': 'none', 'svg.hashsalt': 'path-diff-report-timing'})
    temporal_path = report / 'temporal_figure_provenance.json'
    geometry_path = report / 'compact_layout_provenance.json'
    temporal = json.loads(temporal_path.read_text())['selection']
    geometry = json.loads(geometry_path.read_text())['geometry_pace_maps']
    v2 = root / 'scripts/dppo_diffusion_rl/evaluations/wct_final_evaluation_v2_wc_seed42_20260930'
    sources = []
    trace, meta, rows = load(v2 / 'pace_dynamic', root, sources)
    curves = []
    for chosen in temporal['cases']:
        i = chosen['scenario']; scenario = meta['scenarios'][i]; row = rows[i]
        speed = chosen['requested_speed']; dt = meta['dt_s']
        assert scenario['repeat'] == chosen['repeat']
        assert scenario['transition_direction'] == chosen['direction']
        assert np.isclose(scenario['requested_speed_m_s'], speed)
        assert np.isclose(float(row['task_success_time_s']), chosen['arrival_time_s'])
        mask = active(trace, row, i, dt)
        path = np.asarray(scenario['path_xy'])
        arc = project(trace['positions_xy'][mask, i], path)
        time = (np.arange(len(mask)) + 1)[mask] * dt
        margin = (arc - chosen['active_origin_m']) / speed - time
        curves.append({**chosen, 'distance_m': arc.tolist(), 'time_s': time.tolist(),
                       'speed_m_s': smooth(trace['tangent_speed_m_s'][mask, i]).tolist(),
                       'margin_s': margin.tolist()})
    trace.close()
    # Share limits between directions so the two responses remain comparable.
    all_margin = np.concatenate([c['margin_s'] for c in curves])
    margin_limits = (np.floor(all_margin.min() * 2) / 2, np.ceil(all_margin.max() * 2) / 2)
    for direction in ['walk_to_crouch', 'crouch_to_walk']:
        for quantity in ['speed', 'margin']:
            fig, ax = plt.subplots(figsize=(5.25, 2.6), layout='constrained')
            ax.set_facecolor('none'); ax.grid(alpha=.8, linewidth=.7)
            ax.axvline(2, color=neutral, linestyle=':', linewidth=1)
            for curve in [c for c in curves if c['direction'] == direction]:
                speed = curve['requested_speed']
                ax.plot(curve['distance_m'], curve[quantity + ('_m_s' if quantity == 'speed' else '_s')],
                        color=speed_colors[speed], linewidth=1.7)
                if quantity == 'speed':
                    ax.axhline(speed, color=speed_colors[speed], linestyle='--', alpha=.55, linewidth=.8)
            if quantity == 'margin':
                ax.axhline(0, color=neutral, linewidth=.8)
            ax.set(xlim=(0, 4), xticks=[0, 1, 2, 3, 4],
                   ylim=(0, 1.7) if quantity == 'speed' else margin_limits,
                   xlabel='Distance along route (m)',
                   ylabel='Local speed (m/s)' if quantity == 'speed' else 'Schedule margin (s)')
            save(fig, direction + '_' + quantity, output)
    maps = []
    folders = {'coherent_smooth': v2 / 'id_intermediate_constant',
               'rounded_waypoint': v2 / 'id_intermediate_constant',
               'ood_s_curve': report / 'alternating_turn_restore/evaluation',
               'sweep_hard_turn': v2 / 'geometry_speed_sweep'}
    loaded = {}
    for chosen in geometry['cases']:
        family = chosen['family']; folder = folders[family]
        if folder not in loaded:
            loaded[folder] = load(folder, root, sources)
        trace, meta, rows = loaded[folder]; i = chosen['scenario']; row = rows[i]
        scenario = meta['scenarios'][i]
        assert scenario['path_shape'] == family
        assert scenario['repeat'] == chosen['repeat']
        assert np.isclose(scenario['requested_speed_m_s'], .65)
        assert np.isclose(float(row['active_cross_track_rmse_m']) * 100, chosen['active_cte_rmse_cm'])
        mask = active(trace, row, i, meta['dt_s'])
        path = np.asarray(scenario['path_xy']); reference = local(path, path)
        measured = local(trace['positions_xy'][mask, i], path)
        relative = smooth(trace['tangent_speed_m_s'][mask, i]) / .65 - 1
        maps.append({**chosen, 'reference_xy_m': reference.tolist(), 'measured_xy_m': measured.tolist(),
                     'relative_speed': relative.tolist()})
        fig, ax = plt.subplots(figsize=(3.25, 2.9), layout='constrained')
        ax.set_facecolor('none')
        ax.plot(*reference.T, '--', color=('#65727b' if light else '#a8b0b6'), linewidth=1, zorder=1)
        segments = np.stack((measured[:-1], measured[1:]), axis=1)
        collection = LineCollection(segments, cmap=relative_cmap, norm=Normalize(-1, 1), linewidth=2.6)
        collection.set_array(np.clip(relative[:-1], -1, 1)); ax.add_collection(collection)
        ax.plot(*reference[0], 'o', markersize=4, markerfacecolor=('#f8faf9' if light else '#101418'), markeredgecolor=marker)
        ax.plot(*reference[-1], 'x', markersize=5, color=marker)
        ax.autoscale(); ax.margins(.12); ax.set_aspect('equal', adjustable='datalim')
        ax.set(xlabel='Local x (m)', ylabel='Local y (m)')
        ax.grid(alpha=.65, linewidth=.6)
        save(fig, family + '_pace', output)
    for trace, _, _ in loaded.values():
        trace.close()
    manifests = [{'path': p.relative_to(root).as_posix(), 'sha256': sha(p)}
                 for p in [temporal_path, geometry_path]]
    payload = {'description': 'Archived I2R figures 7 and 8, WC seed 42. Illustrations, not cross-controller aggregates.',
               'new_rollouts': False, 'selection_changed': False, 'sources': sources,
               'selection_manifests': manifests, 'speed_smoothing_samples': 5,
               'projection': 'Original nearest-segment XY projection; post-step active samples through first arrival.',
               'margin': '(projected distance - archived active origin) / requested mean - active elapsed time',
               'temporal_selection': temporal['selection'],
               'geometry_selection': {k: geometry[k] for k in ['ordinary_selection', 'stress_selection', 'selection_uses_outcomes']},
               'curves': curves, 'geometry': maps}
    data_path.write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')
    print(f'Exported {len(curves)} timing traces and {len(maps)} geometry maps; no new rollouts.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, required=True)
    parser.add_argument('--theme', choices=['dark', 'light'], default='dark')
    args = parser.parse_args()
    root = args.source_root.resolve()
    build(root, root / 'scratch/i2r/path_conditioned_locomotion',
          SITE / 'assets/figures/timing' / ('light' if args.theme == 'light' else ''),
          SITE / 'data/timing-examples.json', args.theme)
