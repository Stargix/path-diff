import hashlib
import json
from pathlib import Path
import unittest

SITE = Path(__file__).resolve().parents[1]


class GalleryTests(unittest.TestCase):
    def test_captures_match_files_and_share_route(self):
        gallery = json.loads((SITE / 'data/gallery.json').read_text(encoding='utf-8'))
        self.assertGreaterEqual(len(gallery['cases']), 7)
        self.assertTrue({'s-curve-rise', 'corner-posture', 'ood-s-curve', 'corner-moderate'} <= {c['id'] for c in gallery['cases']})
        for case in gallery['cases']:
            self.assertEqual({c['actor'] for c in case['clips']}, {'h42', 'wc42', 'gaussian_bc_42'})
            route_hashes = set()
            for clip in case['clips']:
                metadata = json.loads((SITE / clip['metadata']).read_text(encoding='utf-8'))
                metrics = json.loads((SITE / clip['metrics_file']).read_text(encoding='utf-8'))
                video = SITE / clip['video']
                self.assertTrue((SITE / clip['poster']).is_file())
                self.assertEqual(hashlib.sha256(video.read_bytes()).hexdigest(), clip['video_sha256'])
                self.assertEqual(metadata['scenario_id'], case['id'])
                self.assertEqual(metadata['actor_id'], clip['actor'])
                self.assertEqual(metrics['task_success'], clip['metrics']['task_success'])
                self.assertEqual(metadata['scenario_key']['path_shape'], case['family'])
                self.assertAlmostEqual(metadata['scenario_key']['requested_speed_m_s'], case['speed'])
                self.assertGreater(len(clip['frame_times_s']), 1)
                route_hashes.add(metadata['route_sha256'])
            self.assertEqual(len(route_hashes), 1, case['id'])


if __name__ == '__main__':
    unittest.main()
