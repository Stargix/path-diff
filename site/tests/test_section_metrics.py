import importlib.util
import json
from pathlib import Path
import unittest

import numpy as np

SITE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('presentation_builder',SITE/'tools/build_presentation_evidence.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def interpolate(x,y,grid):
    return np.interp(grid,x,y,left=np.nan,right=np.nan)


class SectionMetricsTests(unittest.TestCase):
    def metrics(self,x,h):
        arc=np.linspace(0,4,401)
        changes=np.array([80,160,240,320])
        targets=np.array([.29,.17,.29,.17,.29])[np.minimum((np.arange(401)//80),4)]
        return builder.section_errors(x,h,arc,targets,changes,interpolate)

    def test_missed_crouch_stays_visible_in_both_sections(self):
        x=np.linspace(0,4,4001)
        rows=self.metrics(x,np.full_like(x,.29))
        for j in (1,3):self.assertAlmostEqual(rows[j]['mae_cm'],12.)
        for j in (0,2,4):self.assertAlmostEqual(rows[j]['mae_cm'],0.)
        self.assertTrue(all(r['coverage']==1 for r in rows))

    def test_missing_tail_is_not_zero_error(self):
        x=np.linspace(0,1.2,1201)
        rows=self.metrics(x,np.full_like(x,.29))
        self.assertLess(rows[1]['coverage'],1)
        self.assertIsNone(rows[2]['mae_cm'])
        self.assertEqual(rows[2]['coverage'],0)

    def test_export_denominators_and_source_arrivals(self):
        data=json.loads((SITE/'data/presentation-evidence.json').read_text())
        episodes=json.loads((SITE/'data/episodes.json').read_text())
        self.assertEqual(len(data['sections']),16*len(data['methods']))
        for m in data['methods']:
            for start in (0,1):
                rows=[r for r in data['sections'] if r['actor']==m['actor'] and r['start']==start]
                expected=[r for r in episodes if r['actor']==m['actor'] and r['suite']=='composition' and r['key'][5]==.35 and r['key'][2]==start and r['key'][3] in data['design']['base_families']]
                self.assertEqual(len(rows),8)
                # Terminal arrival and progress arrival must remain distinct.
                self.assertEqual(sum(r['route_arrived'] for r in rows),sum(r['route_arrived'] for r in expected))
                self.assertEqual(sum(r['arrived'] for r in rows),sum(r['arrived'] for r in expected))
                self.assertGreaterEqual(sum(r['arrived'] for r in rows),sum(r['success'] for r in expected))
                for r in rows:
                    self.assertEqual(len(r['sections']),5)
                    for s in r['sections']:
                        self.assertTrue(0<=s['coverage']<=1)
                        self.assertEqual(s['mae_cm'] is None,s['coverage']==0)


if __name__=='__main__':unittest.main()
