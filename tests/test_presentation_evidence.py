import json
from pathlib import Path
import statistics
import unittest

SITE=Path(__file__).resolve().parents[1]
BASE={'procedural','coherent_smooth','rounded_waypoint','hard_waypoint'}


class PresentationEvidenceTests(unittest.TestCase):
    def test_primary_comparison_excludes_geometry_and_speed_stress(self):
        d=json.loads((SITE/'data/presentation-evidence.json').read_text())
        episodes=json.loads((SITE/'data/episodes.json').read_text())
        self.assertEqual(set(d['design']['base_families']),BASE)
        self.assertEqual(d['design']['core_speed_mps'],.25)
        self.assertEqual(d['design']['repeated_speed_mps'],.35)
        for m in d['methods']:
            core=[e for e in episodes if e['actor']==m['actor'] and e['suite']=='core' and e['key'][3] in BASE and e['key'][5]==.25]
            self.assertEqual(len(core),32)
            self.assertAlmostEqual(m['core_success_percent'],100*statistics.mean(e['success'] for e in core))
            self.assertAlmostEqual(m['core_cte_cm'],100*statistics.mean(e['total_cte_m'] for e in core))
            for start,label in ((0,'standing'),(1,'crouched')):
                rows=[e for e in episodes if e['actor']==m['actor'] and e['suite']=='composition' and e['key'][3] in BASE and e['key'][5]==.35 and e['key'][2]==start]
                self.assertEqual(len(rows),8)
                self.assertAlmostEqual(m[f'repeated_{label}_height_mae_cm'],100*statistics.mean(e['full_active_height_mae_m'] for e in rows))

    def test_single_range_and_full_repeated_order(self):
        d=json.loads((SITE/'data/presentation-evidence.json').read_text())
        self.assertEqual(d['single']['grid_m'][0],-.6)
        self.assertEqual(d['single']['grid_m'][-1],.6)
        self.assertEqual(d['repeated']['grid_m'][0],0)
        self.assertEqual(d['repeated']['grid_m'][-1],4)
        self.assertEqual(len(d['single']['groups']),2*len(d['methods']))
        self.assertEqual(len(d['repeated']['groups']),2*len(d['methods']))
        for group in d['repeated']['groups']:
            values=group['reference_height_m'];grid=d['repeated']['grid_m']
            for pos,target in zip((.4,1.2,2.,2.8,3.6),(.2932,.1705,.2932,.1705,.2932)):
                if group['start']==1:target=.1705 if target==.2932 else .2932
                self.assertAlmostEqual(values[grid.index(pos)],target,places=5)
            for n,v in zip(group['n'],group['mean_height_m']):
                self.assertEqual(v is None,n==0)
                self.assertLessEqual(n,8)


if __name__=='__main__':unittest.main()
