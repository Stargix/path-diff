import importlib.util
import json
from pathlib import Path
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('publication',ROOT/'tools/export_publication_evidence.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


def interpolate(p,h,g):
    return np.interp(g,p,h,left=np.nan,right=np.nan)


class PublicationTests(unittest.TestCase):
    def test_missed_middle_posture_fails(self):
        p=np.linspace(0,4,401);h=np.full_like(p,.2932)
        s=module.section_metrics(p,h,[0,1,2,4],[.2932,.1705,.2932],interpolate)
        self.assertFalse(s[1]['conforms']);self.assertTrue(s[0]['conforms'])

    def test_missing_tail_not_imputed(self):
        p=np.linspace(0,1,101)
        s=module.section_metrics(p,np.full_like(p,.17),[0,4],[.17],interpolate)
        self.assertFalse(s[0]['conforms']);self.assertLess(s[0]['coverage'],1)

    def test_terminal_tolerance(self):
        p=np.linspace(0,3.86,387)
        self.assertTrue(module.section_metrics(p,np.full_like(p,.17),[0,4],[.17],interpolate)[0]['conforms'])

    def test_first_unobserved_progress_bin_not_failed_posture(self):
        p=np.linspace(.04,3.86,383)
        self.assertTrue(module.section_metrics(p,np.full_like(p,.17),[0,4],[.17],interpolate)[0]['conforms'])

    def test_unobserved_middle_section_still_fails(self):
        p=np.linspace(.04,.8,77)
        result=module.section_metrics(p,np.full_like(p,.17),[0,1,2,4],[.17,.29,.17],interpolate)
        self.assertFalse(result[1]['conforms'])

    def test_export_has_all_denominators_and_no_new_seeds(self):
        d=json.loads((ROOT/'data/publication-evidence.json').read_text())
        self.assertEqual(len(d['episodes']),48*len(d['actors']))
        for r in d['rows']:
            self.assertLessEqual(r['eligible_events'],r['planned_events'])
            self.assertLessEqual(r['arrivals'],r['n'])
        self.assertIn('exploratory',d['status'])

if __name__=='__main__':unittest.main()
