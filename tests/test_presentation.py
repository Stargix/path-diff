from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

SITE=Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
        self.scripts=[]
        self.tags=[]
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        self.tags.append(tag)
        if 'id' in values:self.ids.add(values['id'])
        if tag=='script':self.scripts.append(values.get('src'))


class PresentationTests(unittest.TestCase):
    def test_page_is_not_the_diagnostic_dashboard(self):
        page=Page();page.feed((SITE/'index.html').read_text(encoding='utf-8'))
        self.assertEqual([src.split('?')[0] for src in page.scripts],['evidence.js','app.js','research.js'])
        self.assertTrue({'abstract','method','training-table','timing-table','system-results','single-response','repeated-response'}<=page.ids)
        self.assertNotIn('validation-table',page.ids)
        self.assertNotIn('posture-reference',page.ids)
        self.assertNotIn('select',page.tags)
        self.assertNotIn('input',page.tags)
        self.assertNotIn('details',page.tags)
        self.assertNotIn('summary',page.tags)
        html=(SITE/'index.html').read_text(encoding='utf-8')
        self.assertLess(html.index('id="method"'),html.index('id="compare"'))
        self.assertLess(html.index('id="compare"'),html.index('id="results"'))
        self.assertLess(html.index('id="results"'),html.index('id="transitions"'))
        heading=re.search(r'<h1>(.*?)</h1>',html,re.S).group(1)
        self.assertEqual(' '.join(re.sub(r'<[^>]+>',' ',heading).split()),'Path-Conditioned Diffusion Policies for Quadruped Locomotion')
        self.assertIn('src="assets/media/teaser_recreated_short.mp4" autoplay muted loop playsinline',html)
        self.assertTrue((SITE/'assets/media/teaser_recreated_short.mp4').is_file())
        self.assertNotIn(' download',html)
        code=(SITE/'app.js').read_text(encoding='utf-8')
        selectors=re.findall(r"\$\(['\"]#([\w-]+)['\"]\)",code)
        self.assertTrue(set(selectors)<=page.ids,set(selectors)-page.ids)
        self.assertIn('IntersectionObserver',code)
        self.assertIn('v.muted=true',code)

    def test_landscape_comparison_does_not_collapse_into_large_single_column(self):
        css=(SITE/'styles.css').read_text(encoding='utf-8')
        video_rule=re.search(r'\.videos\{([^}]+)\}',css).group(1)
        self.assertIn('repeat(3,minmax(0,1fr))',video_rule)
        self.assertNotRegex(css,r'\.videos\{[^}]*grid-template-columns:1fr')
        rule=re.search(r'\.video-card video\{([^}]+)\}',css).group(1)
        self.assertIn('height:auto',rule)
        self.assertIn('aspect-ratio:16/9',rule)
        self.assertIn('.video-grid-wrap{overflow-x:auto',css)
        self.assertIn('tbody th[scope=row]{position:sticky;left:0',css)


if __name__=='__main__':
    unittest.main()
