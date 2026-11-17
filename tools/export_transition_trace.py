"""Export a paired evaluation example for the project site.

Run from the isaaclab-solo worktree with numpy installed. These are original
evaluation traces, not the later video captures of the same condition.
"""
import json
from pathlib import Path

import numpy as np

root = Path(__file__).resolve().parents[3] / "hierarchical-experts" / "scratch" / "data_reuse_local_20261115"
output = Path(__file__).resolve().parents[1] / "data" / "transition-example.json"
actors = ("wc42", "h42", "gaussian_bc_42")
result = {"scenario": "coherent_smooth, repeat 0, standing start, 0.35 m/s", "actors": {}}
reference = None
for actor in actors:
    source = root / f"{actor}_composition_0_0_stage50"
    meta = json.loads((source / "timeseries_metadata.json").read_text())
    row = meta["scenarios"][6]
    assert (row["index"], row["path_shape"], row["repeat"], row["requested_speed_m_s"]) == (6, "coherent_smooth", 0, 0.35)
    if reference is None:
        reference = row
        result["route_length_m"] = round(row["path_cumulative_m"][-1], 4)
        result["segment_m"] = row["height_segment_m"]
        result["height_schedule_m"] = row["height_schedule_m"]
        arc = np.asarray(row['path_cumulative_m'])
        segments = np.minimum(np.floor(arc / row['height_segment_m']).astype(int), len(row['height_schedule_m'])-1)
        result['boundaries_m'] = arc[np.flatnonzero(np.diff(segments))+1].tolist()
    else:
        assert np.allclose(row["path_xy"], reference["path_xy"])
        assert np.allclose(row["height_schedule_m"], reference["height_schedule_m"])
    metric = json.loads((source / "episode_metrics.json").read_text())[6]
    with np.load(source / "timeseries.npz") as data:
        count = metric["active_steps"]
        indices = np.flatnonzero(data["valid"][:count, 6])[::5]
        result["actors"][actor] = {
            "success": metric["task_success"],
            "points": [[round(float(data["progress_m"][i, 6]), 4), round(float(data["achieved_height_m"][i, 6]), 4)] for i in indices],
        }
output.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {output}")
