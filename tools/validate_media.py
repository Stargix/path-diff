#!/usr/bin/env python3
"""Validate paired RGB capture metadata before it is exposed by the site."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HASH = re.compile(r"^[a-f0-9]{64}$", re.I)
ACTORS = {"h42", "wc42", "gaussian_bc_42"}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def asset(root: Path, rel: str, field: str) -> Path:
    if not isinstance(rel, str) or not rel or "\\" in rel:
        raise ValueError(f"{field}: expected a repository-relative path")
    candidate = Path(rel)
    if candidate.is_absolute() or any(part in {"", ".", ".."} for part in candidate.parts):
        raise ValueError(f"{field}: unsafe path {rel!r}")
    path = (root / candidate).resolve()
    if root.resolve() not in path.parents or not path.is_file():
        raise ValueError(f"{field}: missing file or path outside the site: {rel}")
    return path


def validate(manifest_path: Path, site_root: Path, require_complete: bool = False) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    scenarios = json.loads((site_root / "data/scenarios.json").read_text(encoding="utf-8"))["scenarios"]
    scenario_ids = {s["id"] for s in scenarios}
    if manifest.get("schema_version") != 1 or not isinstance(manifest.get("clips"), list):
        raise ValueError("unsupported media manifest schema")
    seen: set[tuple[str, str]] = set()
    capture_ids: set[str] = set()
    ready = 0
    for clip in manifest["clips"]:
        pair = (clip.get("scenario_id"), clip.get("actor_id"))
        if pair[0] not in scenario_ids or pair[1] not in ACTORS:
            raise ValueError(f"unknown scenario/model pair: {pair}")
        if pair in seen:
            raise ValueError(f"duplicate scenario/model pair: {pair}")
        seen.add(pair)
        if clip.get("status") not in {"pending", "unavailable", "ready"}:
            raise ValueError(f"invalid status for {pair}: {clip.get('status')!r}")
        if clip["status"] != "ready":
            continue
        ready += 1
        for field in ("video", "poster", "capture_metadata", "metrics_file"):
            asset(site_root, clip.get(field), field)
        for field in ("capture_id", "source_revision", "camera_preset", "end_reason"):
            if not isinstance(clip.get(field), str) or not clip[field]:
                raise ValueError(f"missing {field} for {pair}")
        if clip["capture_id"] in capture_ids:
            raise ValueError(f"duplicate capture_id: {clip['capture_id']}")
        capture_ids.add(clip["capture_id"])
        for field in ("checkpoint_sha256", "patch_sha256", "route_sha256", "video_sha256", "metrics_sha256"):
            if not isinstance(clip.get(field), str) or not HASH.fullmatch(clip[field]):
                raise ValueError(f"invalid {field} for {pair}")
        for field in ("evaluation_seed", "training_seed", "batch_size", "scenario_index", "control_hz", "decision_hz", "fps"):
            if not isinstance(clip.get(field), (int, float)) or clip[field] <= 0:
                raise ValueError(f"invalid {field} for {pair}")
        times = clip.get("frame_times_s")
        if not isinstance(times, list) or len(times) < 2 or any(
            not isinstance(t, (int, float)) or (i and t <= times[i - 1])
            for i, t in enumerate(times)
        ):
            raise ValueError(f"invalid frame_times_s for {pair}")
        metrics = clip.get("capture_metrics")
        if not isinstance(metrics, dict) or any(type(metrics.get(k)) is not bool for k in ("success", "adherence", "survived")):
            raise ValueError(f"missing capture-specific outcomes for {pair}")
        video_path = asset(site_root, clip["video"], "video")
        poster_path = asset(site_root, clip["poster"], "poster")
        metrics_path = asset(site_root, clip["metrics_file"], "metrics_file")
        asset(site_root, clip["capture_metadata"], "capture_metadata")
        if digest(video_path) != clip["video_sha256"]:
            raise ValueError(f"video SHA-256 mismatch for {pair}")
        if digest(poster_path) != clip.get("poster_sha256"):
            raise ValueError(f"poster SHA-256 mismatch for {pair}")
        if digest(metrics_path) != clip["metrics_sha256"]:
            raise ValueError(f"metrics SHA-256 mismatch for {pair}")
        disk_metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        if disk_metrics != metrics:
            raise ValueError(f"capture metrics differ from sidecar for {pair}")
    expected = len(scenario_ids) * len(ACTORS)
    if len(seen) > expected:
        raise ValueError(f"too many entries: {len(seen)} > {expected}")
    if require_complete and (ready != expected or len(seen) != expected):
        raise ValueError(f"complete gallery requires {expected} ready clips; found {ready} ready / {len(seen)} entries")
    return {"status": "passed", "scenarios": len(scenario_ids), "models": len(ACTORS), "expected_slots": expected,
            "manifest_entries": len(seen), "ready_clips": ready, "complete": ready == expected and len(seen) == expected}


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest", type=Path, default=ROOT / "data/media.json")
    p.add_argument("--site-root", type=Path, default=ROOT)
    p.add_argument("--require-complete", action="store_true")
    args = p.parse_args()
    try:
        result = validate(args.manifest.resolve(), args.site_root.resolve(), args.require_complete)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
