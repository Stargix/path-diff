import json
from pathlib import Path
import unittest

SITE=Path(__file__).resolve().parents[1]


class AuditExportTests(unittest.TestCase):
    def test_all_seeds_conditions_and_denominators_are_retained(self):
        report=json.loads((SITE/'data/transition-audit.json').read_text(encoding='utf-8'))
        episodes=json.loads((SITE/'data/episodes.json').read_text(encoding='utf-8'))
        actors={e['actor'] for e in episodes}
        self.assertEqual(report['source_bundle_count'],12*len(actors))
        self.assertEqual(report['episode_count'],len(episodes))
        planned=sum(4 if e['suite']=='composition' else bool(e['key'][7]) for e in episodes)
        self.assertEqual(report['planned_transition_count'],planned)
        self.assertEqual({g['actor'] for g in report['groups']},actors)
        for g in report['groups']:
            rows=[e for e in episodes if e['actor']==g['actor'] and e['suite']==g['suite'] and e['key'][5]==g['speed'] and (g['start'] is None or e['key'][2]==g['start']) and (g['suite']!='core' or e['key'][7])]
            self.assertEqual(len(rows),g['episodes'])
            self.assertEqual(sum(e['success'] for e in rows),g['sensitivity_success']['0.25'])
            self.assertEqual(sum(e['survived'] for e in rows),g['survived'])
            self.assertLessEqual(g['completed'],g['target_held'])
            self.assertLessEqual(g['target_held'],g['reached'])
            self.assertLessEqual(g['reached'],g['planned'])
            self.assertEqual(len(g['aligned_n']),len(report['protocol']['alignment_grid_m']))
            self.assertTrue(all(n<=g['planned'] for n in g['aligned_n']))

    def test_example_records_actual_not_idealized_boundaries(self):
        example=json.loads((SITE/'data/transition-example.json').read_text(encoding='utf-8'))
        self.assertEqual(len(example['boundaries_m']),4)
        self.assertGreater(example['boundaries_m'][0],.8)


if __name__=='__main__':
    unittest.main()
