"""Presentation and provenance checks for the archived native timing figures."""
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

SITE = Path(__file__).resolve().parents[1]


class TimingFigureTests(unittest.TestCase):
    def test_exact_archived_cases_and_margin(self):
        data = json.loads((SITE / 'data/timing-examples.json').read_text())
        self.assertFalse(data['new_rollouts'])
        self.assertFalse(data['selection_changed'])
        self.assertEqual(data['speed_smoothing_samples'], 5)
        self.assertEqual([c['scenario'] for c in data['curves']], [11, 111, 211, 61, 161, 261])
        self.assertEqual([c['scenario'] for c in data['geometry']], [993, 1468, 0, 556])
        for curve in data['curves']:
            self.assertEqual(len(curve['distance_m']), len(curve['speed_m_s']))
            self.assertEqual(len(curve['time_s']), len(curve['margin_s']))
            self.assertAlmostEqual(curve['time_s'][-1], curve['arrival_time_s'])
            for distance, time, margin in zip(curve['distance_m'], curve['time_s'], curve['margin_s']):
                self.assertAlmostEqual(margin, (distance - curve['active_origin_m']) / curve['requested_speed'] - time)
        for source in data['sources'] + data['selection_manifests']:
            self.assertEqual(len(source['sha256']), 64)
            self.assertNotIn('Users/', source['path'])

    def test_native_assets_and_citation(self):
        html = (SITE / 'index.html').read_text(encoding='utf-8')
        plots = list((SITE / 'assets/figures/timing').glob('*.svg'))
        self.assertEqual(len(plots), 8)
        for plot in plots:
            ET.parse(plot)
            self.assertIn(plot.relative_to(SITE).as_posix(), html)
        self.assertNotIn('report/speed_on_path.png', html)
        self.assertIn('id="abstract"', html)
        self.assertIn('id="citation"', html)
        self.assertIn('@misc{pathdiff2026', html)
        self.assertIn('https://arxiv.org/abs/2306.14874', html)
        self.assertIn('not a reproduction', html)

    def test_no_em_dash_in_site_text(self):
        for suffix in ['*.html', '*.js', '*.css', '*.md']:
            for path in SITE.rglob(suffix):
                if path == Path(__file__):
                    continue
                self.assertNotIn(chr(0x2014), path.read_text(encoding='utf-8'), str(path))

    def test_light_theme_changes_colours_not_geometry(self):
        for dark in (SITE / 'assets/figures/timing').glob('*.svg'):
            light = dark.parent / 'light' / dark.name
            self.assertTrue(light.is_file())
            dark_root, light_root = ET.parse(dark).getroot(), ET.parse(light).getroot()
            self.assertEqual(dark_root.attrib['viewBox'], light_root.attrib['viewBox'])
            paths = lambda root: [p.attrib.get('d') for p in root.iter('{http://www.w3.org/2000/svg}path')]
            self.assertEqual(paths(dark_root), paths(light_root))


if __name__ == '__main__':
    unittest.main()
