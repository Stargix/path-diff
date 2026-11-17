import hashlib
import json
from pathlib import Path
import unittest

SITE=Path(__file__).resolve().parents[1]


class ReportContentTests(unittest.TestCase):
    def test_current_report_assets_and_numbers(self):
        d=json.loads((SITE/'data/report.json').read_text(encoding='utf-8'))
        self.assertTrue(d['abstract'].startswith('Diffusion policies provide'))
        self.assertIn('hindsight relabeling',d['abstract'])
        self.assertEqual(len(d['training']),3)
        self.assertEqual(d['training'][2]['transition'],'99.9 ± 0.1')
        self.assertEqual(d['timing'][0]['adherence'],91.0)
        self.assertEqual(d['validation'][2]['stress_adherence'],61.5)
        for name,digest in d['provenance']['assets_sha256'].items():
            self.assertEqual(hashlib.sha256((SITE/name).read_bytes()).hexdigest(),digest,name)


if __name__=='__main__':
    unittest.main()
