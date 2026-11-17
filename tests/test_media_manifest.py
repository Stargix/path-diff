import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from validate_media import validate


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class MediaManifestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "data").mkdir()
        (self.root / "assets").mkdir()
        (self.root / "data/scenarios.json").write_text(json.dumps({"scenarios": [{"id": "case-a"}]}))
        self.manifest = self.root / "data/media.json"

    def tearDown(self):
        self.tmp.cleanup()

    def save(self, clips):
        self.manifest.write_text(json.dumps({"schema_version": 1, "clips": clips}))

    def test_empty_gallery_is_valid_but_incomplete(self):
        self.save([])
        report = validate(self.manifest, self.root)
        self.assertEqual(report["ready_clips"], 0)
        self.assertFalse(report["complete"])

    def test_duplicate_model_scenario_pair_rejected(self):
        clip = {"scenario_id": "case-a", "actor_id": "h42", "status": "pending"}
        self.save([clip, clip])
        with self.assertRaisesRegex(ValueError, "duplicate"):
            validate(self.manifest, self.root)

    def test_ready_clip_must_be_fully_provenanced_and_hash_matched(self):
        (self.root / "assets/clip.mp4").write_bytes(b"mp4")
        (self.root / "assets/poster.jpg").write_bytes(b"jpg")
        (self.root / "assets/capture.json").write_text("{}")
        metrics = {"success": True, "adherence": True, "survived": True}
        (self.root / "assets/metrics.json").write_text(json.dumps(metrics))
        h = "a" * 64
        c = {"scenario_id": "case-a", "actor_id": "h42", "status": "ready", "capture_id": "c1",
             "video": "assets/clip.mp4", "poster": "assets/poster.jpg", "capture_metadata": "assets/capture.json",
             "metrics_file": "assets/metrics.json", "capture_metrics": metrics, "source_revision": "abc",
             "camera_preset": "fixed", "end_reason": "horizon", "checkpoint_sha256": h, "patch_sha256": h,
             "route_sha256": h, "video_sha256": sha(self.root / "assets/clip.mp4"),
             "poster_sha256": sha(self.root / "assets/poster.jpg"), "metrics_sha256": sha(self.root / "assets/metrics.json"),
             "evaluation_seed": 1, "training_seed": 42, "batch_size": 1, "scenario_index": 1,
             "control_hz": 50, "decision_hz": 12.5, "fps": 16.67, "frame_times_s": [0.02, 0.08]}
        self.save([c])
        self.assertEqual(validate(self.manifest, self.root)["ready_clips"], 1)
        c["video"] = "../../secret.mp4"
        self.save([c])
        with self.assertRaisesRegex(ValueError, "unsafe"):
            validate(self.manifest, self.root)


if __name__ == "__main__":
    unittest.main()
